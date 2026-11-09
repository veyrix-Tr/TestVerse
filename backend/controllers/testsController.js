const prisma = require('../lib/prisma');
const { stripAnswers } = require('../lib/paperFormat');
const { scoreAttempt, cleanResponses } = require('../lib/scoring');
const { visibleTo } = require('../lib/access');

// Answers are still accepted this long after the deadline (slow networks,
// the browser's own auto-submit). Past it, the attempt is submitted with
// whatever was last saved — on the next read or write, no cron needed.
const GRACE_MS = 2 * 60 * 1000;

// A student only reaches tests meant for them (lib/access.js); anything else
// is "not found". Admins can open any test, e.g. to preview it.
const findTest = async (req) =>
  prisma.test.findFirst({
    where: { id: req.params.id, ...(req.user.role === 'admin' ? {} : await visibleTo(req.user.id)) },
  });

const meta = (t) => ({
  id:            t.id,
  title:         t.title,
  subject:       t.subject,
  exam:          t.exam,
  isFree:        t.isFree,
  durationMin:   t.durationMin,
  questionCount: t.questionCount,
  totalMarks:    t.totalMarks,
  languages:     t.languages,
  opensAt:       t.opensAt,
  closesAt:      t.closesAt,
});

const publicAttempt = (a) =>
  a
    ? {
        startedAt:     a.startedAt,
        deadline:      a.deadline,
        submittedAt:   a.submittedAt,
        autoSubmitted: a.autoSubmitted,
        responses:     a.responses,
        score:         a.score,
        maxScore:      a.maxScore,
        correct:       a.correct,
        wrong:         a.wrong,
        partial:       a.partial,
        skipped:       a.skipped,
      }
    : null;

// Scores and closes an attempt.
const finalize = (attempt, test, responses, auto) =>
  prisma.attempt.update({
    where: { id: attempt.id },
    data:  { responses, submittedAt: new Date(), autoSubmitted: auto, ...scoreAttempt(test.paper, responses) },
  });

// Closes an attempt whose time (plus grace) has run out. Returns the fresh row.
const settle = async (attempt, test) => {
  if (!attempt || attempt.submittedAt || Date.now() <= attempt.deadline.getTime() + GRACE_MS) return attempt;
  return finalize(attempt, test, attempt.responses, true);
};

// upcoming | open | in-progress | done | closed
const statusOf = (test, attempt, now = Date.now()) => {
  if (attempt && attempt.submittedAt) return 'done';
  if (attempt) return 'in-progress';
  if (test.opensAt && now < test.opensAt.getTime()) return 'upcoming';
  if (test.closesAt && now >= test.closesAt.getTime()) return 'closed';
  return 'open';
};

const resultPayload = (test, attempt) => ({
  test:    { ...meta(test), instructions: test.instructions, marking: test.marking, paper: test.paper },
  attempt: publicAttempt(attempt),
});

