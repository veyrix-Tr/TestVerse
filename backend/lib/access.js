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
// Tests inside a test series follow a different rule: the student holds an
// ACTIVE purchase of that series (SeriesOrder) and the series itself is
// published. Unpublishing a series hides its tests again.
// Use these as Prisma `where`s so the database does the filtering.

const prisma = require('./prisma');

// The student's exam key ("neet" | "jee-main" | "jee-advanced") -> the test's ("neet" | "jee")
const examFamily = (exam) => (exam === 'neet' ? 'neet' : exam === 'jee-main' || exam === 'jee-advanced' ? 'jee' : null);

const forExam = (family) => ({ OR: [{ exam: null }, ...(family ? [{ exam: family }] : [])] });

const visibleTo = async (userId) => {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: {
      exam: true,
      subscription: { select: { status: true } },
      seriesOrders: { where: { status: 'active' }, select: { seriesId: true } },
    },
  });
  const family     = examFamily(user && user.exam);
  const subscribed = !!(user && user.subscription && user.subscription.status === 'active');
  const owned      = ((user && user.seriesOrders) || []).map((o) => o.seriesId);

  return {
    OR: [
      // Tests outside a series: published + the audience rules above
      {
        status:    'published',
        seriesId:  null,
        OR: [
          { isFree: true, ...forExam(family) },
          ...(subscribed ? [{ audience: 'all', ...forExam(family) }] : []),
          { batches: { some: { batch: { subscriptions: { some: { userId, status: 'active' } } } } } },
          { groups: { some: { group: { members: { some: { userId } } } } } },
          { students: { some: { userId } } },
          { attempts: { some: { userId } } },
        ],
      },
      // The student has bought the series, and it is still published
      ...(owned.length ? [{ seriesId: { in: owned }, series: { status: 'published' } }] : []),
    ],
  };
};

// Which published series this student may SEE and buy: their exam (or any),
// and the series' audience ("all", or their batch / a group they're in / them
// directly). Ownership is added by the caller with `owned`.
const seriesVisibleTo = async (userId) => {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { exam: true },
  });
  const family = examFamily(user && user.exam);
  return {
    status: 'published',
    OR:     [{ exam: null }, ...(family ? [{ exam: family }] : [])],
    AND:    [
      {
        OR: [
          { audience: 'all' },
          { batches: { some: { batch: { subscriptions: { some: { userId, status: 'active' } } } } } },
          { groups: { some: { group: { members: { some: { userId } } } } } },
          { students: { some: { userId } } },
        ],
      },
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

// Who to tell when a test SERIES is published: active students of its exam
// matching its audience who don't own it yet (the series must be loaded with
// { batches: { batchId }, groups: { groupId }, students: { userId } }).
const seriesAudienceStudentIds = async (series) => {
  const base = {
    role:     'student',
    isActive: true,
    ...(series.exam ? { exam: series.exam === 'jee' ? { in: ['jee-main', 'jee-advanced'] } : 'neet' } : {}),
    NOT: { seriesOrders: { some: { seriesId: series.id, status: 'active' } } },
  };
  if (series.audience !== 'custom') {
    // audience "all": every active student of the exam (no batch needed to buy)
    const all = await prisma.user.findMany({ where: base, select: { id: true } });
    return all.map((u) => u.id);
  }
  const groupIds = (series.groups   || []).map((x) => x.groupId);
  const batchIds = (series.batches  || []).map((x) => x.batchId);
  const direct   = (series.students || []).map((x) => x.userId);
  const OR = [
    ...(direct.length ? [{ id: { in: direct } }] : []),
    ...(groupIds.length ? [{ groups: { some: { groupId: { in: groupIds } } } }] : []),
    ...(batchIds.length ? [{ subscription: { status: 'active', batchId: { in: batchIds } } }] : []),
  ];
  if (!OR.length) return [];
  const rows = await prisma.user.findMany({ where: { ...base, OR }, select: { id: true } });
  return rows.map((u) => u.id);
};

module.exports = { examFamily, visibleTo, seriesVisibleTo, audienceStudentIds, seriesAudienceStudentIds };
