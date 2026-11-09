// scripts/createStudent.js
// Creates a ready-to-use student (or updates one with this email) and gives
// them an ACTIVE batch for their exam + class, as if they had paid. Handy for
// demo and test accounts. Credentials come from the environment, never the code:
//
//   STUDENT_EMAIL=test@example.com STUDENT_PASSWORD='…' npm run create-student
//
// Optional: STUDENT_NAME ("Test Student"), STUDENT_EXAM (neet | jee-main | jee-advanced, default jee-main),
// STUDENT_GRADE ("Class 11" | "Class 12" | "Dropper / repeater", default "Class 12"),
// STUDENT_YEAR (default next year), STUDENT_PHONE, STUDENT_STATE, STUDENT_CITY,
// STUDENT_PAID=false to create them without a batch.
// Uses DATABASE_URL from .env, so it writes to whichever database that points at.

require('dotenv').config({ quiet: true });
const bcrypt = require('bcrypt');
const prisma = require('../lib/prisma');

const EXAMS  = ['neet', 'jee-main', 'jee-advanced'];
const GRADES = ['Class 11', 'Class 12', 'Dropper / repeater'];
const MIN_PASSWORD = 8;

async function main() {
  const env      = process.env;
  const email    = String(env.STUDENT_EMAIL || '').trim().toLowerCase();
  const password = String(env.STUDENT_PASSWORD || '');
  const exam     = env.STUDENT_EXAM || 'jee-main';
  const grade    = env.STUDENT_GRADE || 'Class 12';
  const paid     = env.STUDENT_PAID !== 'false';

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Set STUDENT_EMAIL to a valid email address.');
  if (password.length < MIN_PASSWORD) throw new Error(`STUDENT_PASSWORD must be at least ${MIN_PASSWORD} characters.`);
  if (!EXAMS.includes(exam)) throw new Error(`STUDENT_EXAM must be one of ${EXAMS.join(', ')}.`);
  if (!GRADES.includes(grade)) throw new Error(`STUDENT_GRADE must be one of ${GRADES.join(', ')}.`);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.role !== 'student') throw new Error(`${email} is an ${existing.role} account; not changing it.`);

  const profile = {
    name:       String(env.STUDENT_NAME || 'Test Student').trim(),
    exam,
    grade,
    targetYear: Number(env.STUDENT_YEAR) || new Date().getFullYear() + 1,
    phone:      String(env.STUDENT_PHONE || '9999999999'),
    state:      String(env.STUDENT_STATE || 'Rajasthan'),
    city:       String(env.STUDENT_CITY || 'Kota'),
  };
  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where:  { email },
    update: { ...profile, password: hash, isActive: true, emailVerifiedAt: existing?.emailVerifiedAt || new Date() },
    create: { ...profile, email, password: hash, role: 'student', emailVerifiedAt: new Date() },
  });

  let note = 'no batch';
  if (paid) {
    // Same rule as the subscribe page: JEE Main / Advanced -> "jee"
    const family = exam === 'neet' ? 'neet' : 'jee';
    const batch = await prisma.batch.findFirst({ where: { exam: family, grade, isActive: true } });
    if (!batch) throw new Error(`No active batch for ${family} + ${grade}.`);
    const data = { batchId: batch.id, status: 'active', amount: batch.price, paymentRef: 'manual', activatedAt: new Date() };
    await prisma.subscription.upsert({ where: { userId: user.id }, update: data, create: { userId: user.id, ...data } });
    note = `active batch ${batch.name}`;
  }

  console.log(`${existing ? 'Updated' : 'Created'} student ${user.email} (${profile.name}, ${exam}, ${grade}) with ${note}.`);
}

main()
  .catch((e) => {
    console.error(e.message || e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
