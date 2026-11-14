/*
  The admin's sidebar router (ported from design/admin.html's script).
  React owns the shell (sidebar and an empty <main id="view">) and renders every
  section as a React screen beside #view; this module only keeps the sidebar,
  the URL hash and Admin.jsx (through onView) in step. Mounted by Admin.jsx.
*/
'use strict';

var onView = null; // Admin.jsx: told which view is showing

var $ = function (s, el) { return (el || document).querySelector(s); };
var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };

/* ---------- router ---------- */
var ui = { view: 'dashboard' };
// Every section is a React screen (Admin.jsx renders it while its view is
// active), so #view itself stays empty:
//   dashboard <AdminDashboard/> · notifications <AdminNotifications/> ·
//   free, live <TestsAdmin/> · series <SeriesAdmin/> · students <StudentsAdmin/> ·
//   payments <PaymentsAdmin/> · website <WebsiteAdmin/> · requests: coming soon.
// (There is no Analysis section: each student's analysis report goes to them by email.)
var VIEWS = ['dashboard', 'notifications', 'free', 'live', 'series', 'requests', 'students', 'payments', 'website'];

function go(view) {
  if (view === 'tests') view = 'free'; // the old single "Tests" section
  ui.view = VIEWS.indexOf(view) >= 0 ? view : 'dashboard';
  $$('.side [data-view]').forEach(function (b) { b.setAttribute('aria-current', b.dataset.view === ui.view ? 'page' : 'false'); });
  if (location.hash.slice(1) !== ui.view) { try { history.replaceState(null, '', '#' + ui.view); } catch { /* not allowed in some previews */ } }
  if (onView) onView(ui.view);
}

/* ---------- mount (called by Admin.jsx once the shell is in the DOM) ----------
   Sidebar buttons are bound once per element so React StrictMode's double
   effect doesn't attach duplicate listeners. */
function once(el, fn) {
  if (!el || el.__tvBound) return;
  el.__tvBound = true;
  el.addEventListener('click', fn);
}
export default function mountAdmin(el, opts) {
  onView = (opts && opts.onView) || null;
  $$('.side [data-view]').forEach(function (b) {
    once(b, function () { go(b.dataset.view); $('#view').focus(); });
  });
  var startView = 'dashboard';
  try { startView = location.hash.slice(1) || 'dashboard'; } catch { /* ignore */ }
  go(startView);
}
