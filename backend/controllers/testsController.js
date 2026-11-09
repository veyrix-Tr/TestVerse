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

// A student can retake a test after submitting it, so they may have several
// attempts (attemptNo 1, 2, …). Only the latest one can be in progress.
const latestAttempt = (testId, userId) =>
  prisma.attempt.findFirst({ where: { testId, userId }, orderBy: { attemptNo: 'desc' } });

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
        attemptNo:     a.attemptNo,
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

// One line per submitted attempt, newest first, for score history.
const summaryOf = (a) => ({
  attemptNo:   a.attemptNo,
  submittedAt: a.submittedAt,
  score:       a.score,
  maxScore:    a.maxScore,
  correct:     a.correct,
  wrong:       a.wrong,
  partial:     a.partial,
  skipped:     a.skipped,
});

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

// upcoming | open | in-progress | done | closed (for the latest attempt)
const statusOf = (test, attempt, now = Date.now()) => {
  if (attempt && attempt.submittedAt) return 'done';
  if (attempt) return 'in-progress';
  if (test.opensAt && now < test.opensAt.getTime()) return 'upcoming';
  if (test.closesAt && now >= test.closesAt.getTime()) return 'closed';
  return 'open';
};

// A submitted test can be taken again while it's still open.
const canRetake = (test, attempt, now = Date.now()) =>
  !!(attempt && attempt.submittedAt) &&
  !(test.opensAt && now < test.opensAt.getTime()) &&
  !(test.closesAt && now >= test.closesAt.getTime());

// The full paper with answers, one submitted attempt, and the student's other
// submitted attempts. `latest` is their newest attempt (maybe a retake in progress).
const resultPayload = async (test, attempt, latest) => {
  const done = await prisma.attempt.findMany({
    where:   { testId: test.id, userId: attempt.userId, submittedAt: { not: null } },
    orderBy: { attemptNo: 'desc' },
  });
  return {
    test:       { ...meta(test), instructions: test.instructions, marking: test.marking, paper: test.paper },
    attempt:    publicAttempt(attempt),
    history:    done.map(summaryOf),
    inProgress: !!(latest && !latest.submittedAt),
    canRetake:  canRetake(test, latest || attempt),
  };
};

// GET /api/tests — the published tests meant for this student, with their
// status, latest attempt (without answers), best score and score history
const listTests = async (req, res) => {
  try {
    const tests = await prisma.test.findMany({
      where:   await visibleTo(req.user.id),
      orderBy: [{ opensAt: 'asc' }, { createdAt: 'desc' }],
      include: { attempts: { where: { userId: req.user.id }, orderBy: { attemptNo: 'desc' } } },
    });
    const out = [];
    for (const t of tests) {
      const [first, ...older] = t.attempts;
      const attempt = await settle(first, t);
      const done = [attempt, ...older].filter((a) => a && a.submittedAt);
      const best = done.reduce((b, a) => (!b || a.score > b.score ? a : b), null);
      out.push({
        ...meta(t),
        status:    statusOf(t, attempt),
        canRetake: canRetake(t, attempt),
        attempt:   attempt ? { ...publicAttempt(attempt), responses: undefined } : null,
        best:      best ? { attemptNo: best.attemptNo, score: best.score, maxScore: best.maxScore } : null,
        history:   done.map(summaryOf),
      });
    }
    res.json({ tests: out, serverNow: new Date() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not load tests' });
  }
};

// GET /api/tests/:id — details, instructions and the paper WITHOUT answers,
// plus this student's latest attempt (if any) and the server's clock
const getTest = async (req, res) => {
  try {
    const test = await findTest(req);
    if (!test || !test.paper) return res.status(404).json({ error: 'Test not found' });
    const attempt = await settle(await latestAttempt(test.id, req.user.id), test);
    res.json({
      test:      { ...meta(test), instructions: test.instructions, marking: test.marking, paper: stripAnswers(test.paper) },
      status:    statusOf(test, attempt),
      canRetake: canRetake(test, attempt),
      attempt:   publicAttempt(attempt),
      serverNow: new Date(),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

// POST /api/tests/:id/start — Body: { retake?: true }
// Starts the first attempt, returns the one in progress, or (with retake)
// starts a fresh attempt after a submitted one
const startTest = async (req, res) => {
  try {
    const test = await findTest(req);
    if (!test || !test.paper) return res.status(404).json({ error: 'Test not found' });
    let attempt = await settle(await latestAttempt(test.id, req.user.id), test);
    const retake = !!(req.body && req.body.retake === true);

    if (attempt && attempt.submittedAt && !retake) return res.status(409).json({ error: "You've already submitted this test.", attempt: publicAttempt(attempt) });
    if (!attempt || attempt.submittedAt) {
      const status = statusOf(test, null);
      if (status === 'upcoming') return res.status(403).json({ error: 'This test has not opened yet.', opensAt: test.opensAt });
      if (status === 'closed') return res.status(403).json({ error: attempt ? 'This test has closed, so it can no longer be retaken.' : 'This test has closed.', closesAt: test.closesAt });
      const now = new Date();
      try {
        attempt = await prisma.attempt.create({
          data: {
            testId:    test.id,
            userId:    req.user.id,
            attemptNo: attempt ? attempt.attemptNo + 1 : 1,
            startedAt: now,
            deadline:  new Date(now.getTime() + test.durationMin * 60000),
            responses: {},
          },
        });
      } catch (e) {
        // Two tabs pressed Start together: use the attempt the other one made
        if (e.code !== 'P2002') throw e;
        attempt = await latestAttempt(test.id, req.user.id);
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
  const attempt = await settle(await latestAttempt(test.id, req.user.id), test);
  if (!attempt) {
    res.status(409).json({ error: "You haven't started this test." });
    return null;
  }
  if (attempt.submittedAt) {
    res.status(409).json({
      error: attempt.autoSubmitted ? 'Time was up, so your test was submitted with your saved answers.' : "You've already submitted this test.",
      submitted: true,
      ...(await resultPayload(test, attempt, attempt)),
    });
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
    res.json({ message: 'Test submitted', ...(await resultPayload(open.test, done, done)) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not submit the test' });
  }
};

// GET /api/tests/:id/result[?attempt=n] — the full paper with answers and
// solutions for a submitted attempt (default: the latest submitted one)
const getResult = async (req, res) => {
  try {
    const test = await findTest(req);
    if (!test || !test.paper) return res.status(404).json({ error: 'Test not found' });
    const latest = await settle(await latestAttempt(test.id, req.user.id), test);
    const n = Number(req.query.attempt);
    const attempt = await prisma.attempt.findFirst({
      where:   { testId: test.id, userId: req.user.id, submittedAt: { not: null }, ...(Number.isInteger(n) && n > 0 ? { attemptNo: n } : {}) },
      orderBy: { attemptNo: 'desc' },
    });
    if (!attempt) return res.status(409).json({ error: "You haven't submitted this test yet." });
    res.json(await resultPayload(test, attempt, latest));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

module.exports = { listTests, getTest, startTest, saveAttempt, submitTest, getResult };
