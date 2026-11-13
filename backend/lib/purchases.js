// lib/purchases.js — the one place a student is given what they bought.
//
// Two things can be bought, each a one-time payment:
//   kind "batch"  → their Subscription becomes "active"
//   kind "series" → their SeriesOrder for that series becomes "active"
//
// The flow with Cashfree:
//   1. startCheckout() writes a pending Payment row and creates the Cashfree
//      order; the browser opens Cashfree's checkout with its session id.
//   2. Cashfree sends the student back to /payment/return (which calls
//      POST /api/payments/verify) and also posts a webhook. Both end up in
//      confirmOrder(), which asks Cashfree for the order's real status and,
//      only when it is PAID for the right amount, grants the purchase.
//   3. Granting is claimed atomically on the Payment row, so the webhook and
//      the return page racing each other can never grant (or notify) twice.
//
// Free purchases (price 0) and MOCK_PAYMENTS=true (dev only, when Cashfree is
// not configured) grant at once through grantNow().

const crypto   = require('crypto');
const { Prisma } = require('@prisma/client');
const prisma   = require('./prisma');
const cashfree = require('../services/cashfree');
const { notify } = require('./notify');

// Dev-only stand-in for the gateway. Never in production.
const mockPayments = () => process.env.MOCK_PAYMENTS === 'true' && process.env.NODE_ENV !== 'production';

// How a priced purchase gets paid for right now: "cashfree" | "mock" | null (no way to pay).
const paymentMethod = () => (cashfree.isConfigured() ? 'cashfree' : mockPayments() ? 'mock' : null);

// An error whose message is meant for the student. `expose` tells it apart from
// library errors that also carry a `status` (axios sets one from Cashfree's reply).
const httpError = (status, message) => Object.assign(new Error(message), { status, expose: true });

// ── Granting ────────────────────────────────────────────────────────────────
//
// Every write that turns a row "active" (or "pending") is ONE SQL statement:
//   INSERT … ON CONFLICT DO UPDATE … WHERE status <> 'active'
// Postgres re-checks that WHERE on the locked row, so two requests racing (a
// double-click on Buy, or the webhook and the return page together) can never
// both win: exactly one gets 1 row back, the other 0. A check-then-upsert (or
// catching P2002, which would abort the surrounding transaction) can't promise that.

const nowUtc = Prisma.sql`(now() AT TIME ZONE 'UTC')`; // columns are timestamp(3) without time zone, UTC

// Upserts the student's row for this purchase to `status` unless it is already
// active. Returns true if it wrote, false if the student already has it.
async function writeIfNotActive(db, { kind, userId, batchId, seriesId, amount, ref, status }) {
  const activatedAt = status === 'active' ? nowUtc : Prisma.sql`NULL`;
  const n =
    kind === 'batch'
      ? await db.$executeRaw`
          INSERT INTO "Subscription" ("id", "userId", "batchId", "status", "amount", "paymentRef", "activatedAt", "createdAt", "updatedAt")
          VALUES (${crypto.randomUUID()}, ${userId}, ${batchId}, ${status}, ${amount}, ${ref}, ${activatedAt}, ${nowUtc}, ${nowUtc})
          ON CONFLICT ("userId") DO UPDATE SET
            "batchId" = EXCLUDED."batchId", "status" = EXCLUDED."status", "amount" = EXCLUDED."amount",
            "paymentRef" = EXCLUDED."paymentRef", "activatedAt" = EXCLUDED."activatedAt", "updatedAt" = EXCLUDED."updatedAt"
          WHERE "Subscription"."status" <> 'active'`
      : await db.$executeRaw`
          INSERT INTO "SeriesOrder" ("id", "userId", "seriesId", "status", "amount", "paymentRef", "activatedAt", "createdAt", "updatedAt")
          VALUES (${crypto.randomUUID()}, ${userId}, ${seriesId}, ${status}, ${amount}, ${ref}, ${activatedAt}, ${nowUtc}, ${nowUtc})
          ON CONFLICT ("userId", "seriesId") DO UPDATE SET
            "status" = EXCLUDED."status", "amount" = EXCLUDED."amount",
            "paymentRef" = EXCLUDED."paymentRef", "activatedAt" = EXCLUDED."activatedAt", "updatedAt" = EXCLUDED."updatedAt"
          WHERE "SeriesOrder"."status" <> 'active'`;
  return n === 1;
}

