// lib/upkeep.js — two small jobs that would otherwise need a scheduler. They
// run on the back of normal traffic (requireAuth), at most once every 5
// minutes per server, and are safe to run any number of times:
//   1. a batch is for one year: once it is over, the subscription becomes
//      "expired" (every "active" check then treats the student as free) and the
//      student gets a bell pointing to /subscribe;
//   2. an announcement scheduled for later sends its bells once it has started.
const { Prisma } = require('@prisma/client');
const prisma = require('./prisma');
const { notifyMany } = require('./notify');
const { running, announceOnce } = require('./announce');
const { BATCH_DAYS } = require('./publicUser');

const EVERY_MS = 5 * 60 * 1000;
let last = 0;

async function expireBatches() {
  // Columns are timestamp(3) without time zone, in UTC
  const rows = await prisma.$queryRaw`
    UPDATE "Subscription"
    SET "status" = 'expired', "updatedAt" = (now() AT TIME ZONE 'UTC')
    WHERE "status" = 'active' AND "activatedAt" < (now() AT TIME ZONE 'UTC') - ${Prisma.raw(`interval '${BATCH_DAYS} days'`)}
    RETURNING "userId"`;
  await notifyMany(rows.map((r) => r.userId), { type: 'purchase', text: 'Your batch’s year is over. Renew it to keep taking its tests.', view: '/subscribe' });
}

async function announceStarted() {
  const due = await prisma.announcement.findMany({ where: { ...running(), notifiedAt: null }, select: { id: true, body: true, audience: true } });
  for (const a of due) await announceOnce(a);
}

// Resolves at once when it isn't due; otherwise runs both jobs (one request
// per server pays for it every 5 minutes). Never throws.
async function upkeep() {
  if (Date.now() - last < EVERY_MS) return;
  last = Date.now();
  try {
    await expireBatches();
    await announceStarted();
  } catch (error) {
    console.error('upkeep:', error.message);
  }
}

module.exports = { upkeep };
