const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { sendOtpEmail } = require('../services/emailService');
const { WITH_SUBSCRIPTION, publicUser } = require('../lib/publicUser');
const { notify, EXAM_LABEL } = require('../lib/notify');
const { examFamily } = require('../lib/access');
const { MIN_PASSWORD, emailRegex, normEmail, checkProfile, checkPassword, profileData } = require('../lib/profile');

const SIGNUP_TOKEN_TTL   = '30m'; // time to fill in details after verifying the email
const OTP_MINUTES        = 10;
const OTP_RESEND_SECONDS = 30; // matches the frontend's resend countdown
const OTP_MAX_ATTEMPTS   = 5;

const hashOtp     = (otp) => crypto.createHash('sha256').update(String(otp)).digest('hex');
const generateOtp = () => crypto.randomInt(100000, 1000000).toString();

const signToken = (user) =>
  jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

// Creates (or replaces) the OTP for this email + purpose and emails it.
// Returns { error, status } on failure, or {} on success.
const issueOtp = async (email, purpose) => {
  const existing = await prisma.otp.findUnique({ where: { email_purpose: { email, purpose } } });
  if (existing) {
    const wait = Math.ceil((existing.createdAt.getTime() + OTP_RESEND_SECONDS * 1000 - Date.now()) / 1000);
    if (wait > 0) return { status: 429, error: `Please wait ${wait}s before requesting another code.` };
  }

  const otp  = generateOtp();
  const data = { codeHash: hashOtp(otp), attempts: 0, createdAt: new Date(), expiresAt: new Date(Date.now() + OTP_MINUTES * 60 * 1000) };
  await prisma.otp.upsert({
    where:  { email_purpose: { email, purpose } },
    update: data,
    create: { email, purpose, ...data },
  });

  const sent = await sendOtpEmail(email, otp, purpose, OTP_MINUTES);
  if (!sent) {
    // Don't make the student wait out the cooldown for an email that never left
    await prisma.otp.deleteMany({ where: { email, purpose } });
    return { status: 502, error: 'Could not send the verification email. Please try again.' };
  }
  return {};
};

// Checks a code against the stored OTP. Wrong guesses count toward the limit;
// the record is consumed only when `consume` is true and the code matches.
// Returns an error message, or null when the code is valid.
const checkOtp = async (email, purpose, otp, { consume }) => {
  const record = await prisma.otp.findUnique({ where: { email_purpose: { email, purpose } } });
  if (!record) return 'No code found for this email. Please request a new one.';

  if (record.expiresAt < new Date()) {
    await prisma.otp.deleteMany({ where: { email, purpose } });
    return 'This code has expired. Please request a new one.';
  }

  const a = Buffer.from(record.codeHash, 'hex');
  const b = Buffer.from(hashOtp(otp), 'hex');
  if (!crypto.timingSafeEqual(a, b)) {
    if (record.attempts + 1 >= OTP_MAX_ATTEMPTS) {
      await prisma.otp.deleteMany({ where: { email, purpose } });
      return 'Too many incorrect attempts. Please request a new code.';
    }
    await prisma.otp.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
    return 'Incorrect code.';
  }

  if (consume) await prisma.otp.deleteMany({ where: { email, purpose } });
  return null;
};