// Marks the purchase "pending" while the student is at Cashfree. Never turns an
// active purchase back to pending: returns false if it is already active.
const markPending = ({ kind, userId, batchId = null, seriesId = null, amount, ref }) =>
  writeIfNotActive(prisma, { kind, userId, batchId, seriesId, amount, ref, status: 'pending' });

// Activates the purchase. Returns what announce() needs:
//   { title } — granted now;
//   { title, duplicate: true } — the student already had it (for a confirmed
//     payment: a second payment for the same thing, which the admin should refund);
//   { title: null, orphan: true } — the batch/series was deleted before the
//     payment came in.
async function grant(db, { kind, userId, batchId, seriesId, amount, ref }) {
  const thing =
    kind === 'batch'
      ? batchId && (await db.batch.findUnique({ where: { id: batchId }, select: { name: true } }))
      : seriesId && (await db.testSeries.findUnique({ where: { id: seriesId }, select: { title: true } }));
  if (!thing) return { title: null, orphan: true };
  const title = thing.name || thing.title;
  const wrote = await writeIfNotActive(db, { kind, userId, batchId, seriesId, amount, ref, status: 'active' });
  return wrote ? { title } : { title, duplicate: true };
}

// The bells, after the purchase is committed. Awaited by callers (a Vercel
// function can be frozen once it has answered), but it never throws.
async function announce({ kind, userId, amount, orderId }, { title, duplicate, orphan }) {
  const student = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } }).catch(() => null);
  const who = (student && student.name) || 'Student';
  const rupees = amount ? ' · ₹' + amount : '';
  const adminView = kind === 'batch' ? 'students' : 'series';

  if (orphan || duplicate) {
    await notify({
      type: 'purchase',
      text: (orphan
        ? `Payment received for a deleted ${kind}: ${who}${rupees}`
        : `Duplicate payment: ${who} already had ${title}${rupees}`) + (orderId ? ` · order ${orderId} — refund it from Cashfree` : ''),
      view: adminView,
    });
    return;
  }

  await Promise.all([
    notify({ type: 'purchase', text: `New purchase: ${who} · ${title}${rupees}`, view: adminView }),
    notify(
      kind === 'batch'
        ? { type: 'purchase', text: `Your ${title} batch is active — start with Part Test 1.`, view: '/student/tests', userId }
        : { type: 'purchase', text: `Your ${title} series is unlocked — start with its first test.`, view: '/student/test-series', userId },
    ),
  ]);
}

// Free / mock purchase: grant straight away. ref is "free" or "mock".
// result.duplicate = a concurrent request granted it first (answer 409; nothing
// was charged, so there is nothing for the admin to refund and no bell).
async function grantNow({ kind, userId, batchId = null, seriesId = null, amount, ref }) {
  const result = await grant(prisma, { kind, userId, batchId, seriesId, amount, ref });
  if (!result.duplicate && !result.orphan) await announce({ kind, userId, amount }, result).catch(() => {});
  return result;
}

// ── Checkout ────────────────────────────────────────────────────────────────

const frontendOrigin = (req) => {
  const fromEnv = (process.env.FRONTEND_URL || '').replace(/\/+$/, '');
  if (fromEnv) return fromEnv;
  const origin = req.get('origin');
  return origin && /^https?:\/\/[^/]+$/.test(origin) ? origin : 'http://localhost:5173';
};

// This backend's own public origin, from the request (Vercel sets x-forwarded-proto),
// so the webhook URL sent with each order is always the deployment that made it.
const backendOrigin = (req) => {
  const proto = (req.get('x-forwarded-proto') || req.protocol || 'http').split(',')[0].trim();
  return `${proto}://${req.get('host')}`;
};

