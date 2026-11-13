const prisma   = require('../lib/prisma');
const cashfree = require('../services/cashfree');
const { confirmOrder } = require('../lib/purchases');
const { WITH_SUBSCRIPTION, publicSubscription } = require('../lib/publicUser');

// GET /api/payments/config — public: whether online payment is on, and which
// Cashfree environment the browser SDK should use.
const paymentConfig = (req, res) => {
  res.json({ enabled: cashfree.isConfigured(), mode: cashfree.mode() });
};

// POST /api/payments/verify { orderId } — the return page asks after Cashfree
// sends the student back. Cashfree is asked for the real status; the purchase is
// granted only if the order is PAID. Only the student who placed it may ask.
const verifyPayment = async (req, res) => {
  try {
    const orderId = String(req.body.orderId || '').trim();
    if (!orderId) return res.status(400).json({ error: 'orderId is required' });

    const own = await prisma.payment.findUnique({ where: { orderId }, select: { userId: true } });
    if (!own || own.userId !== req.user.id) return res.status(404).json({ error: 'Payment not found' });

    const { payment, paid, orderStatus } = await confirmOrder(orderId);

    // What the page needs to move on: the fresh subscription for a batch, the
    // series id for a series.
    let subscription = null;
    if (paid && payment.kind === 'batch') {
      const user = await prisma.user.findUnique({ where: { id: req.user.id }, include: WITH_SUBSCRIPTION });
      subscription = publicSubscription(user && user.subscription);
    }
    res.json({
      paid,
      status:   payment.status,      // "pending" | "paid" | "failed"
      orderStatus,                   // Cashfree's: ACTIVE (not paid yet) | PAID | EXPIRED | TERMINATED
      kind:     payment.kind,        // "batch" | "series"
      seriesId: payment.seriesId,
      amount:   payment.amount,
      subscription,
    });
  } catch (error) {
    if (error.expose) return res.status(error.status).json({ error: error.message });
    console.error('verifyPayment:', cashfree.errorText(error));
    res.status(502).json({ error: "We couldn't check your payment just now. Please try again." });
  }
};

// POST /api/payments/webhook — Cashfree posts order events here (public).
// The signature is checked first; even then the body is only used for the order
// id, and confirmOrder() asks Cashfree itself before granting anything.
const webhook = async (req, res) => {
  if (!cashfree.isConfigured()) return res.status(503).json({ error: 'Payments are not configured' });
  const ok = cashfree.verifyWebhookSignature(req.rawBody, req.get('x-webhook-signature'), req.get('x-webhook-timestamp'));
  if (!ok) return res.status(401).json({ error: 'Invalid webhook signature' });

  const orderId = req.body && req.body.data && req.body.data.order && req.body.data.order.order_id;
  if (!orderId) return res.json({ received: true });

  try {
    // Orders that aren't ours (the Cashfree account is shared with Studyverse) are ignored.
    const known = await prisma.payment.findUnique({ where: { orderId: String(orderId) }, select: { id: true } });
    if (known) await confirmOrder(String(orderId));
    res.json({ received: true });
  } catch (error) {
    // A 5xx makes Cashfree retry later, which is what we want for a passing hiccup.
    console.error('payments webhook:', cashfree.errorText(error));
    // Ours (unknown order, amount mismatch): retrying won't help, so 200. Anything
    // else (Cashfree or the database briefly down) is a 500 so Cashfree retries.
    res.status(error.expose ? 200 : 500).json({ received: true });
  }
};

module.exports = { paymentConfig, verifyPayment, webhook };