// POST /api/auth/signup/send-otp
// Body: { email } — emails a sign-up code if no account uses this email yet
const sendSignupOtp = async (req, res) => {
  try {
    const email = normEmail(req.body.email);
    if (!emailRegex.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'An account with this email already exists. Log in instead.' });

    const result = await issueOtp(email, 'signup');
    if (result.error) return res.status(result.status).json({ error: result.error });

    res.json({ message: 'Verification code sent to your email' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

// POST /api/auth/signup/verify-otp
// Body: { email, otp } — confirms the emailed code and returns a short-lived
// signupToken proving this email was verified. The details step sends it back.
const verifySignupOtp = async (req, res) => {
  try {
    const email = normEmail(req.body.email);
    const { otp } = req.body;
    if (!emailRegex.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
    if (!/^\d{6}$/.test(String(otp || ''))) return res.status(400).json({ error: 'Enter the 6-digit code we emailed you.' });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'An account with this email already exists. Log in instead.' });

    const otpError = await checkOtp(email, 'signup', otp, { consume: true });
    if (otpError) return res.status(400).json({ error: otpError });

    const signupToken = jwt.sign({ email, purpose: 'signup' }, process.env.JWT_SECRET, { expiresIn: SIGNUP_TOKEN_TTL });
    res.json({ message: 'Email verified', signupToken });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

// Returns the verified email inside a signupToken, or null if it's invalid/expired.
const signupEmail = (token) => {
  try {
    const payload = jwt.verify(String(token || ''), process.env.JWT_SECRET);
    return payload.purpose === 'signup' && payload.email ? payload.email : null;
  } catch {
    return null;
  }
};

// Returns { field, error } for the first invalid detail, or null.
const checkDetails = (b) => checkProfile(b) || checkPassword(b.password);

// POST /api/auth/signup
// Body: { signupToken, name, phone, exam, grade, targetYear, state, city, password }
// Creates the account for the email verified in /signup/verify-otp, so no
// unverified account ever exists
const signup = async (req, res) => {
  try {
    const email = signupEmail(req.body.signupToken);
    if (!email) return res.status(401).json({ field: 'email', error: 'Your email verification has expired. Please verify your email again.' });

    const bad = checkDetails(req.body);
    if (bad) return res.status(400).json(bad);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ field: 'email', error: 'An account with this email already exists. Log in instead.' });

    const b = req.body;
    const user = await prisma.user.create({
      data: {
        ...profileData(b),
        email,
        password:        await bcrypt.hash(String(b.password), 10),
        emailVerifiedAt: new Date(),
        lastLoginAt:     new Date(),
      },
      include: WITH_SUBSCRIPTION,
    });

    // The admin's bell: someone just joined.
    // Awaited (they never throw): a Vercel function can stop once it has answered.
    await notify({ type: 'signup', text: 'New signup: ' + user.name + (EXAM_LABEL[user.exam] ? ' · ' + EXAM_LABEL[user.exam] : ''), view: 'students' });
    // The student's bell: a first hello pointing at where to start.
    await notify({
      type:   'welcome',
      text:   'Welcome to Testverse' + (EXAM_LABEL[user.exam] ? ', ' + user.name.split(' ')[0] + ' — your ' + EXAM_LABEL[user.exam] + ' tests are ready.' : '! Your tests are ready.'),
      view:   '/student',
      userId: user.id,
    });

    res.status(201).json({ message: 'Account created successfully', token: signToken(user), user: publicUser(user) });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ field: 'email', error: 'An account with this email already exists. Log in instead.' });
    }
    console.error(error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// POST /api/auth/login
// Body: { email, password }
const login = async (req, res) => {
  try {
    const email    = normEmail(req.body.email);
    const password = req.body.password;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

    const user = await prisma.user.findUnique({ where: { email }, include: WITH_SUBSCRIPTION });
    if (!user || !(await bcrypt.compare(String(password), user.password))) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }
    if (!user.isActive) {
      return res.status(403).json({ error: 'Your account has been deactivated. Please contact support.' });
    }

    // Best effort — never able to fail an actual login
    prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }).catch(() => {});

    res.json({ message: 'Login successful', token: signToken(user), user: publicUser(user) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
};

// GET /api/auth/me — the signed-in user, used to confirm a stored token is still good
const me = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, include: WITH_SUBSCRIPTION });
    if (!user || !user.isActive) return res.status(401).json({ error: 'Invalid token' });
    res.json({ user: publicUser(user) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

// PUT /api/auth/me — Body: { name, phone, exam, grade, targetYear, state, city }
// A student edits their own details. The email stays: it is how they log in.
// With an active batch, exam and class stay with the batch it was given for.
const updateMe = async (req, res) => {
  try {
    const bad = checkProfile(req.body);
    if (bad) return res.status(400).json(bad);
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, include: WITH_SUBSCRIPTION });
    if (!user || !user.isActive) return res.status(401).json({ error: 'Invalid token' });
    const sub = user.subscription;
    if (sub && sub.status === 'active') {
      const fixed = `Your batch is ${sub.batch.name}, so this stays as it is. Contact us to change it.`;
      if (examFamily(req.body.exam) !== sub.batch.exam) return res.status(400).json({ field: 'exam', error: fixed });
      if (req.body.grade !== sub.batch.grade) return res.status(400).json({ field: 'grade', error: fixed });
    }
    const updated = await prisma.user.update({ where: { id: user.id }, data: profileData(req.body), include: WITH_SUBSCRIPTION });
    res.json({ message: 'Profile saved', user: publicUser(updated) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not save your profile' });
  }
};

// PUT /api/auth/password — Body: { currentPassword, newPassword }
const changePassword = async (req, res) => {
  try {
    const bad = checkPassword(req.body.newPassword, 'newPassword');
    if (bad) return res.status(400).json(bad);
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { id: true, password: true, isActive: true } });
    if (!user || !user.isActive) return res.status(401).json({ error: 'Invalid token' });
    if (!(await bcrypt.compare(String(req.body.currentPassword || ''), user.password))) {
      return res.status(400).json({ field: 'currentPassword', error: 'Your current password is not right.' });
    }
    await prisma.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(String(req.body.newPassword), 10) } });
    res.json({ message: 'Password changed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not change your password' });
  }
};

