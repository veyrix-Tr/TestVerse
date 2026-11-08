# Testverse backend

Express + Prisma (PostgreSQL) API for Testverse accounts. Same stack as the
Studyverse backend: bcrypt passwords, 7-day JWTs, and email OTPs sent through
Brevo.

## Setup

```bash
cp .env.example .env        # fill in DATABASE_URL, JWT_SECRET, BREVO_*
npm install
npx prisma migrate deploy   # or `npm run db:migrate` while changing the schema
npm run dev                 # http://localhost:5000
```

Generate a JWT secret with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

Without `BREVO_API_KEY` (and `NODE_ENV` not `production`) OTPs are printed to
the server console, so sign-up and password reset work locally without email.

The frontend dev server proxies `/api` here; in production set `VITE_API_URL`
in the frontend to this backend's URL and `FRONTEND_URL` here for CORS.

## Auth API — `/api/auth`

| Method | Path | Body | Result |
| --- | --- | --- | --- |
| POST | `/signup/send-otp` | `{ email }` | Emails a 6-digit code (409 if the email is taken) |
| POST | `/signup/verify-otp` | `{ email, otp }` | Uses up the code → `{ signupToken }` (valid 30 min) |
| POST | `/signup` | `{ signupToken, name, phone, exam, grade, targetYear, state, city, password }` | Creates the account for the verified email → `{ token, user }` |
| POST | `/login` | `{ email, password }` | `{ token, user }` |
| GET | `/me` | — (Bearer token) | `{ user }` |
| POST | `/forgot-password` | `{ email }` | Emails a reset code |
| POST | `/verify-otp` | `{ email, otp }` | Checks the reset code without using it up |
| POST | `/reset-password` | `{ email, otp, password }` | Sets the password → `{ token, user }` |

`exam` is one of `neet`, `jee-main`, `jee-advanced`; `grade` is `Class 11`,
`Class 12` or `Dropper / repeater`; `phone` is a 10-digit Indian mobile;
`targetYear` is this year to 3 years ahead. Passwords need 8+ characters.
Validation errors include a `field` key naming the input to highlight.

OTP rules: codes last 10 minutes, a new one can be requested every 30 seconds,
only a SHA-256 hash is stored, and 5 wrong guesses discard the code.
Protect other routes with `requireAuth` from `middleware/auth.js`.

Every `user` in these responses carries `subscription`: `null`, or
`{ status: "pending" | "active", batch: { id, name, exam, grade, price }, activatedAt }`.

## Batches & subscription — `/api`

A batch is one exam + class (e.g. `11th JEE`); the six batches are seeded by the
`add_batches_subscriptions` migration. A student buys **one** batch, once, and it is
always the batch matching the exam and class they gave at sign-up
(`jee-main`/`jee-advanced` → `jee`).

| Method | Path | Body | Result |
| --- | --- | --- | --- |
| GET | `/batches` | — (public) | `{ batches }` on sale, in display order |
| GET | `/subscription` | — (Bearer token) | `{ subscription, batch }`: the purchase (or null) and the batch the student's exam + class put them in (or null) |
| POST | `/subscription` | — (Bearer token) | Starts the purchase of that batch. 409 if the student already has an active batch |

Payments aren't wired in yet. With `MOCK_PAYMENTS=true` (outside production)
the purchase is activated at once (201). Otherwise it stays `pending` and the
call returns 503 "Online payment isn't available yet"; Cashfree will replace
that branch in `controllers/subscriptionController.js`.
