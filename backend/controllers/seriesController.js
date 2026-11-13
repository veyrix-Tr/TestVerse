const prisma = require('../lib/prisma');
const { seriesVisibleTo } = require('../lib/access');
const { notify } = require('../lib/notify');
const { testRow } = require('./testsController');

// The student's side of a test series: the catalog of published series they
// may see and buy, the inside of one (its tests with their attempt state),
// and the purchase. Until Cashfree is wired in, MOCK_PAYMENTS=true activates a
// purchase straight away — the same seam as the batch purchase in
// subscriptionController — and a series priced at 0 (free) is always
// activated at once. Never in production.
const mockPayments = () => process.env.MOCK_PAYMENTS === 'true' && process.env.NODE_ENV !== 'production';

const publicOrder = (o) => ({
  id:          o.id,
  status:      o.status,
  amount:      o.amount,
  activatedAt: o.activatedAt,
  createdAt:   o.createdAt,
});

// The sellable inside of a series: its tests that have a question paper (the
// ones a buyer can actually take), with the student's own attempt state.
// A test is "single subject" when its subject names one subject ("Physics"),
// full syllabus when it lists several ("Physics, Chemistry, Maths").
const isFull = (subject) => /[,&/+]| and /i.test(subject || '');
// { full: 2, subjects: [{ name: 'Physics', tests: 3 }, …] } over ready tests
const breakdown = (tests) => {
  const by = {};
  let full = 0;
  for (const t of tests) {
    const name = (t.subject || '').trim();
    if (!name || isFull(name)) full += 1;
    else by[name] = (by[name] || 0) + 1;
  }
  return { full, subjects: Object.entries(by).map(([name, n]) => ({ name, tests: n })) };
};

const testsOf = (s) => Promise.all(s.tests.map((t) => testRow(t)));

// GET /api/series — published series this student may see and buy, with counts,
// price and whether they already own one
const listSeries = async (req, res) => {
  try {
    const where = await seriesVisibleTo(req.user.id);
    const series = await prisma.testSeries.findMany({
      where,
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      include: {
        _count: { select: { tests: true } },
        orders: { where: { userId: req.user.id }, select: { status: true } },
      },
    });

    // Counts over the tests that have a paper — what a buyer can really take
    const ids = series.map((s) => s.id);
    const totals = ids.length
      ? await prisma.test.groupBy({
          by:    ['seriesId'],
          where: { seriesId: { in: ids }, questionCount: { gt: 0 } },
          _count: { _all: true },
          _sum:   { questionCount: true, totalMarks: true },
        })
      : [];
    const bySeries = Object.fromEntries(totals.map((t) => [t.seriesId, t]));
    const subjectRows = ids.length
      ? await prisma.test.findMany({
          where:  { seriesId: { in: ids }, questionCount: { gt: 0 } },
          select: { seriesId: true, subject: true },
        })
      : [];

    res.json({
      series: series.map((s) => {
        const t = bySeries[s.id];
        const order = s.orders[0] || null;
        return {
          id:          s.id,
          title:       s.title,
          exam:        s.exam,
          description: s.description,
          price:       s.price,
          publishedAt: s.publishedAt,
          tests:       t ? t._count._all : 0,
          questions:   t ? t._sum.questionCount || 0 : 0,
          marks:       t ? t._sum.totalMarks || 0 : 0,
          mix:         breakdown(subjectRows.filter((r) => r.seriesId === s.id)),
          owned:       !!(order && order.status === 'active'),
          orderStatus: order ? order.status : null,
        };
      }),
      serverNow: new Date(),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not load test series' });
  }
};

// GET /api/series/:id — one series and its tests. Visible before purchase
// (the tests are the selling point) with the student's attempt state, but no
// paper ever leaves the server here: taking a test goes through /api/tests.
const getSeries = async (req, res) => {
  try {
    const where = await seriesVisibleTo(req.user.id);
    const s = await prisma.testSeries.findFirst({
      where:  { id: req.params.id, ...where },
      include: {
        _count: { select: { tests: true } },
        orders: { where: { userId: req.user.id }, select: { status: true } },
        tests:  {
          where:   { questionCount: { gt: 0 } },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          include: {
            attempts: { where: { userId: req.user.id }, orderBy: { attemptNo: 'desc' } },
            series:   { select: { title: true } },
          },
        },
      },
    });
    if (!s) return res.status(404).json({ error: 'Test series not found' });

    const order = s.orders[0] || null;
    const tests = await testsOf(s);
    res.json({
      series: {
        id:          s.id,
        title:       s.title,
        exam:        s.exam,
        description: s.description,
        price:       s.price,
        publishedAt: s.publishedAt,
        tests:       tests.length,
        questions:   tests.reduce((n, t) => n + (t.questionCount || 0), 0),
        marks:       tests.reduce((n, t) => n + (t.totalMarks || 0), 0),
        mix:         breakdown(tests),
        owned:       !!(order && order.status === 'active'),
        orderStatus: order ? order.status : null,
      },
      tests,
      serverNow: new Date(),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not load this series' });
  }
};

// POST /api/series/:id/orders — the one-time purchase. No body.
// Free series (price 0) and MOCK_PAYMENTS=true activate at once; otherwise the
// order stays "pending" and the call answers 503 — REAL PAYMENTS: create a
// Cashfree order here and return its session id, the webhook activates it.
const buySeries = async (req, res) => {
  try {
    const where = await seriesVisibleTo(req.user.id);
    const s = await prisma.testSeries.findFirst({ where: { id: req.params.id, ...where }, select: { id: true, title: true, price: true } });
    if (!s) return res.status(404).json({ error: 'Test series not found' });
    if (s.price == null) return res.status(400).json({ error: 'This series has no price yet.' });

    const key = { userId_seriesId: { userId: req.user.id, seriesId: s.id } };
    const existing = await prisma.seriesOrder.findUnique({ where: key });
    if (existing && existing.status === 'active') {
      return res.status(409).json({ error: 'You already own this series.', order: publicOrder(existing) });
    }

    const free = s.price === 0;
    const paid = free || mockPayments();
    const data = {
      amount:      s.price,
      status:      paid ? 'active' : 'pending',
      activatedAt: paid ? new Date() : null,
      paymentRef:  paid ? (free ? 'free' : 'mock') : null,
    };
    const order = await prisma.seriesOrder.upsert({
      where:  key,
      update: data,
      create: { userId: req.user.id, seriesId: s.id, ...data },
    });

    if (!paid) {
      return res.status(503).json({
        error: "Online payment isn't available yet. Please contact us to get this series.",
        order: publicOrder(order),
      });
    }

    // The admin's bell: a student just bought a series.
    const student = await prisma.user.findUnique({ where: { id: req.user.id }, select: { name: true } });
    notify({
      type: 'purchase',
      text: 'New purchase: ' + (student && student.name ? student.name : 'Student') + ' · ' + s.title + (s.price ? ' · ₹' + s.price : ''),
      view: 'series',
    });
    // The student's bell: their series is unlocked.
    notify({
      type:   'purchase',
      text:   'Your ' + s.title + ' series is unlocked — start with its first test.',
      view:   '/student/test-series',
      userId: req.user.id,
    });
    res.status(201).json({ message: free ? 'Series unlocked' : 'Series purchased', order: publicOrder(order) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not complete the purchase' });
  }
};

module.exports = { listSeries, getSeries, buySeries };