// GET /api/tests — the published tests meant for this student, with their status and score
const listTests = async (req, res) => {
  try {
    const tests = await prisma.test.findMany({
      where:   await visibleTo(req.user.id),
      orderBy: [{ opensAt: 'asc' }, { createdAt: 'desc' }],
      include: { attempts: { where: { userId: req.user.id } } },
    });
    const out = [];
    for (const t of tests) {
      const attempt = await settle(t.attempts[0], t);
      out.push({ ...meta(t), status: statusOf(t, attempt), attempt: publicAttempt(attempt) && { ...publicAttempt(attempt), responses: undefined } });
    }
    res.json({ tests: out, serverNow: new Date() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not load tests' });
  }
};

// GET /api/tests/:id — details, instructions and the paper WITHOUT answers,
// plus this student's attempt (if any) and the server's clock
const getTest = async (req, res) => {
  try {
    const test = await findTest(req);
    if (!test || !test.paper) return res.status(404).json({ error: 'Test not found' });
    const attempt = await settle(await prisma.attempt.findUnique({ where: { testId_userId: { testId: test.id, userId: req.user.id } } }), test);
    res.json({
      test:      { ...meta(test), instructions: test.instructions, marking: test.marking, paper: stripAnswers(test.paper) },
      status:    statusOf(test, attempt),
      attempt:   publicAttempt(attempt),
      serverNow: new Date(),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

// POST /api/tests/:id/start — starts the attempt, or returns the one in progress
const startTest = async (req, res) => {
  try {
    const test = await findTest(req);
    if (!test || !test.paper) return res.status(404).json({ error: 'Test not found' });
    const key = { testId_userId: { testId: test.id, userId: req.user.id } };
    let attempt = await settle(await prisma.attempt.findUnique({ where: key }), test);

    if (attempt && attempt.submittedAt) return res.status(409).json({ error: "You've already submitted this test.", attempt: publicAttempt(attempt) });
    if (!attempt) {
      const status = statusOf(test, null);
      if (status === 'upcoming') return res.status(403).json({ error: 'This test has not opened yet.', opensAt: test.opensAt });
      if (status === 'closed') return res.status(403).json({ error: 'This test has closed.', closesAt: test.closesAt });
      const now = new Date();
      try {
        attempt = await prisma.attempt.create({
          data: { testId: test.id, userId: req.user.id, startedAt: now, deadline: new Date(now.getTime() + test.durationMin * 60000), responses: {} },
        });
      } catch (e) {
        // Two tabs pressed Start together: use the attempt the other one made
        if (e.code !== 'P2002') throw e;
        attempt = await prisma.attempt.findUnique({ where: key });
      }
    }
    res.json({ attempt: publicAttempt(attempt), serverNow: new Date() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not start the test' });
  }
};

// Shared by save and submit: the student's unsubmitted attempt, or an error reply.
const openAttempt = async (req, res) => {
  const test = await findTest(req);
  if (!test || !test.paper) {
    res.status(404).json({ error: 'Test not found' });
    return null;
  }
  const attempt = await settle(await prisma.attempt.findUnique({ where: { testId_userId: { testId: test.id, userId: req.user.id } } }), test);
  if (!attempt) {
    res.status(409).json({ error: "You haven't started this test." });
    return null;
  }
  if (attempt.submittedAt) {
    res.status(409).json({ error: attempt.autoSubmitted ? 'Time was up, so your test was submitted with your saved answers.' : "You've already submitted this test.", submitted: true, ...resultPayload(test, attempt) });
    return null;
  }
  return { test, attempt };
};

// PUT /api/tests/:id/attempt — Body: { responses } (autosave)
const saveAttempt = async (req, res) => {
  try {
    const open = await openAttempt(req, res);
    if (!open) return;
    const responses = cleanResponses(open.test.paper, req.body.responses);
    await prisma.attempt.update({ where: { id: open.attempt.id }, data: { responses } });
    res.json({ savedAt: new Date(), serverNow: new Date() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not save your answers' });
  }
};

// POST /api/tests/:id/submit — Body: { responses? } (falls back to the last autosave)
const submitTest = async (req, res) => {
  try {
    const open = await openAttempt(req, res);
    if (!open) return;
    const responses = req.body && req.body.responses ? cleanResponses(open.test.paper, req.body.responses) : open.attempt.responses;
    const auto = req.body && req.body.auto === true;
    const done = await finalize(open.attempt, open.test, responses, auto);
    res.json({ message: 'Test submitted', ...resultPayload(open.test, done) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not submit the test' });
  }
};

// GET /api/tests/:id/result — the full paper with answers and solutions, once submitted
const getResult = async (req, res) => {
  try {
    const test = await findTest(req);
    if (!test || !test.paper) return res.status(404).json({ error: 'Test not found' });
    const attempt = await settle(await prisma.attempt.findUnique({ where: { testId_userId: { testId: test.id, userId: req.user.id } } }), test);
    if (!attempt || !attempt.submittedAt) return res.status(409).json({ error: "You haven't submitted this test yet." });
    res.json(resultPayload(test, attempt));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

module.exports = { listTests, getTest, startTest, saveAttempt, submitTest, getResult };
