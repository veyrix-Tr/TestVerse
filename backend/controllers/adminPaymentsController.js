const prisma   = require('../lib/prisma');
const cashfree = require('../services/cashfree');
const { confirmOrder } = require('../lib/purchases');

// Admin › Payments: every Cashfree checkout (the Payment table), newest first,
// with totals. Read-only. Nothing here grants anything, except "Check with
// Cashfree" on one pending order, which runs the same confirmOrder() the
// student's return page and the webhook use. That call is safe to repeat: the
// grant is claimed atomically on the Payment row, so it can only happen once.
// There are no refunds or edits: a Payment row is the record of money received.

const PAGE = 50;
const MAX_PAGE = 5000; // the CSV export asks for everything that matches, up to this
const STATUSES = ['paid', 'pending', 'failed'];
const KINDS = ['batch', 'series'];

const INCLUDE = {
  user:   { select: { id: true, name: true, email: true, phone: true } },
  batch:  { select: { id: true, name: true } },
  series: { select: { id: true, title: true } },
};

const publicPayment = (p) => ({
  id:          p.id,
  orderId:     p.orderId,
  cfPaymentId: p.cfPaymentId,
  kind:        p.kind,
  // What was bought; null once that batch or series has been deleted (the row stays)
  item:        p.kind === 'batch' ? (p.batch ? { id: p.batch.id, name: p.batch.name } : null) : p.series ? { id: p.series.id, name: p.series.title } : null,
  amount:      p.amount,
  status:      p.status,
  createdAt:   p.createdAt,
  paidAt:      p.paidAt,
  student:     p.user ? { id: p.user.id, name: p.user.name, email: p.user.email, phone: p.user.phone } : null,
});

// The first moment of this calendar month in India (IST, UTC+5:30), as a Date.
const monthStartIST = (now = new Date()) => {
  const ist = new Date(now.getTime() + 330 * 60000);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), 1) - 330 * 60000);
};

// "YYYY-MM-DD" (a day in India) -> the Date it starts at, or null
const dayStartIST = (s) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s || ''))) return null;
  const d = new Date(s + 'T00:00:00+05:30');
  return isNaN(d) ? null : d;
};

// Filters from the query string: status, kind, item (batch/series id), q, from, to
const whereOf = (query) => {
  const where = {};
  if (STATUSES.includes(query.status)) where.status = query.status;
  if (KINDS.includes(query.kind)) where.kind = query.kind;
  if (query.item) where.OR = [{ batchId: String(query.item) }, { seriesId: String(query.item) }];
  const from = dayStartIST(query.from);
  const to = dayStartIST(query.to);
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = from;
    if (to) where.createdAt.lt = new Date(to.getTime() + 24 * 3600 * 1000); // the whole "to" day
  }
  const q = String(query.q || '').trim();
  if (q) {
    // A mobile number typed as "+91 98765 43210" or "098765…" matches the stored 10 digits
    const digits = q.replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, '');
    const search = [
      { orderId:     { contains: q, mode: 'insensitive' } },
      { cfPaymentId: { contains: q, mode: 'insensitive' } },
      { user: { name:  { contains: q, mode: 'insensitive' } } },
      { user: { email: { contains: q, mode: 'insensitive' } } },
      ...(digits.length >= 4 ? [{ user: { phone: { contains: digits } } }] : []),
    ];
    // Combine with the item filter (also an OR) rather than overwrite it
    if (where.OR) {
      where.AND = [{ OR: where.OR }, { OR: search }];
      delete where.OR;
    } else where.OR = search;
  }
  return where;
};

// GET /api/admin/payments?status=&kind=&item=&q=&from=&to=&offset=&limit=
// -> { summary, payments, total, offset, limit, items, cashfree: { enabled, mode } }
const listPayments = async (req, res) => {
  try {
    const where = whereOf(req.query);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || PAGE, 1), MAX_PAGE);
    const month = monthStartIST();

    const [rows, total, paidAll, paidMonth, byStatus, batches, series] = await Promise.all([
      prisma.payment.findMany({ where, include: INCLUDE, orderBy: { createdAt: 'desc' }, skip: offset, take: limit }),
      prisma.payment.count({ where }),
      prisma.payment.aggregate({ where: { status: 'paid' }, _sum: { amount: true }, _count: { _all: true } }),
      prisma.payment.aggregate({ where: { status: 'paid', paidAt: { gte: month } }, _sum: { amount: true }, _count: { _all: true } }),
      prisma.payment.groupBy({ by: ['status'], _count: { _all: true } }),
      // For the "Bought" filter: everything that has ever been paid for or tried
      prisma.batch.findMany({ where: { payments: { some: {} } }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
      prisma.testSeries.findMany({ where: { payments: { some: {} } }, select: { id: true, title: true }, orderBy: { title: 'asc' } }),
    ]);
    const count = (s) => (byStatus.find((g) => g.status === s) || { _count: { _all: 0 } })._count._all;

    res.json({
      summary: {
        revenue:      paidAll._sum.amount || 0,
        paid:         paidAll._count._all,
        monthRevenue: paidMonth._sum.amount || 0,
        monthPaid:    paidMonth._count._all,
        pending:      count('pending'),
        failed:       count('failed'),
        all:          byStatus.reduce((a, g) => a + g._count._all, 0),
      },
      payments: rows.map(publicPayment),
      total,
      offset,
      limit,
      items: [
        ...batches.map((b) => ({ id: b.id, kind: 'batch', name: b.name })),
        ...series.map((s) => ({ id: s.id, kind: 'series', name: s.title })),
      ],
      cashfree: { enabled: cashfree.isConfigured(), mode: cashfree.mode() },
    });
  } catch (error) {
    console.error('listPayments:', error);
    res.status(500).json({ error: 'Could not load payments' });
  }
};

// POST /api/admin/payments/:id/check — ask Cashfree for a pending order's real
// status. Grants the purchase only if Cashfree says it is PAID for the right
// amount (confirmOrder), exactly as the student's return page would have.
const checkPayment = async (req, res) => {
  try {
    const p = await prisma.payment.findUnique({ where: { id: req.params.id }, select: { orderId: true, status: true } });
    if (!p) return res.status(404).json({ error: 'Payment not found' });
    if (p.status === 'paid') {
      const fresh = await prisma.payment.findUnique({ where: { id: req.params.id }, include: INCLUDE });
      return res.json({ payment: publicPayment(fresh), orderStatus: 'PAID', changed: false });
    }
    if (!cashfree.isConfigured()) return res.status(503).json({ error: 'Cashfree is not configured on this server.' });
    const { orderStatus } = await confirmOrder(p.orderId);
    const fresh = await prisma.payment.findUnique({ where: { id: req.params.id }, include: INCLUDE });
    res.json({ payment: publicPayment(fresh), orderStatus, changed: fresh.status !== p.status });
  } catch (error) {
    if (error.expose) return res.status(error.status).json({ error: error.message });
    console.error('checkPayment:', cashfree.errorText(error));
    res.status(502).json({ error: "Couldn't reach Cashfree just now. Try again in a minute." });
  }
};

module.exports = { listPayments, checkPayment };
