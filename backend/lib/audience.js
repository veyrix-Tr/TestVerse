// lib/audience.js
// A test's audience: "all" (every student) or "custom" (chosen batches,
// groups and students, kept in TestBatch / TestGroup / TestStudent).

const prisma = require('./prisma');

// Prisma include that loads the audience with names, for admin screens.
const AUDIENCE_INCLUDE = {
  batches:  { include: { batch: { select: { id: true, name: true } } } },
  groups:   { include: { group: { select: { id: true, name: true } } } },
  students: { include: { user: { select: { id: true, name: true, email: true } } } },
};

const publicAudience = (t) => ({
  mode:     t.audience,
  batches:  (t.batches || []).map((x) => x.batch),
  groups:   (t.groups || []).map((x) => x.group),
  students: (t.students || []).map((x) => x.user),
});

const ids = (v) => (Array.isArray(v) ? [...new Set(v.map(String).filter(Boolean))] : []);

// Checks { mode, batchIds, groupIds, studentIds } against the database.
// Returns { audience } or { field, error }. `undefined` input = leave unchanged.
const readAudience = async (input) => {
  if (input === undefined) return { audience: undefined };
  const mode = input && input.mode === 'custom' ? 'custom' : 'all';
  if (mode === 'all') return { audience: { mode, batchIds: [], groupIds: [], studentIds: [] } };

  const batchIds = ids(input.batchIds), groupIds = ids(input.groupIds), studentIds = ids(input.studentIds);
  const [b, g, s] = await Promise.all([
    prisma.batch.count({ where: { id: { in: batchIds } } }),
    prisma.group.count({ where: { id: { in: groupIds } } }),
    prisma.user.count({ where: { id: { in: studentIds }, role: 'student' } }),
  ]);
  if (b !== batchIds.length) return { field: 'audience', error: 'One of the chosen batches no longer exists.' };
  if (g !== groupIds.length) return { field: 'audience', error: 'One of the chosen groups no longer exists.' };
  if (s !== studentIds.length) return { field: 'audience', error: 'One of the chosen students no longer exists.' };
  return { audience: { mode, batchIds, groupIds, studentIds } };
};

// Replaces a test's audience (run inside a transaction with the test update).
const writeAudience = (tx, testId, a) => [
  tx.testBatch.deleteMany({ where: { testId } }),
  tx.testGroup.deleteMany({ where: { testId } }),
  tx.testStudent.deleteMany({ where: { testId } }),
  tx.test.update({ where: { id: testId }, data: { audience: a.mode } }),
  ...(a.batchIds.length ? [tx.testBatch.createMany({ data: a.batchIds.map((batchId) => ({ testId, batchId })) })] : []),
  ...(a.groupIds.length ? [tx.testGroup.createMany({ data: a.groupIds.map((groupId) => ({ testId, groupId })) })] : []),
  ...(a.studentIds.length ? [tx.testStudent.createMany({ data: a.studentIds.map((userId) => ({ testId, userId })) })] : []),
];

module.exports = { AUDIENCE_INCLUDE, publicAudience, readAudience, writeAudience };
