const bcrypt = require('bcrypt');
const prisma = require('../lib/prisma');
const { publicBatch } = require('../lib/publicUser');
const { notify, EXAM_LABEL } = require('../lib/notify');
const { examFamily } = require('../lib/access');
const { emailRegex, normEmail, checkProfile, checkPassword, profileData } = require('../lib/profile');

// What the admin gives for free is marked with this instead of a payment id.
const BY_ADMIN = 'admin';

const PAGE      = 50;
const MAX_PAGE  = 500;
const WEEK_MS   = 7 * 24 * 60 * 60 * 1000;
const clean     = (v, max = 120) => String(v == null ? '' : v).trim().slice(0, max);
const ids       = (v) => (Array.isArray(v) ? [...new Set(v.map(String).filter(Boolean))] : []);
const pct       = (score, max) => (max > 0 ? Math.round((score / max) * 1000) / 10 : null);

// Results summary per student: { [userId]: { submitted, avgPct, lastAt } }
const statsFor = async (userIds) => {
  if (!userIds.length) return {};
  const rows = await prisma.attempt.findMany({
    where:  { userId: { in: userIds }, submittedAt: { not: null } },
    select: { userId: true, score: true, maxScore: true, submittedAt: true },
  });
  const out = {};
  for (const r of rows) {
    const s = (out[r.userId] = out[r.userId] || { submitted: 0, sum: 0, n: 0, lastAt: null });
    s.submitted++;
    const p = pct(r.score, r.maxScore);
    if (p != null) { s.sum += p; s.n++; }
    if (!s.lastAt || r.submittedAt > s.lastAt) s.lastAt = r.submittedAt;
  }
  for (const k of Object.keys(out)) {
    const s = out[k];
    out[k] = { submitted: s.submitted, avgPct: s.n ? Math.round((s.sum / s.n) * 10) / 10 : null, lastAt: s.lastAt };
  }
  return out;
};

const EMPTY_STATS = { submitted: 0, avgPct: null, lastAt: null };

const studentRow = (u, stats) => ({
  id:          u.id,
  name:        u.name,
  email:       u.email,
  phone:       u.phone,
  exam:        u.exam,
  grade:       u.grade,
  targetYear:  u.targetYear,
  state:       u.state,
  city:        u.city,
  isActive:    u.isActive,
  joinedAt:    u.createdAt,
  lastLoginAt: u.lastLoginAt,
  batch:       u.subscription ? { ...publicBatch(u.subscription.batch), status: u.subscription.status, activatedAt: u.subscription.activatedAt, byAdmin: u.subscription.paymentRef === BY_ADMIN, paid: u.subscription.amount || 0 } : null,
  groups:      (u.groups || []).map((m) => ({ id: m.group.id, name: m.group.name })),
  stats:       stats || EMPTY_STATS,
});

const STUDENT_INCLUDE = {
  subscription: { include: { batch: true } },
  groups:       { include: { group: { select: { id: true, name: true } } }, orderBy: { addedAt: 'asc' } },
};

// Prisma filter for the students list from the query string.
const GRADES = ['Class 11', 'Class 12', 'Dropper / repeater'];
const EXAM_KEYS = { jee: ['jee-main', 'jee-advanced'], neet: ['neet'] };

// Prisma filter for the students list from the query string.
//   status: paid (active batch) | free (no active batch) | active | pending | none
//   grade:  "Class 11" | "Class 12" | "Dropper / repeater"
//   exam:   jee (JEE Main + Advanced) | neet
const studentsWhere = (q) => {
  const and = [{ role: 'student' }];
  const text = clean(q.q, 80);
  if (text) and.push({ OR: ['name', 'email', 'phone', 'city', 'state'].map((f) => ({ [f]: { contains: text, mode: 'insensitive' } })) });
  if (q.batch) and.push({ subscription: { is: { batchId: String(q.batch) } } });
  const status = q.status === 'paid' ? 'active' : q.status;
  if (status === 'active' || status === 'pending') and.push({ subscription: { is: { status } } });
  if (status === 'none') and.push({ subscription: { is: null } });
  if (status === 'free') and.push({ NOT: { subscription: { is: { status: 'active' } } } });
  if (GRADES.includes(q.grade)) and.push({ grade: q.grade });
  if (EXAM_KEYS[q.exam]) and.push({ exam: { in: EXAM_KEYS[q.exam] } });
  if (q.group) and.push({ groups: { some: { groupId: String(q.group) } } });
  return { AND: and };
};

