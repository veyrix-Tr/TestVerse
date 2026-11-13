const prisma = require('../lib/prisma');
const { publicBatch, publicSubscription } = require('../lib/publicUser');
const { examFamily } = require('../lib/access');
const { paymentMethod, startCheckout, grantNow, markPending } = require('../lib/purchases');

// A student's batch follows from the exam and class they gave at sign-up:
// JEE Main / JEE Advanced + "Class 11" -> "11th JEE", and so on.

const batchFor = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, exam: true, grade: true } });
  const exam = examFamily(user && user.exam);
  if (!exam || !user.grade) return null;
  const batch = await prisma.batch.findFirst({ where: { exam, grade: user.grade, isActive: true } });
  return batch ? { batch, student: user } : null;
};

// GET /api/batches — batches on sale (public)
const listBatches = async (req, res) => {
  try {
    const batches = await prisma.batch.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
    res.json({ batches: batches.map(publicBatch) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not load batches' });
  }
};

// GET /api/subscription — the signed-in student's purchase (or null) and the
// batch their profile puts them in (or null if none is on sale for it)
const getSubscription = async (req, res) => {
  try {
    const sub   = await prisma.subscription.findUnique({ where: { userId: req.user.id }, include: { batch: true } });
    const found = await batchFor(req.user.id);
    const batch = found && found.batch;
    res.json({ subscription: publicSubscription(sub), batch: batch ? publicBatch(batch) : null });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

// POST /api/subscription — no body. Starts the one-time purchase of the batch
// the student's exam + class put them in (never a batch the client names).
// A student holds one batch only: an active purchase can't be changed.
//
// Answers one of:
//   201 { subscription }                  — activated now (free batch, or MOCK_PAYMENTS in dev)
//   200 { checkout: { orderId, paymentSessionId, mode }, subscription }
//                                          — open Cashfree's checkout; /payment/return
//                                            (or the webhook) activates it once paid
//   503                                    — no way to pay online right now
const subscribe = async (req, res) => {
  try {
    const found = await batchFor(req.user.id);
    if (!found) return res.status(400).json({ error: "There's no batch on sale for your exam and class yet. Please contact us." });
    const { batch } = found;

    const existing = await prisma.subscription.findUnique({ where: { userId: req.user.id }, include: { batch: true } });
    if (existing && existing.status === 'active') {
      return res.status(409).json({ error: `You already have the ${existing.batch.name} batch.`, subscription: publicSubscription(existing) });
    }

    const free   = batch.price === 0;
    const method = free ? 'free' : paymentMethod();
    if (!method) {
      return res.status(503).json({ error: "Online payment isn't available right now. Please contact us to activate your batch." });
    }
    if (method === 'cashfree' && !(batch.price > 0)) {
      return res.status(400).json({ error: "This batch's price hasn't been announced yet. Please contact us." });
    }

    if (method === 'cashfree') {
      const checkout = await startCheckout(req, {
        kind:    'batch',
        userId:  req.user.id,
        amount:  batch.price,
        batchId: batch.id,
        note:    `Testverse ${batch.name} batch`,
      });
      // The pending row is what the admin sees as "payment pending". It never
      // overwrites an active batch (e.g. another tab's payment landing meanwhile).
      const wrote = await markPending({ kind: 'batch', userId: req.user.id, batchId: batch.id, amount: batch.price, ref: checkout.orderId });
      const sub = await prisma.subscription.findUnique({ where: { userId: req.user.id }, include: { batch: true } });
      if (!wrote) return res.status(409).json({ error: `You already have the ${sub.batch.name} batch.`, subscription: publicSubscription(sub) });
      return res.json({ checkout, subscription: publicSubscription(sub) });
    }

    // Free, or MOCK_PAYMENTS in dev
    const granted = await grantNow({ kind: 'batch', userId: req.user.id, batchId: batch.id, amount: batch.price, ref: method });
    if (granted.orphan) return res.status(400).json({ error: "There's no batch on sale for your exam and class yet. Please contact us." });
    const sub = await prisma.subscription.findUnique({ where: { userId: req.user.id }, include: { batch: true } });
    // Lost a race with a concurrent request (double-click): it was activated once, by that one
    if (granted.duplicate) return res.status(409).json({ error: `You already have the ${sub.batch.name} batch.`, subscription: publicSubscription(sub) });
    res.status(201).json({ message: 'Batch activated', subscription: publicSubscription(sub) });
  } catch (error) {
    if (error.expose) return res.status(error.status).json({ error: error.message });
    console.error(error);
    res.status(500).json({ error: 'Could not start the purchase' });
  }
};

module.exports = { listBatches, getSubscription, subscribe };
