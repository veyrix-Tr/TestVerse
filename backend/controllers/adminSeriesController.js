const prisma = require('../lib/prisma');

// Test series: a named set of tests the admin builds. For now its tests are
// stored only — no student can see them (lib/access.js); selling comes later.

const EXAMS = ['jee', 'neet'];
const clean = (v, max = 120) => String(v == null ? '' : v).trim().slice(0, max);

const readSeries = (b) => {
  const title = clean(b.title);
  if (!title) return { field: 'title', error: 'Give the test series a name.' };
  const exam = b.exam ? String(b.exam) : null;
  if (exam && !EXAMS.includes(exam)) return { field: 'exam', error: 'Exam must be JEE or NEET (or leave it empty).' };
  const description = clean(b.description, 1000);
  return { data: { title, exam, description } };
};

const seriesOf = (s) => ({
  id:          s.id,
  title:       s.title,
  exam:        s.exam,
  description: s.description,
  tests:       s._count ? s._count.tests : undefined,
  createdAt:   s.createdAt,
  updatedAt:   s.updatedAt,
});

// GET /api/admin/series — every series, newest first, with its number of tests
const listSeries = async (req, res) => {
  try {
    const series = await prisma.testSeries.findMany({ orderBy: { createdAt: 'desc' }, include: { _count: { select: { tests: true } } } });
    const totals = await prisma.test.groupBy({ by: ['seriesId'], where: { seriesId: { not: null } }, _sum: { questionCount: true } });
    const questions = Object.fromEntries(totals.map((t) => [t.seriesId, t._sum.questionCount || 0]));
    res.json({ series: series.map((s) => ({ ...seriesOf(s), questions: questions[s.id] || 0 })) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not load test series' });
  }
};

// POST /api/admin/series — Body: { title, exam, description }
const createSeries = async (req, res) => {
  try {
    const r = readSeries(req.body);
    if (r.error) return res.status(400).json(r);
    const s = await prisma.testSeries.create({ data: r.data });
    res.status(201).json({ message: 'Test series created', series: { ...seriesOf(s), tests: 0, questions: 0 } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not create the test series' });
  }
};

// GET /api/admin/series/:id — the series and its tests (oldest first, the order they were added)
const getSeries = async (req, res) => {
  try {
    const s = await prisma.testSeries.findUnique({
      where:   { id: req.params.id },
      include: {
        _count: { select: { tests: true } },
        tests:  {
          orderBy: { createdAt: 'asc' },
          select:  { id: true, title: true, subject: true, exam: true, durationMin: true, questionCount: true, totalMarks: true, paper: true, createdAt: true, updatedAt: true },
        },
      },
    });
    if (!s) return res.status(404).json({ error: 'Test series not found' });
    // eslint-disable-next-line no-unused-vars
    const tests = s.tests.map(({ paper, ...t }) => ({ ...t, hasPaper: paper != null }));
    res.json({ series: seriesOf(s), tests });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

// PUT /api/admin/series/:id — Body: { title, exam, description }
const updateSeries = async (req, res) => {
  try {
    const r = readSeries(req.body);
    if (r.error) return res.status(400).json(r);
    const found = await prisma.testSeries.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!found) return res.status(404).json({ error: 'Test series not found' });
    const s = await prisma.testSeries.update({ where: { id: found.id }, data: r.data, include: { _count: { select: { tests: true } } } });
    res.json({ message: 'Test series saved', series: seriesOf(s) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not save the test series' });
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

module.exports = { listSeries, createSeries, getSeries, updateSeries, deleteSeries };
