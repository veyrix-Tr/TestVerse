const prisma = require('../lib/prisma');
const { AUDIENCE_INCLUDE, publicAudience, readAudience, writeSeriesAudience } = require('../lib/audience');
const { seriesAudienceStudentIds } = require('../lib/access');
const { notifyMany } = require('../lib/notify');

// Test series: a named set of tests the admin builds, prices, gives an
// audience and publishes. A student buys it once (SeriesOrder); the tests
// inside then become theirs to take (lib/access.js).

const EXAMS = ['jee', 'neet'];
const MAX_PRICE = 1000000;
const clean = (v, max = 120) => String(v == null ? '' : v).trim().slice(0, max);

const readSeries = (b) => {
  const title = clean(b.title);
  if (!title) return { field: 'title', error: 'Give the test series a name.' };
  const exam = b.exam ? String(b.exam) : null;
  if (exam && !EXAMS.includes(exam)) return { field: 'exam', error: 'Exam must be JEE or NEET (or leave it empty).' };
  const description = clean(b.description, 1000);
  // Price in rupees: empty = not set (null), 0 = free. Publishing requires it.
  let price = b.price;
  if (price === undefined || price === null || price === '') price = null;
  else {
    price = Number(price);
    if (!Number.isInteger(price) || price < 0 || price > MAX_PRICE) {
      return { field: 'price', error: 'Price must be a whole number of rupees (0 or more).' };
    }
  }
  return { data: { title, exam, description, price } };
};

const seriesOf = (s) => ({
  id:          s.id,
  title:       s.title,
  exam:        s.exam,
  description: s.description,
  price:       s.price,
  status:      s.status,
  publishedAt: s.publishedAt,
  audience:    s.audience,
  tests:       s._count ? s._count.tests : undefined,
  createdAt:   s.createdAt,
  updatedAt:   s.updatedAt,
});

// The series with its audience rows as words (for the editor).
const fullOf = (s) => ({ ...seriesOf(s), audience: publicAudience(s) });

