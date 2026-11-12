// lib/notify.js — the one place that writes notification inboxes.
// Fire-and-forget: a notification failing must never break the request that
// triggered it (the user still sees the change in the page itself).
//
//   userId omitted -> the ADMIN's bell (sidebar, Admin.jsx AdminBell)
//   userId given   -> that STUDENT's bell (StudentHome StudentBell)
const prisma = require('./prisma');

const EXAM_LABEL = { neet: 'NEET', 'jee-main': 'JEE Main', 'jee-advanced': 'JEE Advanced' };

// type: what happened ("signup" | "purchase" | "welcome" | "test" | ...)
// text: one line as it should read in the bell
// view: where clicking opens — admin: sidebar view ("students"); student: route ("/student/tests")
// userId: the student it belongs to; omit for the admin inbox
function notify({ type, text, view, userId }) {
  if (!text) return;
  prisma.notification
    .create({ data: { type, text, view: view || null, userId: userId || null } })
    .then(() => {})
    .catch((e) => console.error('notify:', e.message));
}

// Same event to several students at once (a new test going live).
// Silent on failure, capped so one publish can never flood the table.
async function notifyMany(userIds, { type, text, view }) {
  const ids = [...new Set(userIds.filter(Boolean))].slice(0, 500);
  if (!text || !ids.length) return;
  try {
    await prisma.notification.createMany({
      data: ids.map((userId) => ({ type, text, view: view || null, userId })),
      skipDuplicates: true,
    });
  } catch (e) {
    console.error('notifyMany:', e.message);
  }
}

module.exports = { notify, notifyMany, EXAM_LABEL };
