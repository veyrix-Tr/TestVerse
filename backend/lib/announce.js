// lib/announce.js — who may see an announcement, as a Prisma `where`.
// audience on the row: "all" | "students" | "paid" | "exam:neet" | ...
const prisma = require('./prisma');

// Currently running: switched on, started, and not yet past its end.
const running = (now = new Date()) => ({
  isActive: true,
  startsAt: { lte: now },
  OR: [{ endsAt: null }, { endsAt: { gte: now } }],
});

// What a signed-in user is allowed to see, given their exam and batch status.
// `null` = nobody is signed in, so only "all" applies.
const audiencesFor = (user) => {
  const allowed = ['all'];
  if (!user) return allowed;
  allowed.push('students');
  if (user.paid) allowed.push('paid');
  if (user.exam) allowed.push('exam:' + user.exam);
  return allowed;
};

// The signed-in account's exam + whether its batch is active (one small query).
const viewer = async (userId) => {
  const u = await prisma.user.findUnique({
    where:  { id: userId },
    select: { exam: true, subscription: { select: { status: true } } },
  });
  if (!u) return null;
  return { exam: u.exam, paid: !!(u.subscription && u.subscription.status === 'active') };
};

module.exports = { running, audiencesFor, viewer };
