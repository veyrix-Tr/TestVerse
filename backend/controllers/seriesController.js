const prisma = require('../lib/prisma');
const { seriesVisibleTo } = require('../lib/access');
const { paymentMethod, startCheckout, grantNow, markPending } = require('../lib/purchases');
const { testRow } = require('./testsController');
const { resultSettings } = require('../lib/analysis');

// The student's side of a test series: the catalog of published series they
// may see and buy, the inside of one (its tests with their attempt state),
// and the purchase — paid through Cashfree (lib/purchases.js), the same flow as
// the batch purchase in subscriptionController. A series priced at 0 (free) is
// unlocked at once.

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

const testsOf = async (s) => {
  const settings = await resultSettings();
  return Promise.all(s.tests.map((t) => testRow(t, settings)));
};

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

// POST /api/series/:id/orders — the one-time purchase. No body. Answers:
//   201 { order }                                  — unlocked now (price 0, or MOCK_PAYMENTS in dev)
//   200 { checkout: { orderId, paymentSessionId, mode }, order }
//                                                  — open Cashfree's checkout; /payment/return
//                                                    (or the webhook) unlocks it once paid
//   503                                            — no way to pay online right now
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

    const free   = s.price === 0;
    const method = free ? 'free' : paymentMethod();
    if (!method) {
      return res.status(503).json({ error: "Online payment isn't available right now. Please contact us to get this series." });
    }

    if (method === 'cashfree') {
      const checkout = await startCheckout(req, {
        kind:     'series',
        userId:   req.user.id,
        amount:   s.price,
        seriesId: s.id,
        note:     `Testverse test series: ${s.title}`.slice(0, 200),
      });
      // Never overwrites an active order (e.g. another tab's payment landing meanwhile)
      const wrote = await markPending({ kind: 'series', userId: req.user.id, seriesId: s.id, amount: s.price, ref: checkout.orderId });
      const order = await prisma.seriesOrder.findUnique({ where: key });
      if (!wrote) return res.status(409).json({ error: 'You already own this series.', order: publicOrder(order) });
      return res.json({ checkout, order: publicOrder(order) });
    }

    // Free, or MOCK_PAYMENTS in dev
    const granted = await grantNow({ kind: 'series', userId: req.user.id, seriesId: s.id, amount: s.price, ref: method });
    if (granted.orphan) return res.status(404).json({ error: 'Test series not found' }); // deleted just now
    const order = await prisma.seriesOrder.findUnique({ where: key });
    // Lost a race with a concurrent request (double-click): it was unlocked once, by that one
    if (granted.duplicate) return res.status(409).json({ error: 'You already own this series.', order: publicOrder(order) });
    res.status(201).json({ message: free ? 'Series unlocked' : 'Series purchased', order: publicOrder(order) });
  } catch (error) {
    if (error.expose) return res.status(error.status).json({ error: error.message });
    console.error(error);
    res.status(500).json({ error: 'Could not complete the purchase' });
  }
};

module.exports = { listSeries, getSeries, buySeries };
