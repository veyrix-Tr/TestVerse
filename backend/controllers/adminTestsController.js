const { Prisma } = require('@prisma/client');
const prisma = require('../lib/prisma');
const { normalizePaper, normalizeMarking } = require('../lib/paperFormat');
const { AUDIENCE_INCLUDE, publicAudience, readAudience, writeAudience } = require('../lib/audience');

// What every admin test reply loads: how many students started it (first
// attempts only, so retakes don't count twice) + who it's given to.
const WITH = { _count: { select: { attempts: { where: { attemptNo: 1 } } } }, ...AUDIENCE_INCLUDE };

const EXAMS        = ['jee', 'neet'];
const MAX_DURATION = 600; // minutes
const MAX_INSTR    = 5000;

const clean = (v, max = 120) => String(v == null ? '' : v).trim().slice(0, max);

// Same JSON regardless of key order (Postgres jsonb doesn't keep key order).
const canon = (v) =>
  Array.isArray(v) ? v.map(canon)
    : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])]))
      : v;
const sameJson = (a, b) => JSON.stringify(canon(a ?? null)) === JSON.stringify(canon(b ?? null));

// "2026-11-15T14:00" / ISO / "" -> Date | null | undefined (undefined = invalid)
const readDate = (v) => {
  if (v == null || v === '') return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d;
};

// The JSON the admin pasted or uploaded may arrive as a string or as parsed JSON.
const readPaperInput = (v) => {
  if (typeof v !== 'string') return { value: v };
  try {
    return { value: JSON.parse(v) };
  } catch (e) {
    return { error: `That isn't valid JSON: ${e.message}` };
  }
};

// The admin section a test belongs to (see `kind` in prisma/schema.prisma).
const KINDS = ['free', 'live', 'series'];

// Checks the test's own fields for its kind. Returns { data } or { field, error }.
//   free   - shown to every student of its exam; no audience
//   live   - needs a start time (opensAt); given to chosen people or all paid students
//   series - stored inside a test series; no timing, never published, shown to nobody
const readDetails = (b, kind) => {
  const title = clean(b.title);
  if (!title) return { field: 'title', error: 'Give the test a title.' };
  const subject = clean(b.subject);
  if (!subject) return { field: 'subject', error: 'Enter the subject, like "Physics" or "Physics, Chemistry, Maths".' };
  const exam = b.exam ? String(b.exam) : null;
  if (exam && !EXAMS.includes(exam)) return { field: 'exam', error: 'Exam must be JEE or NEET (or leave it empty).' };
  const durationMin = Number(b.durationMin);
  if (!Number.isInteger(durationMin) || durationMin < 1 || durationMin > MAX_DURATION) {
    return { field: 'durationMin', error: `Duration must be a whole number of minutes from 1 to ${MAX_DURATION}.` };
  }
  const instructions = String(b.instructions == null ? '' : b.instructions).trim();
  if (instructions.length > MAX_INSTR) return { field: 'instructions', error: `Instructions can be at most ${MAX_INSTR} characters.` };
  const opensAt  = readDate(b.opensAt);
  const closesAt = readDate(b.closesAt);
  if (opensAt === undefined) return { field: 'opensAt', error: 'The opening time is not a valid date.' };
  if (closesAt === undefined) return { field: 'closesAt', error: 'The closing time is not a valid date.' };
  if (opensAt && closesAt && closesAt <= opensAt) return { field: 'closesAt', error: 'The test must close after it opens.' };
  if (kind === 'live' && !opensAt) return { field: 'opensAt', error: 'A live test needs a start time.' };
  const timing = kind === 'series' ? { opensAt: null, closesAt: null } : { opensAt, closesAt };
  return { data: { title, subject, exam, kind, isFree: kind === 'free', durationMin, instructions, ...timing } };
};

// Kind for a new test: a series id makes it a series test; otherwise the body's
// `kind`, falling back to the older `isFree` flag. Returns { kind, seriesId } or { field, error }.
const readKind = async (b) => {
  if (b.seriesId) {
    const series = await prisma.testSeries.findUnique({ where: { id: String(b.seriesId) }, select: { id: true } });
    if (!series) return { field: 'seriesId', error: 'That test series no longer exists.' };
    return { kind: 'series', seriesId: series.id };
  }
  const kind = KINDS.includes(b.kind) ? b.kind : b.isFree === true ? 'free' : 'live';
  if (kind === 'series') return { field: 'seriesId', error: 'Choose the test series this test belongs to.' };
  return { kind, seriesId: null };
};