// GET /api/admin/series — every series, newest first, with its number of tests
// and how many are ready (have a question paper).
const listSeries = async (req, res) => {
  try {
    const series = await prisma.testSeries.findMany({ orderBy: { createdAt: 'desc' }, include: { _count: { select: { tests: true } } } });
    const totals = await prisma.test.groupBy({ by: ['seriesId'], where: { seriesId: { not: null } }, _sum: { questionCount: true } });
    const questions = Object.fromEntries(totals.map((t) => [t.seriesId, t._sum.questionCount || 0]));
    // A test without a paper has no questions, so questionCount counts the ready ones
    const ready = await prisma.test.groupBy({ by: ['seriesId'], where: { seriesId: { not: null }, questionCount: { gt: 0 } }, _count: { _all: true } });
    const readyBySeries = Object.fromEntries(ready.map((t) => [t.seriesId, t._count._all]));
    res.json({ series: series.map((s) => ({ ...seriesOf(s), questions: questions[s.id] || 0, ready: readyBySeries[s.id] || 0 })) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not load test series' });
  }
};

// POST /api/admin/series — Body: { title, exam, description, price?, audience? }
const createSeries = async (req, res) => {
  try {
    const r = readSeries(req.body);
    if (r.error) return res.status(400).json(r);
    const a = await readAudience(req.body.audience);
    if (a.error) return res.status(400).json(a);
    const created = await prisma.testSeries.create({ data: r.data });
    if (a.audience) await prisma.$transaction(writeSeriesAudience(prisma, created.id, a.audience));
    const s = await prisma.testSeries.findUnique({ where: { id: created.id }, include: AUDIENCE_INCLUDE });
    res.status(201).json({ message: 'Test series created', series: { ...fullOf(s), tests: 0, questions: 0, ready: 0 } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not create the test series' });
  }
};

// GET /api/admin/series/:id — the series (with its audience) and its tests, in
// the order the admin chose (sortOrder, ties broken by the order they were added)
const getSeries = async (req, res) => {
  try {
    const s = await prisma.testSeries.findUnique({
      where:   { id: req.params.id },
      include: {
        _count: { select: { tests: true } },
        ...AUDIENCE_INCLUDE,
        tests:  {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          select:  { id: true, title: true, subject: true, exam: true, durationMin: true, questionCount: true, totalMarks: true, paper: true, status: true, sortOrder: true, createdAt: true, updatedAt: true },
        },
      },
    });
    if (!s) return res.status(404).json({ error: 'Test series not found' });
    // eslint-disable-next-line no-unused-vars
    const tests = s.tests.map(({ paper, ...t }) => ({ ...t, hasPaper: paper != null }));
    res.json({ series: fullOf(s), tests });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

// PUT /api/admin/series/:id — Body: { title, exam, description, price?, audience? }
// (audience omitted = leave it as it is)
const updateSeries = async (req, res) => {
  try {
    const r = readSeries(req.body);
    if (r.error) return res.status(400).json(r);
    const a = await readAudience(req.body.audience);
    if (a.error) return res.status(400).json(a);
    const found = await prisma.testSeries.findUnique({ where: { id: req.params.id }, select: { id: true, status: true } });
    if (!found) return res.status(404).json({ error: 'Test series not found' });
    // A series on sale always has a decided price (0 = free)
    if (found.status === 'published' && r.data.price === null) {
      return res.status(400).json({ field: 'price', error: 'This series is published — keep a price on it (0 makes it free), or unpublish it first.' });
    }
    const ops = [prisma.testSeries.update({ where: { id: found.id }, data: r.data })];
    if (a.audience) ops.push(...writeSeriesAudience(prisma, found.id, a.audience));
    await prisma.$transaction(ops);
    const s = await prisma.testSeries.findUnique({ where: { id: found.id }, include: { _count: { select: { tests: true } }, ...AUDIENCE_INCLUDE } });
    res.json({ message: 'Test series saved', series: fullOf(s) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not save the test series' });
  }
};

// POST /api/admin/series/:id/publish — makes it visible and buyable.
// Needs a price (0 = free) and at least one test with a question paper.
const publishSeries = async (req, res) => {
  try {
    const s = await prisma.testSeries.findUnique({
      where:   { id: req.params.id },
      include: { _count: { select: { tests: true } }, ...AUDIENCE_INCLUDE },
    });
    if (!s) return res.status(404).json({ error: 'Test series not found' });
    if (s.status === 'published') return res.status(409).json({ error: 'This series is already published.' });
    if (s.price == null) return res.status(400).json({ field: 'price', error: 'Set a price before publishing (0 makes it free).' });
    const ready = await prisma.test.count({ where: { seriesId: s.id, questionCount: { gt: 0 } } });
    if (!ready) return res.status(400).json({ error: 'Add at least one test with a question paper before publishing.' });

    const updated = await prisma.testSeries.update({ where: { id: s.id }, data: { status: 'published', publishedAt: new Date() } });
    // The students who will see it get a bell (fire-and-forget, capped)
    seriesAudienceStudentIds(s)
      .then((ids) => notifyMany(ids, { type: 'test', text: 'New test series: ' + s.title, view: '/student/test-series' }))
      .catch((e) => console.error('series publish notify:', e.message));
    res.json({ message: 'Series published', series: fullOf({ ...s, ...updated }) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not publish the series' });
  }
};

// POST /api/admin/series/:id/unpublish — back to draft: hidden and unsellable
// again (purchases already made are kept and work once it's published again).
const unpublishSeries = async (req, res) => {
  try {
    const found = await prisma.testSeries.findUnique({ where: { id: req.params.id }, select: { id: true, status: true } });
    if (!found) return res.status(404).json({ error: 'Test series not found' });
    if (found.status !== 'published') return res.status(409).json({ error: 'This series is not published.' });
    await prisma.testSeries.update({ where: { id: found.id }, data: { status: 'draft', publishedAt: null } });
    const s = await prisma.testSeries.findUnique({ where: { id: found.id }, include: { _count: { select: { tests: true } }, ...AUDIENCE_INCLUDE } });
    res.json({ message: 'Series unpublished', series: fullOf(s) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not unpublish the series' });
  }
};

// DELETE /api/admin/series/:id — deletes the series and every test in it
const deleteSeries = async (req, res) => {
  try {
    const r = await prisma.testSeries.deleteMany({ where: { id: req.params.id } });
    if (!r.count) return res.status(404).json({ error: 'Test series not found' });
    res.json({ message: 'Test series deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not delete the test series' });
  }
};

// PUT /api/admin/series/:id/order — Body: { testIds: [id, …] }
// Saves the order of the tests in the tree: testIds must be exactly this
// series' tests, each once, in their new order (so nothing from another
// series can be written and no test can silently go missing).
const reorderSeries = async (req, res) => {
  try {
    const id = req.params.id;
    const ids = Array.isArray(req.body.testIds) ? req.body.testIds.map(String) : null;
    if (!ids || !ids.length || ids.some((x) => !x)) {
      return res.status(400).json({ field: 'testIds', error: 'Send the ids of this series’ tests, in their new order.' });
    }
    const series = await prisma.testSeries.findUnique({ where: { id }, select: { id: true } });
    if (!series) return res.status(404).json({ error: 'Test series not found' });

    const tests = await prisma.test.findMany({ where: { seriesId: id }, select: { id: true } });
    const sameSet = tests.length === ids.length && new Set(ids).size === ids.length;
    const belongs = sameSet && tests.every((t) => ids.includes(t.id));
    if (!belongs) {
      return res.status(400).json({ error: 'That order doesn’t match this series’ tests. Reload the page and try again.' });
    }

    await prisma.$transaction(ids.map((testId, i) => prisma.test.update({ where: { id: testId }, data: { sortOrder: i } })));
    res.json({ message: 'Order saved' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not save the order' });
  }
};

module.exports = { listSeries, createSeries, getSeries, updateSeries, deleteSeries, reorderSeries, publishSeries, unpublishSeries };