// POST /api/auth/forgot-password
// Body: { email }
const forgotPassword = async (req, res) => {
  try {
    const email = normEmail(req.body.email);
    if (!emailRegex.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'No account is registered with this email.' });

    const result = await issueOtp(email, 'reset');
    if (result.error) return res.status(result.status).json({ error: result.error });

    res.json({ message: 'Reset code sent to your email' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

// POST /api/auth/verify-otp
// Body: { email, otp } — checks the reset code WITHOUT consuming it, so the UI
// can reveal the new-password fields only after the correct code is entered.
// resetPassword still re-validates and consumes it.
const verifyResetOtp = async (req, res) => {
  try {
    const email = normEmail(req.body.email);
    const { otp } = req.body;
    if (!email || !/^\d{6}$/.test(String(otp || ''))) return res.status(400).json({ error: 'Enter the 6-digit code we emailed you.' });

    const otpError = await checkOtp(email, 'reset', otp, { consume: false });
    if (otpError) return res.status(400).json({ error: otpError });

    res.json({ message: 'Code verified' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

// POST /api/auth/reset-password
// Body: { email, otp, password } — sets the new password and signs the user in
const resetPassword = async (req, res) => {
  try {
    const email = normEmail(req.body.email);
    const { otp, password } = req.body;
    if (!email || !otp || !password) return res.status(400).json({ error: 'Email, code and new password are required.' });
    if (String(password).length < MIN_PASSWORD) {
      return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD} characters long.` });
    }

    const otpError = await checkOtp(email, 'reset', otp, { consume: true });
    if (otpError) return res.status(400).json({ error: otpError });

    const user = await prisma.user.update({
      where: { email },
      data:  { password: await bcrypt.hash(String(password), 10), lastLoginAt: new Date() },
      include: WITH_SUBSCRIPTION,
    });

    res.json({ message: 'Password reset successfully', token: signToken(user), user: publicUser(user) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

module.exports = { sendSignupOtp, verifySignupOtp, signup, login, me, updateMe, changePassword, forgotPassword, verifyResetOtp, resetPassword };
