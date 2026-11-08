// scripts/createAdmin.js
// Creates an admin account, or turns an existing account into an admin and
// sets its password. Credentials come from the environment, never the code:
//
//   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='…' npm run create-admin
//   (optional ADMIN_NAME, default "Testverse admin")
//
// Uses DATABASE_URL from .env, so it writes to whichever database that points at.

require('dotenv').config();
const bcrypt = require('bcrypt');
const prisma = require('../lib/prisma');

const MIN_PASSWORD = 8; // same rule as student passwords

async function main() {
  const email    = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || '');
  const name     = String(process.env.ADMIN_NAME || 'Testverse admin').trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Set ADMIN_EMAIL to a valid email address.');
  if (password.length < MIN_PASSWORD) throw new Error(`ADMIN_PASSWORD must be at least ${MIN_PASSWORD} characters.`);

  const hash     = await bcrypt.hash(password, 10);
  const existing = await prisma.user.findUnique({ where: { email } });

  const user = await prisma.user.upsert({
    where:  { email },
    update: { role: 'admin', password: hash, isActive: true, emailVerifiedAt: existing?.emailVerifiedAt || new Date() },
    create: { email, name, password: hash, role: 'admin', emailVerifiedAt: new Date() },
  });

  console.log(`${existing ? 'Updated' : 'Created'} admin ${user.email} (id ${user.id}).`);
}

main()
  .catch((e) => {
    console.error(e.message || e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
