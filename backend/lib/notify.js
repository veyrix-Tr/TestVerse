// lib/notify.js — the one place that writes the admin's inbox.
// Fire-and-forget: a notification failing must never break the request that
// triggered it (the admin still sees the change in the page itself).
const prisma = require('./prisma');

const EXAM_LABEL = { neet: 'NEET', 'jee-main': 'JEE Main', 'jee-advanced': 'JEE Advanced' };

// type: what happened ("signup" | "purchase" | ...)
// text: one line as it should read in the bell dropdown
// view: sidebar view to open when the admin clicks it ("students", "dashboard", ...)
function notify({ type, text, view }) {
  if (!text) return;
  prisma.notification
    .create({ data: { type, text, view: view || null } })
    .then(() => {})
    .catch((e) => console.error('notify:', e.message));
}

module.exports = { notify, EXAM_LABEL };