// Order ids: letters, digits, _ and -, at most 45 characters. "TVB_" / "TVS_"
// marks them as Testverse orders on a Cashfree account shared with Studyverse.
const newOrderId = (kind) =>
  `TV${kind === 'batch' ? 'B' : 'S'}_${Date.now().toString(36).toUpperCase()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

// Starts a Cashfree checkout. Returns { orderId, paymentSessionId, mode }.
async function startCheckout(req, { kind, userId, amount, batchId = null, seriesId = null, note }) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true, phone: true } });
  if (!user) throw httpError(404, 'Account not found');

  // Live Cashfree rejects a non-https return URL ("url should be https"), so a
  // local frontend (http://localhost) can only pay with sandbox keys.
  const returnBase = frontendOrigin(req);
  if (cashfree.mode() === 'PROD' && !returnBase.startsWith('https://')) {
    console.error(`Cashfree: live mode needs an https frontend, got ${returnBase}. Set FRONTEND_URL to the https site, or use CASHFREE_MODE=TEST with sandbox keys locally.`);
    throw httpError(503, "Online payment isn't available on this site right now. Please contact us.");
  }

  const orderId = newOrderId(kind);
  const payment = await prisma.payment.create({ data: { orderId, kind, userId, batchId, seriesId, amount } });

  try {
    const order = await cashfree.createOrder({
      orderId,
      amount,
      customer:  { id: userId, name: user.name, email: user.email, phone: user.phone },
      note,
      returnUrl: `${returnBase}/payment/return?order_id=${orderId}`,
      notifyUrl: `${backendOrigin(req)}/api/payments/webhook`,
    });
    if (!order || !order.payment_session_id) throw new Error('Cashfree returned no payment session');
    return { orderId, paymentSessionId: order.payment_session_id, mode: cashfree.mode() };
  } catch (err) {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: 'failed' } }).catch(() => {});
    console.error('Cashfree createOrder failed:', cashfree.errorText(err));
    throw httpError(502, "We couldn't open the payment page right now. Please try again in a minute.");
  }
}

// ── Confirmation ────────────────────────────────────────────────────────────

// Checks an order with Cashfree and grants it if paid. Safe to call any number
// of times, from anywhere. Returns { payment, paid, orderStatus }.
async function confirmOrder(orderId) {
  const payment = await prisma.payment.findUnique({ where: { orderId } });
  if (!payment) throw httpError(404, 'Payment not found');
  if (payment.status === 'paid') return { payment, paid: true, orderStatus: 'PAID' };

  const order = await cashfree.getOrder(orderId);
  const orderStatus = String(order.order_status || '').toUpperCase();

  if (!cashfree.isPaid(order)) {
    if ((orderStatus === 'EXPIRED' || orderStatus === 'TERMINATED') && payment.status === 'pending') {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: 'failed' } });
    }
    return { payment, paid: false, orderStatus };
  }

  // Paid — but only for exactly what we asked. Anything else needs a human.
  if (Number(order.order_amount) !== payment.amount || String(order.order_currency || 'INR') !== 'INR') {
    console.error(`Cashfree order ${orderId}: paid ${order.order_amount} ${order.order_currency}, expected ${payment.amount} INR`);
    await notify({ type: 'purchase', text: `Payment amount mismatch on order ${orderId} — check it in Cashfree`, view: 'students' });
    throw httpError(409, 'This payment needs a manual check. Please contact us.');
  }

  const cfPayment = await cashfree.getSuccessfulPayment(orderId);
  const result = await prisma.$transaction(async (tx) => {
    // Claim it: only the first caller to flip it to "paid" grants.
    const claimed = await tx.$executeRaw`
      UPDATE "Payment"
      SET "status" = 'paid', "paidAt" = ${nowUtc}, "updatedAt" = ${nowUtc},
          "cfPaymentId" = ${cfPayment ? String(cfPayment.cf_payment_id) : null}
      WHERE "id" = ${payment.id} AND "status" <> 'paid'`;
    if (claimed !== 1) return null;
    return grant(tx, { ...payment, ref: orderId });
  }, { timeout: 15000 }); // a remote database (Supabase) can be slower than Prisma's 5s default
  if (result) await announce(payment, result).catch(() => {});

  const fresh = await prisma.payment.findUnique({ where: { id: payment.id } });
  return { payment: fresh, paid: true, orderStatus };
}

module.exports = { paymentMethod, mockPayments, grantNow, markPending, startCheckout, confirmOrder, httpError };