// Only live tests have an audience; free tests are for everyone of the exam
// and series tests for nobody yet, so theirs is reset to "all".
const audienceFor = (kind, a) => (kind === 'live' ? a : { mode: 'all', batchIds: [], groupIds: [], studentIds: [] });

const summaryOf = (t) => ({
  id:            t.id,
  title:         t.title,
  subject:       t.subject,
  exam:          t.exam,
  isFree:        t.isFree,
  kind:          t.kind,
  seriesId:      t.seriesId,
  durationMin:   t.durationMin,
  questionCount: t.questionCount,
  totalMarks:    t.totalMarks,
  languages:     t.languages,
  status:        t.status,
  opensAt:       t.opensAt,
  closesAt:      t.closesAt,
  hasPaper:      t.paper != null,
  attempts:      t._count ? t._count.attempts : undefined,
  audience:      t.batches ? publicAudience(t) : { mode: t.audience, batches: [], groups: [], students: [] },
  submitted:     t.submitted,
  createdAt:     t.createdAt,
  updatedAt:     t.updatedAt,
});

const fullOf = (t) => ({
  ...summaryOf(t),
  instructions: t.instructions,
  marking:      t.marking,
  paper:        t.paper,
  source:       t.source,
});

// Validates paper + marking together. Returns { paper, summary, marking } or { status, body }.
const checkPaper = (rawPaper, subject, rawMarking) => {
  const mk = normalizeMarking(rawMarking);
  if (mk.errors) return { status: 400, body: { field: 'marking', error: mk.errors[0], errors: mk.errors } };
  if (rawPaper == null || rawPaper === '') return { marking: mk.marking, paper: null, summary: null, source: null };
  const parsed = readPaperInput(rawPaper);
  if (parsed.error) return { status: 400, body: { field: 'paper', error: parsed.error, errors: [parsed.error] } };
  const r = normalizePaper(parsed.value, { subject, marking: mk.marking });
  if (r.errors) {
    const n = r.errors.length;
    return { status: 400, body: { field: 'paper', error: `The question paper has ${n} problem${n === 1 ? '' : 's'} to fix.`, errors: r.errors } };
  }
  return { marking: mk.marking, paper: r.paper, summary: r.summary, source: parsed.value };
};

// GET /api/admin/tests?kind=free|live|series&seriesId= — tests, newest first, with attempt counts
const listTests = async (req, res) => {
  try {
    const where = {};
    if (KINDS.includes(req.query.kind)) where.kind = req.query.kind;
    if (req.query.seriesId) where.seriesId = String(req.query.seriesId);
    const tests = await prisma.test.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: WITH,
    });
    const done = await prisma.attempt.groupBy({ by: ['testId'], where: { submittedAt: { not: null }, attemptNo: 1 }, _count: { _all: true } });
    const submitted = Object.fromEntries(done.map((d) => [d.testId, d._count._all]));
    res.json({ tests: tests.map((t) => summaryOf({ ...t, submitted: submitted[t.id] || 0 })) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not load tests' });
  }
};

// POST /api/admin/tests/validate
// Body: { paper, subject, marking } — checks a paper without saving anything
const validatePaper = async (req, res) => {
  try {
    const r = checkPaper(req.body.paper, clean(req.body.subject) || 'Questions', req.body.marking);
    if (r.status) return res.status(200).json({ ok: false, ...r.body });
    if (!r.paper) return res.json({ ok: false, error: 'Paste or upload the question paper.', errors: [] });
    res.json({ ok: true, summary: r.summary, paper: r.paper });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not check the paper' });
  }
};

