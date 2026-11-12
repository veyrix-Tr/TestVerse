// lib/access.js
// Who may see and take a published test that isn't part of a test series.
// A student can when ANY of these hold:
//   - it's a free test for their exam (or for any exam): no batch needed
//   - the test is for everyone (audience "all"), it's for their exam (or any
//     exam), and they have an ACTIVE batch
//   - their ACTIVE batch is one the test is given to
//   - they're in a group the test is given to
//   - the test is given to them directly
//   - they've already started it (so a later change never hides their result)
// Use it as a Prisma `where` so the database does the filtering.

const prisma = require('./prisma');

// The student's exam key ("neet" | "jee-main" | "jee-advanced") -> the test's ("neet" | "jee")
const examFamily = (exam) => (exam === 'neet' ? 'neet' : exam === 'jee-main' || exam === 'jee-advanced' ? 'jee' : null);

const forExam = (family) => ({ OR: [{ exam: null }, ...(family ? [{ exam: family }] : [])] });

const visibleTo = async (userId) => {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { exam: true, subscription: { select: { status: true } } },
  });
  const family     = examFamily(user && user.exam);
  const subscribed = !!(user && user.subscription && user.subscription.status === 'active');

  return {
    status: 'published',
    // Tests inside a test series are stored only; no student sees them yet
    seriesId: null,
    OR: [
      { isFree: true, ...forExam(family) },
      ...(subscribed ? [{ audience: 'all', ...forExam(family) }] : []),
      { batches: { some: { batch: { subscriptions: { some: { userId, status: 'active' } } } } } },
      { groups: { some: { group: { members: { some: { userId } } } } } },
      { students: { some: { userId } } },
      { attempts: { some: { userId } } },
    ],
  };
};

// The same rules read from the test's side: every ACTIVE student who will see
// this test once it is published — used to tell them it went live (fan-out on
// publish). Students who already attempted it are left out, so unpublish →
// publish again never re-notifies anyone. The test must be loaded with its
// audience rows: { batches: { batchId }, groups: { groupId }, students: { userId } }.
const audienceStudentIds = async (test) => {
  const base = {
    role:     'student',
    isActive: true,
    ...(test.exam ? { exam: test.exam === 'jee' ? { in: ['jee-main', 'jee-advanced'] } : 'neet' } : {}),
    NOT: { attempts: { some: { testId: test.id } } },
  };
  const ids = (rows) => rows.map((u) => u.id);

  // A free test reaches its exam's students whatever the audience says.
  if (test.isFree) return ids(await prisma.user.findMany({ where: base, select: { id: true } }));

  if (test.audience === 'custom') {
    const groupIds  = (test.groups   || []).map((x) => x.groupId);
    const batchIds  = (test.batches  || []).map((x) => x.batchId);
    const direct    = (test.students || []).map((x) => x.userId);
    const OR = [
      ...(direct.length ? [{ id: { in: direct } }] : []),
      ...(groupIds.length ? [{ groups: { some: { groupId: { in: groupIds } } } }] : []),
      ...(batchIds.length ? [{ subscription: { status: 'active', batchId: { in: batchIds } } }] : []),
    ];
    if (!OR.length) return [];
    return ids(await prisma.user.findMany({ where: { ...base, OR }, select: { id: true } }));
  }

  // audience "all": every active student who holds a batch
  return ids(await prisma.user.findMany({ where: { ...base, subscription: { status: 'active' } }, select: { id: true } }));
};

module.exports = { examFamily, visibleTo, audienceStudentIds };
