// services/cashfree.js
// Thin wrapper around the Cashfree Payment Gateway (PG) REST API — the same
// integration Studyverse uses. Everything comes from environment variables:
//
//   CASHFREE_MODE        "TEST" = sandbox (sandbox.cashfree.com), anything else = PROD
//   CASHFREE_APP_ID      client id     (x-client-id)
//   CASHFREE_SECRET_KEY  client secret (x-client-secret) — also signs the webhooks
//
// Online payment is on whenever both keys are set; remove them to switch it off.
//
// Anything not set to TEST is treated as PROD, so live traffic is never sent to
// the sandbox by accident.

const crypto = require('crypto');
const axios  = require('axios');

const BASE_URLS   = { TEST: 'https://sandbox.cashfree.com', PROD: 'https://api.cashfree.com' };
const API_VERSION = '2022-09-01';

const mode    = () => (String(process.env.CASHFREE_MODE || '').toUpperCase() === 'TEST' ? 'TEST' : 'PROD');
const baseURL = () => BASE_URLS[mode()];

// Both keys are set, so students can pay online.
const isConfigured = () => !!(process.env.CASHFREE_APP_ID && process.env.CASHFREE_SECRET_KEY);

class CashfreeConfigError extends Error {}

const headers = () => {
  const appId     = process.env.CASHFREE_APP_ID;
  const secretKey = process.env.CASHFREE_SECRET_KEY;
  if (!appId || !secretKey) throw new CashfreeConfigError('CASHFREE_APP_ID / CASHFREE_SECRET_KEY are not set');
  // Sandbox keys against the live API (or the other way round) only ever fail
  // with a vague 401 — say what's wrong instead.
  if (mode() === 'PROD' && (appId.startsWith('TEST') || secretKey.startsWith('cfsk_ma_test'))) {
    throw new CashfreeConfigError('CASHFREE_MODE is PROD but the keys are sandbox (TEST) keys');
  }
  return {
    'x-client-id':     appId,
    'x-client-secret': secretKey,
    'x-api-version':   API_VERSION,
    'Content-Type':    'application/json',
  };
};

// Cashfree wants a 10-digit Indian mobile number; anything else is a 422 on
// order creation. Sign-up already requires one; this keeps the last 10 digits,
// with a placeholder only as a safety net so a bad number never blocks a payment.
const normalizePhone = (p) => {
  const digits = String(p || '').replace(/\D/g, '').slice(-10);
  return digits.length === 10 ? digits : '9999999999';
};

// Creates a PG order. Returns Cashfree's order ({ payment_session_id, order_status, … });
// the payment_session_id is what the browser SDK opens the checkout with.
// returnUrl / notifyUrl must be https for Cashfree, so a non-https one is left out.
const createOrder = async ({ orderId, amount, customer, note, returnUrl, notifyUrl }) => {
  const meta = {};
  if (returnUrl) meta.return_url = returnUrl;
  if (notifyUrl && notifyUrl.startsWith('https://')) meta.notify_url = notifyUrl;

  const body = {
    order_id:       orderId,
    order_amount:   amount,
    order_currency: 'INR',
    order_note:     note || '',
    customer_details: {
      customer_id:    String(customer.id).replace(/[^A-Za-z0-9_-]/g, ''),
      customer_name:  customer.name || 'Student',
      customer_email: customer.email || '',
      customer_phone: normalizePhone(customer.phone),
    },
    order_meta: meta,
  };
  const res = await axios.post(`${baseURL()}/pg/orders`, body, { headers: headers(), timeout: 15000 });
  return res.data;
};

// The authoritative state of an order — never trust the browser or a webhook body alone.
const getOrder = async (orderId) => {
  const res = await axios.get(`${baseURL()}/pg/orders/${encodeURIComponent(orderId)}`, { headers: headers(), timeout: 15000 });
  return res.data; // { order_id, order_status: "ACTIVE" | "PAID" | "EXPIRED" | "TERMINATED", order_amount, … }
};

// The successful payment of a paid order (for its cf_payment_id), or null.
const getSuccessfulPayment = async (orderId) => {
  try {
    const res = await axios.get(`${baseURL()}/pg/orders/${encodeURIComponent(orderId)}/payments`, { headers: headers(), timeout: 15000 });
    return (res.data || []).find((p) => p.payment_status === 'SUCCESS') || null;
  } catch {
    return null; // only used for the record; the order status is what counts
  }
};

const isPaid = (order) => String((order && order.order_status) || '').toUpperCase() === 'PAID';

// Webhooks are signed Base64(HMAC-SHA256(timestamp + rawBody, client secret)),
// sent in x-webhook-signature / x-webhook-timestamp.
const verifyWebhookSignature = (rawBody, signature, timestamp) => {
  const secret = process.env.CASHFREE_SECRET_KEY;
  if (!secret || !rawBody || !signature || !timestamp) return false;
  const expected = crypto.createHmac('sha256', secret).update(String(timestamp) + rawBody).digest('base64');
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

// Cashfree's own error message from an axios failure, for the server log.
const errorText = (err) =>
  (err && err.response && err.response.data && (err.response.data.message || JSON.stringify(err.response.data))) ||
  (err && err.message) ||
  String(err);

module.exports = {
  mode,
  isConfigured,
  createOrder,
  getOrder,
  getSuccessfulPayment,
  isPaid,
  verifyWebhookSignature,
  normalizePhone,
  errorText,
  CashfreeConfigError,
};