// POST /api/admin/tests
// Body: { title, subject, exam, kind ('free'|'live'), seriesId?, durationMin, instructions, marking,
//         opensAt, closesAt, paper, publish?, audience?: { mode: 'all'|'custom', batchIds, groupIds, studentIds } }
const createTest = async (req, res) => {
  try {
    const k = await readKind(req.body);
    if (k.error) return res.status(400).json(k);
    const d = readDetails(req.body, k.kind);
    if (d.error) return res.status(400).json(d);
    const a = await readAudience(req.body.audience === undefined && k.kind !== 'live' ? { mode: 'all' } : req.body.audience);
    if (a.error) return res.status(400).json(a);
    const p = checkPaper(req.body.paper, d.data.subject, req.body.marking);
    if (p.status) return res.status(p.status).json(p.body);
    const publish = req.body.publish === true;
    if (publish && k.kind === 'series') return res.status(400).json({ error: 'Tests in a test series are stored only, so they can’t be published yet.' });
    if (publish && !p.paper) return res.status(400).json({ field: 'paper', error: 'Add the question paper before publishing.' });

    const created = await prisma.test.create({
      data: {
        ...d.data,
        seriesId:      k.seriesId,
        marking:       p.marking,
        paper:         p.paper || undefined,
        source:        p.source || undefined,
        languages:     p.paper ? p.paper.languages : ['en'],
        questionCount: p.summary ? p.summary.questionCount : 0,
        totalMarks:    p.summary ? p.summary.totalMarks : 0,
        status:        publish ? 'published' : 'draft',
        createdById:   req.user.id,
      },
    });
    if (a.audience) await prisma.$transaction(writeAudience(prisma, created.id, audienceFor(k.kind, a.audience)));
    const test = await prisma.test.findUnique({ where: { id: created.id }, include: WITH });
    res.status(201).json({ message: publish ? 'Test published' : 'Draft saved', test: fullOf({ ...test, submitted: 0 }) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not save the test' });
  }
};

// GET /api/admin/tests/:id — everything, including answers and the original JSON
const getTest = async (req, res) => {
  try {
    const test = await prisma.test.findUnique({ where: { id: req.params.id }, include: WITH });
    if (!test) return res.status(404).json({ error: 'Test not found' });
    res.json({ test: fullOf(test) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

// PUT /api/admin/tests/:id — same body as create. Once a student has started
// the test, its paper and marking can't change (scores would stop matching).
const updateTest = async (req, res) => {
  try {
    const existing = await prisma.test.findUnique({ where: { id: req.params.id }, include: { _count: { select: { attempts: true } } } });
    if (!existing) return res.status(404).json({ error: 'Test not found' });

    // A test stays in the section it was made in
    const d = readDetails(req.body, existing.kind);
    if (d.error) return res.status(400).json(d);
    const a = await readAudience(req.body.audience);
    if (a.error) return res.status(400).json(a);
    const p = checkPaper(req.body.paper, d.data.subject, req.body.marking);
    if (p.status) return res.status(p.status).json(p.body);

    const locked = existing._count.attempts > 0;
    const paperChanged = !sameJson(p.paper, existing.paper) || !sameJson(p.marking, existing.marking);
    if (locked && paperChanged) {
      return res.status(409).json({ field: 'paper', error: 'Students have already started this test, so its questions and marking can no longer change. You can still edit the title, instructions and timings.' });
    }
    if (existing.status === 'published' && !p.paper) return res.status(400).json({ field: 'paper', error: 'A published test needs its question paper.' });

    const data = { ...d.data };
    if (!locked) {
      Object.assign(data, {
        marking:       p.marking,
        // Prisma needs DbNull to clear a Json column
        paper:         p.paper || Prisma.DbNull,
        source:        p.source || Prisma.DbNull,
        languages:     p.paper ? p.paper.languages : ['en'],
        questionCount: p.summary ? p.summary.questionCount : 0,
        totalMarks:    p.summary ? p.summary.totalMarks : 0,
      });
    }
    await prisma.test.update({ where: { id: existing.id }, data });
    // The audience can always change (who may take it), even once attempted
    if (a.audience) await prisma.$transaction(writeAudience(prisma, existing.id, audienceFor(existing.kind, a.audience)));
    const test = await prisma.test.findUnique({ where: { id: existing.id }, include: WITH });
    res.json({ message: 'Test saved', test: fullOf(test) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not save the test' });
  }
};

// POST /api/admin/tests/:id/publish and /unpublish
const setStatus = (status) => async (req, res) => {
  try {
    const test = await prisma.test.findUnique({ where: { id: req.params.id } });
    if (!test) return res.status(404).json({ error: 'Test not found' });
    if (status === 'published' && test.kind === 'series') return res.status(400).json({ error: 'Tests in a test series are stored only, so they can’t be published yet.' });
    if (status === 'published' && !test.paper) return res.status(400).json({ field: 'paper', error: 'Add the question paper before publishing.' });
    const updated = await prisma.test.update({ where: { id: test.id }, data: { status }, include: WITH });
    res.json({ message: status === 'published' ? 'Test published' : 'Test moved back to drafts', test: summaryOf(updated) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

// DELETE /api/admin/tests/:id — also deletes its attempts
const deleteTest = async (req, res) => {
  try {
    const test = await prisma.test.findUnique({ where: { id: req.params.id } });
    if (!test) return res.status(404).json({ error: 'Test not found' });
    await prisma.test.delete({ where: { id: test.id } });
    res.json({ message: 'Test deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not delete the test' });
  }
};

module.exports = {
  listTests,
  validatePaper,
  createTest,
  getTest,
  updateTest,
  publishTest:   setStatus('published'),
  unpublishTest: setStatus('draft'),
  deleteTest,
};