// GET /api/admin/students?q=&batch=&status=paid|free|active|pending|none&grade=&exam=jee|neet&group=&offset=&limit=
const listStudents = async (req, res) => {
  try {
    const where  = studentsWhere(req.query);
    const limit  = Math.min(Math.max(parseInt(req.query.limit, 10) || PAGE, 1), MAX_PAGE);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const weekAgo = new Date(Date.now() - WEEK_MS);
    const twoWeeksAgo = new Date(Date.now() - 2 * WEEK_MS);

    const [users, total, students, activeBatches, joinedThisWeek, joinedLastWeek, weekAttempts] = await Promise.all([
      prisma.user.findMany({ where, include: STUDENT_INCLUDE, orderBy: { createdAt: 'desc' }, skip: offset, take: limit }),
      prisma.user.count({ where }),
      prisma.user.count({ where: { role: 'student' } }),
      prisma.subscription.count({ where: { status: 'active', user: { role: 'student' } } }),
      prisma.user.count({ where: { role: 'student', createdAt: { gte: weekAgo } } }),
      prisma.user.count({ where: { role: 'student', createdAt: { gte: twoWeeksAgo, lt: weekAgo } } }),
      // this week's submitted attempts, for the count, average and number of students
      prisma.attempt.findMany({ where: { submittedAt: { gte: weekAgo } }, select: { userId: true, score: true, maxScore: true } }),
    ]);
    const weekPcts = weekAttempts.map((a) => pct(a.score, a.maxScore)).filter((x) => x != null);
    const weekAvgPct = weekPcts.length ? Math.round((weekPcts.reduce((x, y) => x + y, 0) / weekPcts.length) * 10) / 10 : null;
    const weekTakers = new Set(weekAttempts.map((a) => a.userId)).size;
    const stats = await statsFor(users.map((u) => u.id));
    res.json({
      students: users.map((u) => studentRow(u, stats[u.id])),
      total,
      offset,
      limit,
      summary: {
        students,
        activeBatches,
        paid:              activeBatches,
        free:              students - activeBatches,
        joinedThisWeek,
        joinedLastWeek,
        submittedThisWeek: weekAttempts.length,
        weekAvgPct,
        weekTakers,
      },
      serverNow: new Date(),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not load students' });
  }
};

// GET /api/admin/students/:id — profile, batch, groups, results and assigned tests
const getStudent = async (req, res) => {
  try {
    const u = await prisma.user.findFirst({
      where:   { id: req.params.id, role: 'student' },
      include: {
        ...STUDENT_INCLUDE,
        attempts:      { include: { test: { select: { id: true, title: true, subject: true, totalMarks: true, durationMin: true } } }, orderBy: { startedAt: 'desc' } },
        testsAssigned: { include: { test: { select: { id: true, title: true, subject: true, status: true, questionCount: true, durationMin: true } } } },
        seriesOrders:  { where: { status: 'active' }, include: { series: { select: { id: true, title: true, exam: true, status: true } } }, orderBy: { activatedAt: 'desc' } },
      },
    });
    if (!u) return res.status(404).json({ error: 'Student not found' });
    const stats = await statsFor([u.id]);
    const results = u.attempts.filter((a) => a.submittedAt).map((a) => ({
      testId:        a.testId,
      title:         a.test.title,
      subject:       a.test.subject,
      attemptNo:     a.attemptNo, // 2, 3, … are retakes
      startedAt:     a.startedAt,
      submittedAt:   a.submittedAt,
      autoSubmitted: a.autoSubmitted,
      score:         a.score,
      maxScore:      a.maxScore,
      pct:           pct(a.score, a.maxScore),
      correct:       a.correct,
      wrong:         a.wrong,
      partial:       a.partial,
      skipped:       a.skipped,
      timeTakenMs:   a.submittedAt - a.startedAt,
    }));
    const inProgress = u.attempts.filter((a) => !a.submittedAt).map((a) => ({ testId: a.testId, title: a.test.title, startedAt: a.startedAt, deadline: a.deadline }));
    res.json({
      student:       studentRow(u, stats[u.id]),
      results,
      inProgress,
      assignedTests: u.testsAssigned.map((x) => x.test),
      series:        u.seriesOrders.map((o) => ({ ...o.series, byAdmin: o.paymentRef === BY_ADMIN, paid: o.amount || 0, activatedAt: o.activatedAt })),
      serverNow:     new Date(),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

// ---------- Adding students, giving batches and series (no payment) ----------

// Gives a student a batch (or switches theirs), active at once. Their exam and
// class follow the batch, since its tests are shown by exam. A batch they paid
// for keeps its payment details.
const giveBatch = async (user, batch) => {
  const sub  = await prisma.subscription.findUnique({ where: { userId: user.id } });
  const free = { status: 'active', amount: 0, paymentRef: BY_ADMIN, activatedAt: new Date() };
  await prisma.$transaction([
    prisma.subscription.upsert({
      where:  { userId: user.id },
      create: { userId: user.id, batchId: batch.id, ...free },
      update: sub && sub.status === 'active' ? { batchId: batch.id } : { batchId: batch.id, ...free },
    }),
    prisma.user.update({
      where: { id: user.id },
      data:  { grade: batch.grade, ...(examFamily(user.exam) === batch.exam ? {} : { exam: batch.exam === 'neet' ? 'neet' : 'jee-main' }) },
    }),
  ]);
  await notify({ type: 'purchase', text: `Your ${batch.name} batch is active — your tests are ready.`, view: '/student/tests', userId: user.id });
};

// POST /api/admin/students — Body: { name, email, phone, exam, grade, targetYear?,
// state?, city?, password, giveBatch? }. The admin adds a student (say, one who
// paid at the centre): they log in with this email and password. giveBatch also
// activates the batch for their exam and class, free.
const createStudent = async (req, res) => {
  try {
    const b = req.body || {};
    const email = normEmail(b.email);
    if (!emailRegex.test(email)) return res.status(400).json({ field: 'email', error: 'Enter a valid email address.' });
    const bad = checkProfile(b, { optional: true }) || checkPassword(b.password);
    if (bad) return res.status(400).json(bad);
    const batch = b.giveBatch ? await prisma.batch.findFirst({ where: { exam: examFamily(b.exam), grade: b.grade } }) : null;
    if (b.giveBatch && !batch) return res.status(400).json({ field: 'giveBatch', error: 'There is no batch for this exam and class.' });

    const user = await prisma.user.create({
      data: { ...profileData(b), email, password: await bcrypt.hash(String(b.password), 10), emailVerifiedAt: new Date() },
    });
    if (batch) await giveBatch(user, batch);
    await notify({
      type:   'welcome',
      text:   `Welcome to Testverse, ${user.name.split(' ')[0]} — your ${EXAM_LABEL[user.exam]} tests are ready.`,
      view:   '/student',
      userId: user.id,
    });
    res.status(201).json({ message: 'Student added', student: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ field: 'email', error: 'An account with this email already exists.' });
    console.error(error);
    res.status(500).json({ error: 'Could not add the student' });
  }
};

const findStudent = (id) => prisma.user.findFirst({ where: { id, role: 'student' }, select: { id: true, exam: true } });

// PUT /api/admin/students/:id/batch — Body: { batchId } gives (or switches to)
// that batch, free; { batchId: null } takes their batch away.
const setBatch = async (req, res) => {
  try {
    const user = await findStudent(req.params.id);
    if (!user) return res.status(404).json({ error: 'Student not found' });
    const batchId = req.body && req.body.batchId;
    if (!batchId) {
      await prisma.subscription.deleteMany({ where: { userId: user.id } });
      return res.json({ message: 'Batch taken back' });
    }
    const batch = await prisma.batch.findUnique({ where: { id: String(batchId) } });
    if (!batch) return res.status(404).json({ error: 'Batch not found' });
    await giveBatch(user, batch);
    res.json({ message: `${batch.name} batch given` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not change the batch' });
  }
};

// POST /api/admin/students/:id/series — Body: { seriesId } unlocks it, free.
// DELETE /api/admin/students/:id/series/:seriesId takes it back.
const setSeries = async (req, res) => {
  try {
    const user = await findStudent(req.params.id);
    if (!user) return res.status(404).json({ error: 'Student not found' });
    const seriesId = String(req.params.seriesId || (req.body && req.body.seriesId) || '');
    const series = await prisma.testSeries.findUnique({ where: { id: seriesId }, select: { id: true, title: true } });
    if (!series) return res.status(404).json({ error: 'Test series not found' });
    if (req.method === 'DELETE') {
      await prisma.seriesOrder.deleteMany({ where: { userId: user.id, seriesId } });
      return res.json({ message: `${series.title} taken back` });
    }
    const had = await prisma.seriesOrder.findUnique({ where: { userId_seriesId: { userId: user.id, seriesId } } });
    if (had && had.status === 'active') return res.json({ message: `They already have ${series.title}.` });
    const free = { status: 'active', amount: 0, paymentRef: BY_ADMIN, activatedAt: new Date() };
    await prisma.seriesOrder.upsert({ where: { userId_seriesId: { userId: user.id, seriesId } }, create: { userId: user.id, seriesId, ...free }, update: free });
    await notify({ type: 'purchase', text: `Your ${series.title} series is unlocked — start with its first test.`, view: '/student/test-series', userId: user.id });
    res.json({ message: `${series.title} given` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not change the test series' });
  }
};

// Gives / takes back a test for one target (student or group).
// A test open to everyone needs no assigning, so that's reported, not changed.
const giveTest = (model, key) => async (req, res) => {
  try {
    const testId = String(req.params.testId || (req.body && req.body.testId) || '');
    const test = await prisma.test.findUnique({ where: { id: testId }, select: { id: true, title: true, audience: true } });
    if (!test) return res.status(404).json({ error: 'Test not found' });
    const target = key === 'userId'
      ? await prisma.user.findFirst({ where: { id: req.params.id, role: 'student' }, select: { id: true } })
      : await prisma.group.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!target) return res.status(404).json({ error: key === 'userId' ? 'Student not found' : 'Group not found' });

    if (req.method === 'DELETE') {
      await prisma[model].deleteMany({ where: { testId, [key]: target.id } });
      return res.json({ message: `${test.title} taken back` });
    }
    if (test.audience === 'all') {
      return res.json({ message: `${test.title} is already open to everyone with an active batch for its exam, so there is nothing to give.`, alreadyOpen: true });
    }
    await prisma[model].createMany({ data: [{ testId, [key]: target.id }], skipDuplicates: true });
    res.json({ message: `${test.title} given` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not update the test' });
  }
};

// ---------- Groups ----------

const readGroup = (b, partial) => {
  const name = clean(b.name, 60);
  if (!partial || b.name !== undefined) {
    if (!name) return { field: 'name', error: 'Give the group a name.' };
  }
  const description = clean(b.description, 300);
  return { data: { ...(b.name !== undefined || !partial ? { name } : {}), ...(b.description !== undefined || !partial ? { description } : {}) } };
};

// Groups are for paid students only: anyone without an active batch is skipped.
const validStudentIds = async (list) => {
  const wanted = ids(list);
  if (!wanted.length) return [];
  const found = await prisma.user.findMany({
    where:  { id: { in: wanted }, role: 'student', subscription: { is: { status: 'active' } } },
    select: { id: true },
  });
  return found.map((u) => u.id);
};

// GET /api/admin/groups
const listGroups = async (req, res) => {
  try {
    const groups = await prisma.group.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { members: true, tests: true } } },
    });
    res.json({
      groups: groups.map((g) => ({ id: g.id, name: g.name, description: g.description, members: g._count.members, tests: g._count.tests, createdAt: g.createdAt, updatedAt: g.updatedAt })),
      serverNow: new Date(),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not load groups' });
  }
};

// POST /api/admin/groups — Body: { name, description, studentIds }
const createGroup = async (req, res) => {
  try {
    const g = readGroup(req.body, false);
    if (g.error) return res.status(400).json(g);
    const studentIds = await validStudentIds(req.body.studentIds);
    const group = await prisma.group.create({
      data: { ...g.data, members: { create: studentIds.map((userId) => ({ userId })) } },
    });
    res.status(201).json({ message: 'Group created', group: { id: group.id, name: group.name, description: group.description, members: studentIds.length, tests: 0 } });
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ field: 'name', error: 'A group with this name already exists.' });
    console.error(error);
    res.status(500).json({ error: 'Could not create the group' });
  }
};

// GET /api/admin/groups/:id — members (with batch + results) and tests given
const getGroup = async (req, res) => {
  try {
    const g = await prisma.group.findUnique({
      where:   { id: req.params.id },
      include: {
        members: { include: { user: { include: STUDENT_INCLUDE } }, orderBy: { addedAt: 'asc' } },
        tests:   { include: { test: { select: { id: true, title: true, subject: true, status: true, audience: true, questionCount: true, durationMin: true } } } },
      },
    });
    if (!g) return res.status(404).json({ error: 'Group not found' });
    const stats = await statsFor(g.members.map((m) => m.userId));
    res.json({
      group:   { id: g.id, name: g.name, description: g.description, createdAt: g.createdAt, updatedAt: g.updatedAt },
      members: g.members.map((m) => ({ ...studentRow(m.user, stats[m.userId]), addedAt: m.addedAt })),
      tests:   g.tests.map((t) => t.test),
      serverNow: new Date(),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

// PUT /api/admin/groups/:id — Body: { name?, description? }
const updateGroup = async (req, res) => {
  try {
    const g = readGroup(req.body, true);
    if (g.error) return res.status(400).json(g);
    const exists = await prisma.group.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!exists) return res.status(404).json({ error: 'Group not found' });
    const group = await prisma.group.update({ where: { id: exists.id }, data: g.data });
    res.json({ message: 'Group saved', group: { id: group.id, name: group.name, description: group.description } });
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ field: 'name', error: 'A group with this name already exists.' });
    console.error(error);
    res.status(500).json({ error: 'Could not save the group' });
  }
};

// POST /api/admin/groups/:id/members — Body: { studentIds }
const addMembers = async (req, res) => {
  try {
    const exists = await prisma.group.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!exists) return res.status(404).json({ error: 'Group not found' });
    const studentIds = await validStudentIds(req.body.studentIds);
    if (!studentIds.length) return res.status(400).json({ field: 'studentIds', error: 'Choose at least one paid student. Students need an active batch to join a group.' });
    const r = await prisma.groupMember.createMany({ data: studentIds.map((userId) => ({ groupId: exists.id, userId })), skipDuplicates: true });
    res.json({ message: `${r.count} student${r.count === 1 ? '' : 's'} added`, added: r.count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not add students' });
  }
};

// DELETE /api/admin/groups/:id/members/:userId
const removeMember = async (req, res) => {
  try {
    const r = await prisma.groupMember.deleteMany({ where: { groupId: req.params.id, userId: req.params.userId } });
    if (!r.count) return res.status(404).json({ error: 'That student is not in this group.' });
    res.json({ message: 'Student removed from the group' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not remove the student' });
  }
};

// DELETE /api/admin/groups/:id — members and test links go with it
const deleteGroup = async (req, res) => {
  try {
    const r = await prisma.group.deleteMany({ where: { id: req.params.id } });
    if (!r.count) return res.status(404).json({ error: 'Group not found' });
    res.json({ message: 'Group deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not delete the group' });
  }
};

// GET /api/admin/batches — every batch, with how many students hold it
const listBatches = async (req, res) => {
  try {
    const batches = await prisma.batch.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { subscriptions: { where: { status: 'active' } } } } },
    });
    res.json({ batches: batches.map((b) => ({ ...publicBatch(b), isActive: b.isActive, students: b._count.subscriptions })) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not load batches' });
  }
};

module.exports = {
  listStudents,
  getStudent,
  createStudent,
  setBatch,
  setSeries,
  giveTestToStudent:     giveTest('testStudent', 'userId'),
  takeTestFromStudent:   giveTest('testStudent', 'userId'),
  listGroups,
  createGroup,
  getGroup,
  updateGroup,
  addMembers,
  removeMember,
  deleteGroup,
  giveTestToGroup:       giveTest('testGroup', 'groupId'),
  takeTestFromGroup:     giveTest('testGroup', 'groupId'),
  listBatches,
};
