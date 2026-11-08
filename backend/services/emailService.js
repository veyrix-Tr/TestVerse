const axios = require('axios');

const COPY = {
  signup: {
    subject: 'Your Testverse verification code',
    title:   'Verify your email',
    body:    'Use the code below to finish creating your Testverse account.',
    footer:  "If you didn't try to sign up, you can ignore this email.",
  },
  reset: {
    subject: 'Your Testverse password reset code',
    title:   'Reset your password',
    body:    'Use the code below to set a new password for your Testverse account.',
    footer:  "If you didn't request this, you can safely ignore this email — your password won't change.",
  },
};

// Sends a 6-digit OTP to the given email via the Brevo transactional email API.
// Returns true when the email was accepted by Brevo.
const sendOtpEmail = async (toEmail, otp, purpose, minutes) => {
  const copy = COPY[purpose];

  // Local dev without Brevo keys: print the code so sign-up can still be tested.
  if (!process.env.BREVO_API_KEY && process.env.NODE_ENV !== 'production') {
    console.log(`[dev] ${purpose} OTP for ${toEmail}: ${otp}`);
    return true;
  }

  try {
    await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: {
          name:  process.env.BREVO_SENDER_NAME || 'Testverse',
          email: process.env.BREVO_SENDER_EMAIL,
        },
        to: [{ email: toEmail }],
        subject: copy.subject,
        htmlContent: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
          <h2 style="color:#0F1F3D;margin-bottom:8px;">${copy.title}</h2>
          <p style="color:#4A5568;margin-bottom:24px;">${copy.body} It expires in ${minutes} minutes.</p>
          <div style="background:#EEF3FF;border-radius:10px;padding:24px;text-align:center;margin-bottom:24px;">
            <span style="font-size:36px;font-weight:700;letter-spacing:0.3em;color:#0F1F3D;">${otp}</span>
          </div>
          <p style="color:#8896B3;font-size:13px;">${copy.footer}</p>
          <p style="color:#8896B3;font-size:13px;">— Testverse by Studyverse</p>
        </div>`,
      },
      {
        headers: {
          'api-key':      process.env.BREVO_API_KEY,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    console.log(`OTP sent to ${toEmail} (${purpose})`);
    return true;
  } catch (error) {
    console.error('Email send failed:', error.response?.data || error.message);
    return false;
  }
};

module.exports = { sendOtpEmail };
