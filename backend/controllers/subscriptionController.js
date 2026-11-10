const prisma = require('../lib/prisma');
const { publicBatch, publicSubscription } = require('../lib/publicUser');
const { examFamily } = require('../lib/access');
const { notify } = require('../lib/notify');

// Until Cashfree is wired in, MOCK_PAYMENTS=true activates a purchase straight
// away so the rest of the flow can be built and tested. Never in production.
const mockPayments = () => process.env.MOCK_PAYMENTS === 'true' && process.env.NODE_ENV !== 'production';

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
const subscribe = async (req, res) => {
  try {
    const found = await batchFor(req.user.id);
    if (!found) return res.status(400).json({ error: "There's no batch on sale for your exam and class yet. Please contact us." });
    const { batch, student } = found;

    const existing = await prisma.subscription.findUnique({ where: { userId: req.user.id }, include: { batch: true } });
    if (existing && existing.status === 'active') {
      return res.status(409).json({ error: `You already have the ${existing.batch.name} batch.`, subscription: publicSubscription(existing) });
    }

    const paid = mockPayments();
    const data = {
      batchId:     batch.id,
      amount:      batch.price,
      status:      paid ? 'active' : 'pending',
      activatedAt: paid ? new Date() : null,
      paymentRef:  paid ? 'mock' : null,
    };
    const sub = await prisma.subscription.upsert({
      where:   { userId: req.user.id },
      update:  data,
      create:  { userId: req.user.id, ...data },
      include: { batch: true },
    });

    if (!paid) {
      // REAL PAYMENTS: create a Cashfree order here and return its session id;
      // the payment webhook then sets status "active".
      return res.status(503).json({
        error: "Online payment isn't available yet. Please contact us to activate your batch.",
        subscription: publicSubscription(sub),
      });
    }
    // The admin's bell: a student just bought a batch.
    notify({
      type: 'purchase',
      text: 'New purchase: ' + (student && student.name ? student.name : 'Student') + ' · ' + batch.name + (batch.price ? ' · ₹' + batch.price : ''),
      view: 'students',
    });
    res.status(201).json({ message: 'Batch activated', subscription: publicSubscription(sub) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not start the purchase' });
  }
};

module.exports = { listBatches, getSubscription, subscribe };
