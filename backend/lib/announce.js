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

// Reverse of audiencesFor: the active students an announcement with this
// audience reaches — used to fan out a personal notification when it goes
// live, so the bell gets an Updates row instead of just +1 on the count.
const announcementAudienceIds = async (audience) => {
  const base = { role: 'student', isActive: true };
  const where =
    audience === 'paid'
      ? { ...base, subscription: { status: 'active' } }
      : audience && audience.startsWith('exam:')
        ? { ...base, exam: audience.slice('exam:'.length) }
        : base; // "all" and "students" reach every signed-in student
  const rows = await prisma.user.findMany({ where, select: { id: true } });
  return rows.map((u) => u.id);
};

module.exports = { running, audiencesFor, viewer, announcementAudienceIds };
