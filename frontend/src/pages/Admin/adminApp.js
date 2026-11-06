/*
  design/admin.html <script> — ported as-is into a module.
  React only owns the static shell (sidebar, empty #view, the two dialogs);
  everything the design did with innerHTML + addEventListener happens here,
  mounted by Admin.jsx's useEffect. The one change: toasts are appended to the
  page root (".tv-admin") instead of <body>, so the page's scoped CSS matches.

  REAL APP: every save() below becomes an authenticated API call, and the same
  data is what the website and student app read from the server.
*/
'use strict';

var root = null;
var dlgForm = null,
  onSave = null;
var dlgTest = null,
  wz = null;

/* ======================================================================
   DEMO DATA. In the real app all of this lives on the server (e.g. Firebase),
   only signed-in admins can change it, and the website and student app read
   from the same place, so a change here shows up everywhere.
   ====================================================================== */
var STORE_KEY = 'sv-admin-demo-v3';
function seed() {
  return {
    exams: {
      'neet': { label: 'NEET', questions: 180, minutes: 180, marks: 720, correct: 4, wrong: -1, sections: 'Physics, Chemistry, Botany, Zoology', partQuestions: 90, partMinutes: 90, price: 999, onSale: true },
      'jee-main': { label: 'JEE Main', questions: 75, minutes: 180, marks: 300, correct: 4, wrong: -1, sections: 'Physics, Chemistry, Mathematics', partQuestions: 45, partMinutes: 90, price: 999, onSale: true },
      'jee-advanced': { label: 'JEE Advanced', questions: 108, minutes: 360, marks: 360, correct: 4, wrong: -1, sections: 'Paper 1: Physics, Chemistry, Mathematics; Paper 2: same', partQuestions: 54, partMinutes: 180, price: 1199, onSale: false }
    },
    tests: [
      t('neet', 'part', 1, 'Units, Kinematics, Laws of Motion; Some Basic Concepts, Structure of Atom; Cell, Biomolecules', 'published'),
      t('neet', 'part', 2, 'Work Energy Power, Rotational Motion; Classification, Chemical Bonding; Plant Kingdom, Animal Kingdom', 'published'),
      t('neet', 'part', 3, 'Gravitation, Properties of Matter; States of Matter, Thermodynamics; Morphology, Anatomy', 'published'),
      t('neet', 'part', 4, 'Thermodynamics, KTG, Oscillations; Equilibrium, Redox; Cell Cycle, Transport', 'draft'),
      t('neet', 'half', 1, 'Class 11 Physics, Chemistry, Biology', 'published'),
      t('jee-main', 'part', 1, 'Kinematics, NLM; Mole Concept, Atomic Structure; Sets, Quadratics', 'published'),
      t('jee-main', 'part', 2, 'WPE, Rotation; Bonding, Thermodynamics; Sequences, Trigonometry', 'draft'),
      { id: 'L1', exam: 'neet', kind: 'live', slot: null, title: 'NEET Full Syllabus Live Test', chapters: 'Full syllabus', questions: 180, minutes: 180, status: 'scheduled', start: '2026-11-01T14:00', window: 30, resultAt: '2026-11-01T20:00', file: 'neet-live-01.docx', missing: 0 },
      { id: 'L2', exam: 'jee-main', kind: 'live', slot: null, title: 'JEE Main Full Syllabus Live Test', chapters: 'Full syllabus', questions: 75, minutes: 180, status: 'scheduled', start: '2026-11-08T09:00', window: 30, resultAt: '2026-11-08T18:00', file: 'jee-main-live-01.docx', missing: 0 },
      { id: 'A1', exam: 'neet', kind: 'assigned', slot: null, title: 'Organic Chemistry Revision Test', chapters: 'GOC, Hydrocarbons', questions: 30, minutes: 45, status: 'published', file: 'organic-revision-riya.docx', missing: 0, audience: { type: 'students', groupIds: [], studentIds: ['S1'] }, opens: '2026-11-02T08:00', due: '2026-11-05T22:00' },
      { id: 'A2', exam: 'neet', kind: 'assigned', slot: null, title: 'Weekly Batch Test 1', chapters: 'Laws of Motion, Chemical Bonding, Cell', questions: 45, minutes: 60, status: 'draft', file: 'batch-week-1.docx', missing: 0, audience: { type: 'groups', groupIds: ['G1'], studentIds: [] }, opens: '2026-11-07T18:00', due: '' },
      { id: 'L3', exam: 'neet', kind: 'live', slot: null, title: 'NEET Half Syllabus Live Test', chapters: 'Class 11', questions: 180, minutes: 180, status: 'draft', start: '2026-11-15T14:00', window: 30, resultAt: '2026-11-15T20:00', file: '', missing: 0 }
    ],
    coupons: [
      { code: 'LAUNCH20', type: 'percent', value: 20, exam: 'all', expires: '2026-12-31', limit: 500, used: 132, active: true },
      { code: 'RANKER100', type: 'flat', value: 100, exam: 'neet', expires: '2026-11-30', limit: 200, used: 41, active: true },
      { code: 'DIWALI25', type: 'percent', value: 25, exam: 'all', expires: '2026-11-03', limit: 1000, used: 388, active: false }
    ],
    referral: { enabled: true, friendDiscount: 100, referrerCredit: 100, maxPerStudent: 20 },
    students: [
      { id: 'S1', name: 'Riya Sharma', phone: '98xxxxxx10', exam: 'neet', city: 'Jodhpur', lms: true, bought: true, tests: 5, credits: 150, joined: '2026-10-12' },
      { id: 'S2', name: 'Aarav Mehta', phone: '97xxxxxx44', exam: 'jee-main', city: 'Jaipur', lms: true, bought: true, tests: 2, credits: 0, joined: '2026-10-15' },
      { id: 'S3', name: 'Sana Khan', phone: '99xxxxxx02', exam: 'neet', city: 'Kota', lms: false, bought: false, tests: 0, credits: 0, joined: '2026-10-20' },
      { id: 'S4', name: 'Kabir Singh', phone: '96xxxxxx71', exam: 'jee-advanced', city: 'Bikaner', lms: false, bought: true, tests: 1, credits: 200, joined: '2026-10-22' },
      { id: 'S5', name: 'Priya Choudhary', phone: '95xxxxxx38', exam: 'neet', city: 'Jodhpur', lms: true, bought: true, tests: 4, credits: 0, joined: '2026-10-09' },
      { id: 'S6', name: 'Arjun Rathore', phone: '94xxxxxx56', exam: 'neet', city: 'Pali', lms: true, bought: true, tests: 3, credits: 50, joined: '2026-10-11' },
      { id: 'S7', name: 'Ishaan Verma', phone: '93xxxxxx27', exam: 'jee-main', city: 'Jodhpur', lms: true, bought: true, tests: 2, credits: 0, joined: '2026-10-14' }
    ],
    groups: [
      { id: 'G1', name: 'NEET 2027 course batch', studentIds: ['S1', 'S5', 'S6'] },
      { id: 'G2', name: 'JEE Main course batch', studentIds: ['S2', 'S7'] }
    ],
    video: {
      channel: 'https://www.youtube.com/@[your-channel]',
      playlists: { 'neet': '', 'jee-main': '', 'jee-advanced': '' },
      limitDirect: 3, limitLms: 10, hours: 48
    },
    requests: [
      { id: 'R1', status: 'new', exam: 'neet', subject: 'Physics', chapter: 'Rotational Motion', source: 'test', ref: 'NEET Part Test 2, Q.14', text: 'A solid sphere rolls without slipping down an incline of angle 30°. Find its acceleration.', note: 'Why do we take friction upward here?', askers: [{ id: 'S1', name: 'Riya Sharma', at: '2026-10-30T19:12' }, { id: 'S5', name: 'Priya Choudhary', at: '2026-10-30T21:40' }, { id: 'S6', name: 'Arjun Rathore', at: '2026-10-31T08:05' }], link: '', reason: '' },
      { id: 'R2', status: 'new', exam: 'neet', subject: 'Chemistry', chapter: 'Chemical Equilibrium', source: 'photo', ref: 'Photo from a book', text: 'For the reaction N₂ + 3H₂ ⇌ 2NH₃, Kp at 500 K is … (read from photo)', note: 'Step 2 is unclear', askers: [{ id: 'S3', name: 'Sana Khan', at: '2026-10-31T10:22' }], link: '', reason: '' },
      { id: 'R3', status: 'progress', exam: 'jee-main', subject: 'Mathematics', chapter: 'Definite Integration', source: 'photo', ref: 'Photo from a coaching sheet', text: 'Evaluate ∫₀^π x sin x / (1 + cos² x) dx', note: '', askers: [{ id: 'S2', name: 'Aarav Mehta', at: '2026-10-29T17:00' }, { id: 'S7', name: 'Ishaan Verma', at: '2026-10-30T09:15' }], link: '', reason: '' },
      { id: 'R4', status: 'done', exam: 'neet', subject: 'Biology', chapter: 'Cell Cycle', source: 'test', ref: 'NEET Part Test 4, Q.131', text: 'Which stage of meiosis shows terminalisation of chiasmata?', note: '', askers: [{ id: 'S5', name: 'Priya Choudhary', at: '2026-10-27T20:30' }], link: 'https://youtu.be/[video-id]', reason: '' },
      { id: 'R5', status: 'declined', exam: 'neet', subject: 'Physics', chapter: '—', source: 'photo', ref: 'Photo', text: '(Photo too blurry to read)', note: '', askers: [{ id: 'S6', name: 'Arjun Rathore', at: '2026-10-28T11:00' }], link: '', reason: 'The photo is too blurry. Please send a clearer picture.' }
    ],
    website: {
      announcement: 'Next NEET live test on Sunday, 1 November at 2:00 PM. Register free.',
      showAnnouncement: true,
      faqs: [
        { q: 'How much does it cost?', a: '₹999 per exam for all 11 tests.' },
        { q: 'Can I use a coupon or referral code?', a: 'Yes. Enter one code at checkout. Credits can be used on top.' },
        { q: 'What if I miss a live test?', a: 'You can take it later for a practice score. It won’t count towards the all-India rank.' }
      ]
    }
  };
  function t(exam, kind, slot, chapters, status) {
    var full = kind !== 'part';
    var label = { part: 'Part Test', half: 'Half Syllabus Test', full: 'Full Syllabus Test' }[kind];
    var q = exam === 'neet' ? (full ? 180 : 90) : (exam === 'jee-main' ? (full ? 75 : 45) : 54);
    var m = exam === 'neet' ? (full ? 180 : 90) : (full ? 180 : 90);
    return { id: exam + '-' + kind + '-' + slot, exam: exam, kind: kind, slot: slot, title: label + ' ' + slot, chapters: chapters, questions: q, minutes: m, status: status, file: exam + '-' + kind + '-' + slot + '.docx', missing: status === 'draft' ? 3 : 0 };
  }
}

var db;
function load() { try { db = JSON.parse(localStorage.getItem(STORE_KEY)); } catch (e) { db = null; } if (!db || !db.exams || !db.groups || !db.requests) db = seed(); }
function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); } catch (e) {} }
load();

/* ---------- helpers ---------- */
var $ = function (s, el) { return (el || document).querySelector(s); };
var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function rupee(n) { return '₹' + Number(n || 0).toLocaleString('en-IN'); }
function when(iso) {
  if (!iso) return '—';
  var d = new Date(iso);
  if (isNaN(d)) return '—';
  return d.toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}
function examLabel(id) { return id === 'all' ? 'All exams' : (db.exams[id] ? db.exams[id].label : id); }
var KIND = { part: 'Part test', half: 'Half syllabus', full: 'Full syllabus', live: 'Live test', assigned: 'Assigned test' };
function studentById(id) { return db.students.filter(function (s) { return s.id === id; })[0]; }
function groupById(id) { return db.groups.filter(function (g) { return g.id === id; })[0]; }
function audienceText(x) {
  var ex = examLabel(x.exam);
  if (x.kind === 'live') return 'All ' + ex + ' students';
  if (x.kind !== 'assigned') return ex + ' series buyers';
  var a = x.audience || { type: 'all' };
  if (a.type === 'groups') {
    var names = (a.groupIds || []).map(function (id) { var g = groupById(id); return g ? g.name : null; }).filter(Boolean);
    return names.length ? 'Group: ' + names.join(', ') : 'No group chosen';
  }
  if (a.type === 'students') {
    var st = (a.studentIds || []).map(function (id) { var s = studentById(id); return s ? s.name : null; }).filter(Boolean);
    if (!st.length) return 'No student chosen';
    return st.length === 1 ? st[0] : st.length + ' students';
  }
  return 'All ' + ex + ' students';
}
function audienceCount(x) {
  if (x.kind !== 'assigned') return null;
  var a = x.audience || { type: 'all' }, ids = {};
  if (a.type === 'groups') (a.groupIds || []).forEach(function (g) { var gg = groupById(g); if (gg) gg.studentIds.forEach(function (s) { ids[s] = 1; }); });
  else if (a.type === 'students') (a.studentIds || []).forEach(function (s) { ids[s] = 1; });
  else db.students.forEach(function (s) { if (s.exam === x.exam) ids[s.id] = 1; });
  return Object.keys(ids).length;
}
var SLOTS = { part: 6, half: 3, full: 2 };
function statusPill(s) {
  var map = { published: ['p-published', 'Published'], scheduled: ['p-scheduled', 'Scheduled'], draft: ['p-draft', 'Draft'] };
  var m = map[s] || ['p-draft', s];
  return '<span class="pill ' + m[0] + '">' + m[1] + '</span>';
}
function toast(msg) {
  var t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
  (root || document.body).appendChild(t); setTimeout(function () { t.remove(); }, 2600);
}
function examOptions(sel, withAll) {
  var o = withAll ? '<option value="all"' + (sel === 'all' ? ' selected' : '') + '>All exams</option>' : '';
  Object.keys(db.exams).forEach(function (k) { o += '<option value="' + k + '"' + (sel === k ? ' selected' : '') + '>' + esc(db.exams[k].label) + '</option>'; });
  return o;
}
function nextFreeSlot(exam, kind) {
  if (!SLOTS[kind]) return null;
  for (var i = 1; i <= SLOTS[kind]; i++) {
    if (!db.tests.some(function (x) { return x.exam === exam && x.kind === kind && x.slot === i; })) return i;
  }
  return null;
}

/* ---------- router ---------- */
var ui = { view: 'dashboard', testExam: 'all', testKind: 'all', seriesExam: 'neet', studentQ: '' };
var VIEWS = {};
function go(view) {
  ui.view = VIEWS[view] ? view : 'dashboard';
  $$('.side [data-view]').forEach(function (b) { b.setAttribute('aria-current', b.dataset.view === ui.view ? 'page' : 'false'); });
  if (location.hash.slice(1) !== ui.view) { try { history.replaceState(null, '', '#' + ui.view); } catch (e) { /* not allowed in some previews */ } }
  render();
}
function render() {
  $('[data-count="tests"]').textContent = db.tests.length;
  var openReq = db.requests.filter(function (r) { return r.status === 'new' || r.status === 'progress'; }).length;
  var rc = $('[data-count="requests"]'); rc.textContent = openReq; rc.hidden = !openReq;
  $('#view').innerHTML = VIEWS[ui.view]();
  bind[ui.view] && bind[ui.view]();
}

var bind = {};

/* ---------- Dashboard ---------- */
VIEWS.dashboard = function () {
  var now = Date.now();
  var upcoming = db.tests.filter(function (x) { return x.kind === 'live' && new Date(x.start).getTime() > now; }).sort(function (a, b) { return new Date(a.start) - new Date(b.start); });
  var published = db.tests.filter(function (x) { return x.status !== 'draft'; }).length;
  var alerts = [];
  var overdue = db.requests.filter(function (r) { return (r.status === 'new' || r.status === 'progress') && hoursSince(r.askers[0].at) > db.video.hours; }).length;
  var newReq = db.requests.filter(function (r) { return r.status === 'new'; }).length;
  if (overdue) alerts.push(['a-err', overdue + ' video request' + (overdue === 1 ? ' is' : 's are') + ' past the ' + db.video.hours + '-hour promise.', 'requests']);
  else if (newReq) alerts.push(['a-info', newReq + ' new video request' + (newReq === 1 ? '' : 's') + ' waiting.', 'requests']);
  Object.keys(db.exams).forEach(function (k) {
    var filled = db.tests.filter(function (x) { return x.exam === k && x.kind !== 'live' && x.status === 'published'; }).length;
    if (filled < 11) alerts.push(['a-warn', db.exams[k].label + ' test series: ' + filled + ' of 11 tests published.', 'series']);
  });
  db.tests.forEach(function (x) {
    if (x.missing) alerts.push(['a-warn', examLabel(x.exam) + ' ' + x.title + ': ' + x.missing + ' questions have no answer key.', 'tests']);
    if (x.kind === 'live' && !x.file) alerts.push(['a-err', examLabel(x.exam) + ' live test on ' + when(x.start) + ' has no test file yet.', 'live']);
  });
  return '<div class="head"><div><h1>Dashboard</h1><p>What needs attention before your next test.</p></div>' +
    '<div class="actions"><button class="btn btn-primary" type="button" data-upload>Upload a test</button></div></div>' +
    '<div class="grid g4" style="margin-bottom: 16px">' +
    stat(published, 'tests live or scheduled') + stat(upcoming.length, 'upcoming live tests') +
    stat(db.students.filter(function (s) { return s.bought; }).length, 'students who bought (demo)') +
    stat(db.coupons.filter(function (c) { return c.active; }).length, 'active coupons') + '</div>' +
    '<div class="grid g2">' +
    '<section class="card"><h2>Needs attention</h2>' + (alerts.length ? alerts.map(function (a) { return '<div class="alert ' + a[0] + '"><span style="flex: 1">' + esc(a[1]) + '</span><button class="btn btn-outline btn-sm" type="button" data-goto="' + a[2] + '">Fix</button></div>'; }).join('') : '<div class="alert a-ok">Everything is ready.</div>') + '</section>' +
    '<section class="card"><h2>Upcoming live tests</h2>' + (upcoming.length ? upcoming.slice(0, 4).map(function (x) {
      return '<div style="display: flex; justify-content: space-between; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--line)"><div><b>' + esc(x.title) + '</b><span class="hint" style="display: block; margin: 0">' + esc(examLabel(x.exam)) + ' · ' + when(x.start) + '</span></div><button class="btn btn-outline btn-sm" type="button" data-edit-live="' + esc(x.id) + '">Change date</button></div>';
    }).join('') : '<p class="hint">No live tests scheduled.</p>') + '</section></div>';
  function stat(n, l) { return '<div class="card stat"><b>' + n + '</b><span>' + l + '</span></div>'; }
};
bind.dashboard = function () {
  $$('[data-goto]').forEach(function (b) { b.addEventListener('click', function () { go(b.dataset.goto); }); });
  $$('[data-edit-live]').forEach(function (b) { b.addEventListener('click', function () { editLive(b.dataset.editLive); }); });
  bindUpload();
};

/* ---------- Tests ---------- */
VIEWS.tests = function () {
  var list = db.tests.filter(function (x) {
    return (ui.testExam === 'all' || x.exam === ui.testExam) && (ui.testKind === 'all' || x.kind === ui.testKind);
  });
  return '<div class="head"><div><h1>Tests</h1><p>Every test paper: part, half, full syllabus and live.</p></div>' +
    '<div class="actions"><button class="btn btn-primary" type="button" data-upload>Upload a test</button></div></div>' +
    '<div class="filters">' + seg('exam', ['all'].concat(Object.keys(db.exams)), ui.testExam, examLabel) + seg('kind', ['all', 'part', 'half', 'full', 'live', 'assigned'], ui.testKind, function (k) { return k === 'all' ? 'All types' : KIND[k]; }) + '</div>' +
    '<div class="table-wrap"><table><thead><tr><th>Test</th><th>Exam</th><th>Type</th><th>Given to</th><th>Questions</th><th>Duration</th><th>Status</th><th><span class="sr" style="position: absolute; left: -9999px">Actions</span></th></tr></thead><tbody>' +
    (list.length ? list.map(function (x) {
      return '<tr><td><b>' + esc(x.title) + '</b><span class="sub">' + esc(x.chapters) + '</span>' + (x.missing ? '<span class="pill p-warn" style="margin-top: 4px">' + x.missing + ' answers missing</span>' : '') + '</td>' +
        '<td>' + esc(examLabel(x.exam)) + '</td><td>' + KIND[x.kind] + (x.kind === 'live' ? '<span class="sub">' + when(x.start) + '</span>' : '') + (x.kind === 'assigned' && x.due ? '<span class="sub">Due ' + when(x.due) + '</span>' : '') + '</td>' +
        '<td>' + esc(audienceText(x)) + (audienceCount(x) != null ? '<span class="sub">' + audienceCount(x) + ' student' + (audienceCount(x) === 1 ? '' : 's') + '</span>' : '') + '</td>' +
        '<td>' + x.questions + '</td><td>' + x.minutes + ' min</td><td>' + statusPill(x.status) + '</td>' +
        '<td><div class="row-actions"><button class="btn btn-outline btn-sm" type="button" data-edit="' + esc(x.id) + '">Edit</button>' +
        (x.status === 'draft' ? '<button class="btn btn-dark btn-sm" type="button" data-publish="' + esc(x.id) + '">' + (x.kind === 'live' ? 'Schedule' : 'Publish') + '</button>' : '<button class="btn btn-outline btn-sm" type="button" data-unpublish="' + esc(x.id) + '">Unpublish</button>') +
        '<button class="btn btn-danger btn-sm" type="button" data-del="' + esc(x.id) + '" aria-label="Delete ' + esc(x.title) + '">Delete</button></div></td></tr>';
    }).join('') : '<tr><td colspan="8" class="hint">No tests match these filters.</td></tr>') +
    '</tbody></table></div>';
  function seg(name, vals, cur, lab) {
    return '<div class="seg" role="group" aria-label="Filter by ' + name + '">' + vals.map(function (v) { return '<button type="button" data-f-' + name + '="' + v + '" aria-pressed="' + (v === cur) + '">' + esc(lab(v)) + '</button>'; }).join('') + '</div>';
  }
};
bind.tests = function () {
  bindUpload();
  $$('[data-f-exam]').forEach(function (b) { b.addEventListener('click', function () { ui.testExam = b.dataset.fExam; render(); }); });
  $$('[data-f-kind]').forEach(function (b) { b.addEventListener('click', function () { ui.testKind = b.dataset.fKind; render(); }); });
  $$('[data-edit]').forEach(function (b) { b.addEventListener('click', function () { openTestDialog(b.dataset.edit); }); });
  $$('[data-publish]').forEach(function (b) { b.addEventListener('click', function () { setStatus(b.dataset.publish, true); }); });
  $$('[data-unpublish]').forEach(function (b) { b.addEventListener('click', function () { setStatus(b.dataset.unpublish, false); }); });
  $$('[data-del]').forEach(function (b) {
    b.addEventListener('click', function () {
      var x = find(b.dataset.del);
      if (!confirm('Delete "' + x.title + '" (' + examLabel(x.exam) + ')? Students who already took it keep their results.')) return;
      db.tests = db.tests.filter(function (y) { return y.id !== x.id; }); save(); render(); toast('Test deleted');
    });
  });
};
function find(id) { return db.tests.filter(function (x) { return x.id === id; })[0]; }
function setStatus(id, on) {
  var x = find(id);
  if (on) {
    if (!x.file) { toast('Upload the test file first'); return; }
    if (x.missing) { toast('Add the ' + x.missing + ' missing answers first'); return; }
    x.status = x.kind === 'live' ? 'scheduled' : 'published';
  } else x.status = 'draft';
  save(); render(); toast(on ? (x.kind === 'live' ? 'Live test scheduled' : 'Test published') : 'Moved back to draft');
}

/* ---------- Live tests ---------- */
VIEWS.live = function () {
  var list = db.tests.filter(function (x) { return x.kind === 'live'; }).sort(function (a, b) { return new Date(a.start) - new Date(b.start); });
  return '<div class="head"><div><h1>Live tests</h1><p>All-India tests at a fixed time. The next one shows on the website countdown automatically.</p></div>' +
    '<div class="actions"><button class="btn btn-primary" type="button" data-upload="live">Add a live test</button></div></div>' +
    '<div class="table-wrap"><table><thead><tr><th>Date and time</th><th>Test</th><th>Entry window</th><th>Rank published</th><th>Status</th><th></th></tr></thead><tbody>' +
    (list.length ? list.map(function (x) {
      var past = new Date(x.start).getTime() < Date.now();
      return '<tr><td><b>' + when(x.start) + '</b>' + (past ? '<span class="sub">Finished</span>' : '') + '</td>' +
        '<td>' + esc(x.title) + '<span class="sub">' + esc(examLabel(x.exam)) + ' · ' + x.questions + ' questions, ' + x.minutes + ' min</span>' + (!x.file ? '<span class="pill p-off" style="margin-top: 4px">No test file</span>' : '') + '</td>' +
        '<td>' + x.window + ' min</td><td>' + when(x.resultAt) + '</td><td>' + statusPill(x.status) + '</td>' +
        '<td><div class="row-actions"><button class="btn btn-outline btn-sm" type="button" data-edit-live="' + esc(x.id) + '">Change date</button><button class="btn btn-outline btn-sm" type="button" data-edit="' + esc(x.id) + '">Edit test</button></div></td></tr>';
    }).join('') : '<tr><td colspan="6" class="hint">No live tests yet.</td></tr>') + '</tbody></table></div>' +
    '<p class="hint" style="margin-top: 12px">Moving a live test? Registered students get an SMS and app notification with the new time once you save.</p>';
};
bind.live = function () {
  bindUpload();
  $$('[data-edit-live]').forEach(function (b) { b.addEventListener('click', function () { editLive(b.dataset.editLive); }); });
  $$('[data-edit]').forEach(function (b) { b.addEventListener('click', function () { openTestDialog(b.dataset.edit); }); });
};
function editLive(id) {
  var x = find(id);
  formDialog('Change date: ' + x.title,
    '<div class="form">' +
    field('Start date and time', '<input class="input" type="datetime-local" id="lv-start" value="' + esc(x.start) + '">') +
    field('Entry window (minutes)', '<input class="input" type="number" min="0" max="180" id="lv-window" value="' + x.window + '">', 'Students must start within this time to count for the rank.') +
    field('Rank published at', '<input class="input" type="datetime-local" id="lv-result" value="' + esc(x.resultAt) + '">') +
    '<div class="full"><label class="check"><input type="checkbox" id="lv-notify" checked> Notify registered students about the change</label></div></div>',
    function () {
      var s = $('#lv-start').value, r = $('#lv-result').value;
      if (!s) return 'Choose a start date and time.';
      if (r && new Date(r) <= new Date(s)) return 'The rank must be published after the test starts.';
      x.start = s; x.window = Number($('#lv-window').value) || 0; x.resultAt = r;
      save(); render(); toast('Live test moved to ' + when(s) + ($('#lv-notify').checked ? '. Students notified.' : ''));
    });
}

/* ---------- Test series ---------- */
VIEWS.series = function () {
  var ex = db.exams[ui.seriesExam];
  var tests = db.tests.filter(function (x) { return x.exam === ui.seriesExam && x.kind !== 'live'; });
  var filled = tests.filter(function (x) { return x.status === 'published'; }).length;
  function stage(kind, title) {
    var n = SLOTS[kind], out = '';
    for (var i = 1; i <= n; i++) {
      var x = tests.filter(function (y) { return y.kind === kind && y.slot === i; })[0];
      out += x
        ? '<div class="slot"><div style="display: flex; justify-content: space-between; gap: 8px"><b>' + esc(x.title) + '</b>' + statusPill(x.status) + '</div><span class="hint" style="margin: 0">' + esc(x.chapters) + '</span><div><button class="btn btn-outline btn-sm" type="button" data-edit="' + esc(x.id) + '">Edit</button></div></div>'
        : '<div class="slot empty"><b>' + KIND[kind] + ' ' + i + '</b><span class="hint" style="margin: 0">Empty</span><div><button class="btn btn-primary btn-sm" type="button" data-upload-slot="' + kind + ':' + i + '">Upload</button></div></div>';
    }
    return '<div class="stage"><h3>' + title + ' (' + n + ')</h3><div class="slots s' + n + '">' + out + '</div></div>';
  }
  return '<div class="head"><div><h1>Test series</h1><p>The 11-test plan for each exam: 6 part, 3 half-syllabus, 2 full-syllabus.</p></div></div>' +
    '<div class="filters"><div class="seg" role="group" aria-label="Exam">' + Object.keys(db.exams).map(function (k) { return '<button type="button" data-sx="' + k + '" aria-pressed="' + (k === ui.seriesExam) + '">' + esc(db.exams[k].label) + '</button>'; }).join('') + '</div></div>' +
    '<div class="grid" style="grid-template-columns: minmax(0, 1fr) 320px; align-items: start">' +
    '<section class="card">' + stage('part', 'Part tests') + stage('half', 'Half-syllabus tests') + stage('full', 'Full-syllabus tests') + '</section>' +
    '<section class="card"><h2>Sale settings</h2>' +
    '<div class="alert ' + (filled === 11 ? 'a-ok' : 'a-warn') + '" style="margin-bottom: 14px">' + filled + ' of 11 tests published.</div>' +
    '<div style="display: grid; gap: 12px">' +
    field('Price (₹)', '<input class="input" type="number" min="0" id="sr-price" value="' + ex.price + '">') +
    '<label class="check"><input type="checkbox" id="sr-sale"' + (ex.onSale ? ' checked' : '') + '> On sale on the website</label>' +
    '<p class="hint" style="margin: 0">Students who buy get every test in the series as soon as it\u2019s published, including ones you add later.</p>' +
    '<button class="btn btn-primary" type="button" id="sr-save">Save</button></div></section></div>';
};
bind.series = function () {
  $$('[data-sx]').forEach(function (b) { b.addEventListener('click', function () { ui.seriesExam = b.dataset.sx; render(); }); });
  $$('[data-edit]').forEach(function (b) { b.addEventListener('click', function () { openTestDialog(b.dataset.edit); }); });
  $$('[data-upload-slot]').forEach(function (b) {
    b.addEventListener('click', function () { var p = b.dataset.uploadSlot.split(':'); openTestDialog(null, { exam: ui.seriesExam, kind: p[0], slot: Number(p[1]) }); });
  });
  $('#sr-save').addEventListener('click', function () {
    var ex = db.exams[ui.seriesExam], price = Number($('#sr-price').value);
    if (!(price >= 0)) { toast('Enter a valid price'); return; }
    ex.price = price; ex.onSale = $('#sr-sale').checked; save(); render(); toast(ex.label + ' series saved');
  });
};

/* ---------- Exams & patterns ---------- */
VIEWS.exams = function () {
  return '<div class="head"><div><h1>Exams &amp; patterns</h1><p>Used as defaults for new tests, on the website and in the CBT screen. Check against the official notice each year.</p></div></div>' +
    '<div class="grid g3">' + Object.keys(db.exams).map(function (k) {
      var e = db.exams[k];
      return '<section class="card"><h2>' + esc(e.label) + '</h2><div style="display: grid; gap: 12px">' +
        num(k, 'questions', 'Questions (full paper)', e.questions) + num(k, 'minutes', 'Duration (minutes)', e.minutes) + num(k, 'marks', 'Total marks', e.marks) +
        '<div class="grid g2" style="gap: 10px">' + num(k, 'correct', 'Marks for correct', e.correct) + num(k, 'wrong', 'Marks for wrong', e.wrong) + '</div>' +
        field('Subjects / sections', '<input class="input" data-ek="' + k + '" data-f="sections" value="' + esc(e.sections) + '">') +
        '<div class="grid g2" style="gap: 10px">' + num(k, 'partQuestions', 'Part test questions', e.partQuestions) + num(k, 'partMinutes', 'Part test minutes', e.partMinutes) + '</div>' +
        '<button class="btn btn-primary" type="button" data-save-exam="' + k + '">Save ' + esc(e.label) + '</button></div></section>';
    }).join('') + '</div>' +
    '<p class="hint" style="margin-top: 12px">JEE Advanced changes its sections and partial marking most years, so tests can override these defaults.</p>';
  function num(k, f, l, v) { return field(l, '<input class="input" type="number" data-ek="' + k + '" data-f="' + f + '" value="' + v + '">'); }
};
bind.exams = function () {
  $$('[data-save-exam]').forEach(function (b) {
    b.addEventListener('click', function () {
      var k = b.dataset.saveExam, e = db.exams[k];
      $$('[data-ek="' + k + '"]').forEach(function (inp) { e[inp.dataset.f] = inp.type === 'number' ? Number(inp.value) : inp.value.trim(); });
      save(); toast(e.label + ' pattern saved');
    });
  });
};

/* ---------- Coupons & referrals ---------- */
VIEWS.offers = function () {
  var r = db.referral;
  return '<div class="head"><div><h1>Coupons &amp; referrals</h1><p>Promotions applied at checkout. One code per order; credits can be used on top.</p></div>' +
    '<div class="actions"><button class="btn btn-primary" type="button" id="new-coupon">New coupon</button></div></div>' +
    '<div class="table-wrap" style="margin-bottom: 18px"><table><thead><tr><th>Code</th><th>Discount</th><th>Exam</th><th>Expires</th><th>Used</th><th>Status</th><th></th></tr></thead><tbody>' +
    db.coupons.map(function (c, i) {
      var expired = new Date(c.expires + 'T23:59:59') < new Date();
      var st = !c.active ? '<span class="pill p-off">Off</span>' : (expired ? '<span class="pill p-draft">Expired</span>' : (c.used >= c.limit ? '<span class="pill p-warn">Limit reached</span>' : '<span class="pill p-published">Active</span>'));
      return '<tr><td><b style="font-family: monospace; font-size: 15px">' + esc(c.code) + '</b></td><td>' + (c.type === 'percent' ? c.value + '% off' : rupee(c.value) + ' off') + '</td><td>' + esc(examLabel(c.exam)) + '</td><td>' + esc(c.expires) + '</td><td>' + c.used + ' / ' + c.limit + '</td><td>' + st + '</td>' +
        '<td><div class="row-actions"><button class="btn btn-outline btn-sm" type="button" data-cp-edit="' + i + '">Edit</button><button class="btn btn-outline btn-sm" type="button" data-cp-toggle="' + i + '">' + (c.active ? 'Turn off' : 'Turn on') + '</button></div></td></tr>';
    }).join('') + '</tbody></table></div>' +
    '<div class="grid g2">' +
    '<section class="card"><h2>Referral programme</h2><div style="display: grid; gap: 12px">' +
    '<label class="check"><input type="checkbox" id="rf-on"' + (r.enabled ? ' checked' : '') + '> Referrals on</label>' +
    field('Friend\u2019s discount (₹)', '<input class="input" type="number" min="0" id="rf-disc" value="' + r.friendDiscount + '">') +
    field('Credits to the student who referred (₹)', '<input class="input" type="number" min="0" id="rf-credit" value="' + r.referrerCredit + '">', 'Given only after the friend\u2019s payment succeeds.') +
    field('Most referrals rewarded per student', '<input class="input" type="number" min="0" id="rf-max" value="' + r.maxPerStudent + '">') +
    '<button class="btn btn-primary" type="button" id="rf-save">Save referral settings</button></div></section>' +
    '<section class="card"><h2>Adjust a student\u2019s credits</h2><div style="display: grid; gap: 12px">' +
    field('Student mobile number', '<input class="input" id="cr-phone" inputmode="tel" placeholder="10-digit mobile">') +
    field('Amount (₹, use minus to remove)', '<input class="input" type="number" id="cr-amt" placeholder="e.g. 200 or -50">') +
    field('Reason (shown to the student)', '<input class="input" id="cr-reason" placeholder="e.g. Top 100 in live test">') +
    '<button class="btn btn-primary" type="button" id="cr-save">Add credits</button></div></section></div>';
};
bind.offers = function () {
  $('#new-coupon').addEventListener('click', function () { couponDialog(-1); });
  $$('[data-cp-edit]').forEach(function (b) { b.addEventListener('click', function () { couponDialog(Number(b.dataset.cpEdit)); }); });
  $$('[data-cp-toggle]').forEach(function (b) { b.addEventListener('click', function () { var c = db.coupons[Number(b.dataset.cpToggle)]; c.active = !c.active; save(); render(); toast(c.code + (c.active ? ' turned on' : ' turned off')); }); });
  $('#rf-save').addEventListener('click', function () {
    db.referral = { enabled: $('#rf-on').checked, friendDiscount: Number($('#rf-disc').value) || 0, referrerCredit: Number($('#rf-credit').value) || 0, maxPerStudent: Number($('#rf-max').value) || 0 };
    save(); toast('Referral settings saved');
  });
  $('#cr-save').addEventListener('click', function () {
    var phone = $('#cr-phone').value.replace(/\D/g, ''), amt = Number($('#cr-amt').value), reason = $('#cr-reason').value.trim();
    if (phone.length < 10) { toast('Enter a 10-digit mobile number'); return; }
    if (!amt) { toast('Enter an amount'); return; }
    if (!reason) { toast('Add a reason'); return; }
    toast((amt > 0 ? rupee(amt) + ' added to ' : rupee(-amt) + ' removed from ') + phone + "'s credits");
    $('#cr-phone').value = $('#cr-amt').value = $('#cr-reason').value = '';
  });
};
function couponDialog(i) {
  var c = i >= 0 ? db.coupons[i] : { code: '', type: 'percent', value: 10, exam: 'all', expires: '', limit: 100, used: 0, active: true };
  formDialog(i >= 0 ? 'Edit coupon ' + c.code : 'New coupon',
    '<div class="form">' +
    field('Code', '<input class="input" id="cp-code" value="' + esc(c.code) + '" style="text-transform: uppercase" placeholder="e.g. NEET50"' + (i >= 0 ? ' readonly' : '') + '>', i >= 0 ? 'Codes can\u2019t be renamed once used.' : 'Letters and numbers only.') +
    field('Applies to', '<select class="input" id="cp-exam">' + examOptions(c.exam, true) + '</select>') +
    field('Discount type', '<select class="input" id="cp-type"><option value="percent"' + (c.type === 'percent' ? ' selected' : '') + '>Percent off</option><option value="flat"' + (c.type === 'flat' ? ' selected' : '') + '>Rupees off</option></select>') +
    field('Discount value', '<input class="input" type="number" min="1" id="cp-value" value="' + c.value + '">') +
    field('Expires on', '<input class="input" type="date" id="cp-exp" value="' + esc(c.expires) + '">') +
    field('Usage limit (total)', '<input class="input" type="number" min="1" id="cp-limit" value="' + c.limit + '">') +
    '</div>',
    function () {
      var code = $('#cp-code').value.trim().toUpperCase(), type = $('#cp-type').value, value = Number($('#cp-value').value), exp = $('#cp-exp').value;
      if (!/^[A-Z0-9]{3,20}$/.test(code)) return 'Use 3–20 letters and numbers for the code.';
      if (i < 0 && db.coupons.some(function (x) { return x.code === code; })) return 'That code already exists.';
      if (!(value > 0) || (type === 'percent' && value > 100)) return 'Enter a discount between 1 and 100%, or a rupee amount.';
      if (!exp) return 'Choose an expiry date.';
      var n = { code: code, type: type, value: value, exam: $('#cp-exam').value, expires: exp, limit: Number($('#cp-limit').value) || 1, used: c.used, active: c.active };
      if (i >= 0) db.coupons[i] = n; else db.coupons.unshift(n);
      save(); render(); toast('Coupon ' + code + ' saved');
    });
}

/* ---------- Video requests ---------- */
function hoursSince(iso) { return (Date.now() - new Date(iso).getTime()) / 36e5; }
var REQ_STATUS = { 'new': ['p-warn', 'New'], progress: ['p-scheduled', 'Recording'], done: ['p-published', 'Sent'], declined: ['p-draft', 'Declined'] };
ui.reqStatus = 'open';
VIEWS.requests = function () {
  var list = db.requests.filter(function (r) {
    if (ui.reqStatus === 'open') return r.status === 'new' || r.status === 'progress';
    return ui.reqStatus === 'all' || r.status === ui.reqStatus;
  }).sort(function (a, b) { return b.askers.length - a.askers.length || new Date(a.askers[0].at) - new Date(b.askers[0].at); });
  var v = db.video;
  return '<div class="head"><div><h1>Video requests</h1><p>Students ask for a video solution on a test question or a photo. Most-asked first.</p></div>' +
    '<div class="actions"><button class="btn btn-outline" type="button" id="vr-settings">Request rules</button></div></div>' +
    '<div class="filters"><div class="seg" role="group" aria-label="Status">' +
    [['open', 'Open'], ['new', 'New'], ['progress', 'Recording'], ['done', 'Sent'], ['declined', 'Declined'], ['all', 'All']].map(function (o) {
      return '<button type="button" data-rs="' + o[0] + '" aria-pressed="' + (ui.reqStatus === o[0]) + '">' + o[1] + '</button>';
    }).join('') + '</div><span class="hint" style="margin: 0">Promise to students: within ' + v.hours + ' hours · ' + v.limitDirect + ' requests a week (direct), ' + v.limitLms + ' (course students)</span></div>' +
    (list.length ? '<div style="display: grid; gap: 12px">' + list.map(function (r) {
      var age = hoursSince(r.askers[0].at), late = (r.status === 'new' || r.status === 'progress') && age > v.hours;
      var st = REQ_STATUS[r.status];
      return '<article class="card" style="display: grid; grid-template-columns: 96px minmax(0, 1fr); gap: 16px; align-items: start">' +
        '<div aria-hidden="true" style="width: 96px; height: 96px; border-radius: 10px; background: var(--soft); border: 1px solid var(--line); display: grid; place-items: center; text-align: center; font-size: 12px; color: var(--muted); padding: 6px">' + (r.source === 'photo' ? 'Student\u2019s photo' : 'From a test') + '</div>' +
        '<div style="display: grid; gap: 8px; min-width: 0">' +
        '<div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center"><span class="pill ' + st[0] + '">' + st[1] + '</span>' +
        (r.askers.length > 1 ? '<span class="pill p-scheduled">' + r.askers.length + ' students asked</span>' : '') +
        (late ? '<span class="pill p-off">Past ' + v.hours + ' h</span>' : '') +
        '<span class="hint" style="margin: 0">' + esc(examLabel(r.exam)) + ' · ' + esc(r.subject) + ' · ' + esc(r.chapter) + ' · ' + esc(r.ref) + '</span></div>' +
        '<div style="font-size: 15px">' + esc(r.text) + '</div>' +
        (r.source === 'photo' ? '<div class="hint" style="margin: 0">Text and chapter read from the photo by Claude. Check before recording.</div>' : '') +
        (r.note ? '<div style="font-size: 14px; background: var(--soft); border-radius: 8px; padding: 8px 10px">Student\u2019s note: ' + esc(r.note) + '</div>' : '') +
        '<div class="hint" style="margin: 0">Asked by ' + esc(r.askers.map(function (a) { return a.name; }).join(', ')) + ' · first ' + when(r.askers[0].at) + '</div>' +
        (r.status === 'done' ? '<div style="font-size: 14px">Sent: <a href="' + esc(r.link) + '" target="_blank" rel="noopener">' + esc(r.link) + '</a></div>' : '') +
        (r.status === 'declined' ? '<div style="font-size: 14px">Reason sent: ' + esc(r.reason) + '</div>' : '') +
        '<div class="actions">' +
        (r.status === 'new' ? '<button class="btn btn-outline btn-sm" type="button" data-r-start="' + r.id + '">Start recording</button>' : '') +
        (r.status === 'new' || r.status === 'progress' ? '<button class="btn btn-primary btn-sm" type="button" data-r-send="' + r.id + '">Add YouTube link &amp; send</button><button class="btn btn-danger btn-sm" type="button" data-r-decline="' + r.id + '">Decline</button>' : '') +
        (r.status === 'done' ? '<button class="btn btn-outline btn-sm" type="button" data-r-send="' + r.id + '">Change link</button>' : '') +
        '</div></div></article>';
    }).join('') + '</div>' : '<div class="card"><p class="hint" style="margin: 0">No requests here.</p></div>');
};
bind.requests = function () {
  $$('[data-rs]').forEach(function (b) { b.addEventListener('click', function () { ui.reqStatus = b.dataset.rs; render(); }); });
  var req = function (id) { return db.requests.filter(function (r) { return r.id === id; })[0]; };
  $$('[data-r-start]').forEach(function (b) { b.addEventListener('click', function () { req(b.dataset.rStart).status = 'progress'; save(); render(); toast('Marked as recording'); }); });
  $$('[data-r-send]').forEach(function (b) {
    b.addEventListener('click', function () {
      var r = req(b.dataset.rSend);
      formDialog('Send video solution',
        '<p style="font-size: 15px">' + esc(r.text) + '</p>' +
        field('YouTube link', '<input class="input" id="r-link" type="url" placeholder="https://youtu.be/..." value="' + esc(r.link) + '">', 'Paste the link of the video you uploaded.') +
        '<label class="check"><input type="checkbox" id="r-notify" checked> Notify ' + (r.askers.length === 1 ? esc(r.askers[0].name) : 'all ' + r.askers.length + ' students') + ' in the app and on WhatsApp</label>',
        function () {
          var link = $('#r-link').value.trim();
          if (!/^https:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\//i.test(link)) return 'Paste a YouTube link starting with https://youtube.com or https://youtu.be';
          var notify = $('#r-notify').checked;
          r.link = link; r.status = 'done'; save(); render();
          toast('Video link saved' + (notify ? ' and sent to ' + r.askers.length + ' student' + (r.askers.length === 1 ? '' : 's') : ''));
        });
    });
  });
  $$('[data-r-decline]').forEach(function (b) {
    b.addEventListener('click', function () {
      var r = req(b.dataset.rDecline);
      formDialog('Decline request',
        field('Reason (sent to the student)', '<select class="input" id="r-why"><option>The photo is too blurry. Please send a clearer picture.</option><option>This question is outside the NEET/JEE syllabus.</option><option>A video for this is already on our YouTube channel. Search the chapter playlist.</option><option>Part of the question is missing in the photo.</option></select>'),
        function () { r.reason = $('#r-why').value; r.status = 'declined'; save(); render(); toast('Request declined. The student was told why, and it doesn\u2019t count towards their weekly limit.'); });
    });
  });
  $('#vr-settings').addEventListener('click', function () {
    var v = db.video;
    formDialog('Video request rules',
      '<div class="form">' +
      field('Requests per week, direct students', '<input class="input" type="number" min="0" id="v-ld" value="' + v.limitDirect + '">') +
      field('Requests per week, course (LMS) students', '<input class="input" type="number" min="0" id="v-ll" value="' + v.limitLms + '">') +
      field('Promised reply time (hours)', '<input class="input" type="number" min="1" id="v-h" value="' + v.hours + '">', 'Shown to students when they send a request.') +
      '</div>',
      function () {
        v.limitDirect = Number($('#v-ld').value) || 0; v.limitLms = Number($('#v-ll').value) || 0; v.hours = Number($('#v-h').value) || 48;
        save(); render(); toast('Request rules saved');
      });
  });
};

/* ---------- Students ---------- */
VIEWS.students = function () {
  var q = ui.studentQ.toLowerCase();
  var list = db.students.filter(function (s) { return !q || (s.name + ' ' + s.phone + ' ' + s.city).toLowerCase().indexOf(q) >= 0; });
  return '<div class="head"><div><h1>Students &amp; groups</h1><p>Everyone who signed up, from the website or the LMS link. Groups let you send a test to many students at once.</p></div>' +
    '<div class="actions"><button class="btn btn-primary" type="button" id="new-group">New group</button><button class="btn btn-outline" type="button" id="export">Export CSV</button></div></div>' +
    '<section class="card" style="margin-bottom: 16px"><h2>Groups</h2>' +
    (db.groups.length ? '<div style="display: grid; gap: 8px">' + db.groups.map(function (g, i) {
      return '<div style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: space-between; align-items: center; border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px">' +
        '<div><b>' + esc(g.name) + '</b><span class="hint" style="display: block; margin: 0">' + g.studentIds.length + ' students: ' + esc(g.studentIds.map(function (id) { var s = studentById(id); return s ? s.name : ''; }).filter(Boolean).join(', ')) + '</span></div>' +
        '<div class="row-actions"><button class="btn btn-outline btn-sm" type="button" data-g-edit="' + i + '">Edit</button><button class="btn btn-danger btn-sm" type="button" data-g-del="' + i + '">Delete</button></div></div>';
    }).join('') + '</div>' : '<p class="hint">No groups yet.</p>') + '</section>' +
    '<div class="filters"><label class="l" for="sq" style="position: absolute; left: -9999px">Search students</label><input class="input" id="sq" style="max-width: 360px" placeholder="Search name, mobile or city" value="' + esc(ui.studentQ) + '"></div>' +
    '<div class="table-wrap"><table><thead><tr><th>Student</th><th>Exam</th><th>City</th><th>Type</th><th>Test series</th><th>Tests taken</th><th>Credits</th><th>Joined</th></tr></thead><tbody>' +
    (list.length ? list.map(function (s) {
      return '<tr><td><b>' + esc(s.name) + '</b><span class="sub">' + esc(s.phone) + '</span></td><td>' + esc(examLabel(s.exam)) + '</td><td>' + esc(s.city) + '</td><td>' + (s.lms ? '<span class="pill p-scheduled">LMS</span>' : '<span class="pill p-draft">Direct</span>') + '</td><td>' + (s.bought ? '<span class="pill p-published">Bought</span>' : '<span class="pill p-draft">Not bought</span>') + '</td><td>' + s.tests + '</td><td>' + rupee(s.credits) + '</td><td>' + esc(s.joined) + '</td></tr>';
    }).join('') : '<tr><td colspan="8" class="hint">No students match.</td></tr>') + '</tbody></table></div>' +
    '<p class="hint" style="margin-top: 12px">Sample students for the demo. Mobile numbers are partly hidden for staff who don\u2019t need them.</p>';
};
bind.students = function () {
  $('#new-group').addEventListener('click', function () { groupDialog(-1); });
  $$('[data-g-edit]').forEach(function (b) { b.addEventListener('click', function () { groupDialog(Number(b.dataset.gEdit)); }); });
  $$('[data-g-del]').forEach(function (b) {
    b.addEventListener('click', function () {
      var g = db.groups[Number(b.dataset.gDel)];
      var used = db.tests.some(function (t) { return t.audience && t.audience.type === 'groups' && t.audience.groupIds.indexOf(g.id) >= 0; });
      if (!confirm('Delete group "' + g.name + '"?' + (used ? ' Tests already given to this group stay with those students.' : ''))) return;
      db.groups.splice(Number(b.dataset.gDel), 1); save(); render(); toast('Group deleted');
    });
  });
  var inp = $('#sq');
  inp.addEventListener('input', function () { ui.studentQ = inp.value; var pos = inp.selectionStart; render(); var n = $('#sq'); n.focus(); n.setSelectionRange(pos, pos); });
  $('#export').addEventListener('click', function () {
    var rows = [['Name', 'Mobile', 'Exam', 'City', 'Type', 'Bought', 'Tests taken', 'Credits', 'Joined']].concat(db.students.map(function (s) { return [s.name, s.phone, examLabel(s.exam), s.city, s.lms ? 'LMS' : 'Direct', s.bought ? 'Yes' : 'No', s.tests, s.credits, s.joined]; }));
    var csv = rows.map(function (r) { return r.map(function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'students.csv'; a.click();
  });
};

function groupDialog(i) {
  var g = i >= 0 ? db.groups[i] : { id: 'G' + Date.now(), name: '', studentIds: [] };
  var lms = db.students.filter(function (s) { return s.lms; });
  formDialog(i >= 0 ? 'Edit group' : 'New group',
    field('Group name', '<input class="input" id="g-name" value="' + esc(g.name) + '" placeholder="e.g. NEET 2027 course batch">') +
    '<div><label class="l" for="g-q">Students (Studyverse course students)</label><input class="input" id="g-q" placeholder="Search" style="margin-bottom: 8px">' +
    '<div style="max-height: 260px; overflow-y: auto; border: 1px solid var(--line); border-radius: 8px; padding: 6px 10px">' +
    lms.map(function (s) {
      return '<label class="check" data-gs-row="' + esc((s.name + ' ' + s.city + ' ' + s.phone).toLowerCase()) + '" style="padding: 6px 0"><input type="checkbox" data-gs value="' + s.id + '"' + (g.studentIds.indexOf(s.id) >= 0 ? ' checked' : '') + '> ' + esc(s.name) + ' <span class="hint" style="margin: 0">· ' + esc(examLabel(s.exam)) + ', ' + esc(s.city) + '</span></label>';
    }).join('') + '</div></div>',
    function () {
      var name = $('#g-name').value.trim(), ids = $$('[data-gs]:checked').map(function (c) { return c.value; });
      if (!name) return 'Give the group a name.';
      if (!ids.length) return 'Add at least one student.';
      var n = { id: g.id, name: name, studentIds: ids };
      if (i >= 0) db.groups[i] = n; else db.groups.push(n);
      save(); render(); toast('Group "' + name + '" saved');
    });
  var q = $('#g-q');
  q.addEventListener('input', function () { var v = q.value.trim().toLowerCase(); $$('[data-gs-row]').forEach(function (r) { r.hidden = v && r.dataset.gsRow.indexOf(v) < 0; }); });
}

/* ---------- Website info ---------- */
VIEWS.website = function () {
  var w = db.website;
  var nextLive = db.tests.filter(function (x) { return x.kind === 'live' && x.status === 'scheduled' && new Date(x.start) > new Date(); }).sort(function (a, b) { return new Date(a.start) - new Date(b.start); })[0];
  return '<div class="head"><div><h1>Website info</h1><p>Text on the homepage. Prices, test plans and live test dates update automatically from the other sections.</p></div></div>' +
    '<div class="grid g2" style="align-items: start">' +
    '<section class="card"><h2>Announcement strip</h2><div style="display: grid; gap: 12px">' +
    '<label class="check"><input type="checkbox" id="ws-on"' + (w.showAnnouncement ? ' checked' : '') + '> Show at the top of the homepage</label>' +
    field('Text', '<textarea class="input" id="ws-text" maxlength="160">' + esc(w.announcement) + '</textarea>', 'Keep it under 160 characters.') +
    '<button class="btn btn-primary" type="button" id="ws-save">Save</button></div></section>' +
    '<section class="card"><h2>YouTube video library</h2><div style="display: grid; gap: 12px">' +
    '<p class="hint" style="margin: 0">Students see a "Video library" button in the app and on the website that opens your channel. Add playlists to send each exam\u2019s students to the right videos.</p>' +
    field('Channel link', '<input class="input" type="url" id="yt-ch" value="' + esc(db.video.channel) + '">') +
    Object.keys(db.exams).map(function (k) { return field(db.exams[k].label + ' playlist (optional)', '<input class="input" type="url" id="yt-' + k + '" placeholder="https://www.youtube.com/playlist?list=..." value="' + esc(db.video.playlists[k] || '') + '">'); }).join('') +
    '<button class="btn btn-primary" type="button" id="yt-save">Save video library links</button></div></section>' +
    '<section class="card"><h2>Shown automatically</h2><div class="summary-list">' +
    Object.keys(db.exams).map(function (k) { var e = db.exams[k]; return '<div><span>' + esc(e.label) + ' price</span><span>' + (e.onSale ? rupee(e.price) : 'Not on sale') + '</span></div>'; }).join('') +
    '<div><span>Next live test (countdown)</span><span>' + (nextLive ? esc(examLabel(nextLive.exam)) + ', ' + when(nextLive.start) : 'None scheduled') + '</span></div>' +
    '<div><span>Referral offer</span><span>' + (db.referral.enabled ? rupee(db.referral.friendDiscount) + ' off / ' + rupee(db.referral.referrerCredit) + ' credits' : 'Off') + '</span></div>' +
    '</div></section></div>' +
    '<section class="card" style="margin-top: 16px"><div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 12px"><h2 style="margin: 0">Frequently asked questions</h2><button class="btn btn-outline btn-sm" type="button" id="faq-add">Add question</button></div>' +
    '<div style="display: grid; gap: 12px">' + w.faqs.map(function (f, i) {
      return '<div style="border: 1px solid var(--line); border-radius: 10px; padding: 12px; display: grid; gap: 8px">' +
        '<label class="l" for="fq-' + i + '" style="margin: 0">Question ' + (i + 1) + '</label><input class="input" id="fq-' + i + '" data-fq="' + i + '" value="' + esc(f.q) + '">' +
        '<label class="l" for="fa-' + i + '" style="margin: 0">Answer</label><textarea class="input" id="fa-' + i + '" data-fa="' + i + '">' + esc(f.a) + '</textarea>' +
        '<div><button class="btn btn-danger btn-sm" type="button" data-faq-del="' + i + '">Remove</button></div></div>';
    }).join('') + '</div><div style="margin-top: 12px"><button class="btn btn-primary" type="button" id="faq-save">Save FAQs</button></div></section>';
};
bind.website = function () {
  $('#yt-save').addEventListener('click', function () {
    var ok = function (u) { return !u || /^https:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\//i.test(u); };
    var ch = $('#yt-ch').value.trim();
    if (!ch || !ok(ch)) { toast('Enter your YouTube channel link'); return; }
    var pl = {}, bad = false;
    Object.keys(db.exams).forEach(function (k) { var u = $('#yt-' + k).value.trim(); if (!ok(u)) bad = true; pl[k] = u; });
    if (bad) { toast('Playlist links must be YouTube links'); return; }
    db.video.channel = ch; db.video.playlists = pl; save(); toast('Video library links saved');
  });
  $('#ws-save').addEventListener('click', function () { db.website.showAnnouncement = $('#ws-on').checked; db.website.announcement = $('#ws-text').value.trim(); save(); toast('Announcement saved'); });
  function collect() { db.website.faqs = db.website.faqs.map(function (f, i) { return { q: $('[data-fq="' + i + '"]').value.trim(), a: $('[data-fa="' + i + '"]').value.trim() }; }); }
  $('#faq-add').addEventListener('click', function () { collect(); db.website.faqs.push({ q: '', a: '' }); render(); });
  $$('[data-faq-del]').forEach(function (b) { b.addEventListener('click', function () { collect(); db.website.faqs.splice(Number(b.dataset.faqDel), 1); save(); render(); }); });
  $('#faq-save').addEventListener('click', function () {
    collect();
    if (db.website.faqs.some(function (f) { return !f.q || !f.a; })) { toast('Fill in every question and answer, or remove empty ones'); return; }
    save(); toast('FAQs saved');
  });
};

/* ---------- Shared form bits ---------- */
function field(label, control, hint) {
  var m = control.match(/id="([^"]+)"/);
  return '<div><label class="l"' + (m ? ' for="' + m[1] + '"' : '') + '>' + esc(label) + '</label>' + control + (hint ? '<p class="hint">' + esc(hint) + '</p>' : '') + '</div>';
}
function formDialog(title, body, save) {
  $('#df-title').textContent = title; $('#df-body').innerHTML = body + '<div class="alert a-err" id="df-err" hidden></div>';
  onSave = save; dlgForm.showModal();
}

/* ---------- Upload / edit test wizard ---------- */
function bindUpload() {
  $$('[data-upload]').forEach(function (b) {
    b.addEventListener('click', function () { openTestDialog(null, b.dataset.upload === 'live' ? { kind: 'live' } : {}); });
  });
}
function openTestDialog(id, preset) {
  var x = id ? JSON.parse(JSON.stringify(find(id))) : null;
  preset = preset || {};
  if (!x) {
    var exam = preset.exam || 'neet', kind = preset.kind || 'part';
    x = { id: null, exam: exam, kind: kind, slot: preset.slot || nextFreeSlot(exam, kind), title: '', chapters: '', questions: 0, minutes: 0, status: 'draft', start: '', window: 30, resultAt: '', file: '', solutions: '', missing: 0, parsed: null };
    applyDefaults(x);
  }
  wz = { step: 1, x: x, editing: !!id };
  $('#dt-title').textContent = id ? 'Edit ' + x.title : 'Upload a test';
  drawWizard(); dlgTest.showModal();
}
function applyDefaults(x) {
  var e = db.exams[x.exam], part = x.kind === 'part';
  x.questions = part ? e.partQuestions : e.questions;
  x.minutes = part ? e.partMinutes : e.minutes;
  if (x.kind === 'live') { x.slot = null; x.title = x.title || e.label + ' Live Test'; }
  else if (x.kind === 'assigned') {
    x.slot = null; x.questions = e.partQuestions; x.minutes = e.partMinutes; x.title = x.title || 'Assigned Test';
    x.audience = x.audience || { type: 'students', groupIds: [], studentIds: [] };
  }
  else { x.slot = x.slot || nextFreeSlot(x.exam, x.kind); x.title = KIND[x.kind].replace(' test', ' Test').replace('Half syllabus', 'Half Syllabus Test').replace('Full syllabus', 'Full Syllabus Test') + (x.slot ? ' ' + x.slot : ''); }
}
function drawWizard() {
  var x = wz.x, b = $('#dt-body');
  $$('[data-st]').forEach(function (s) { var n = Number(s.dataset.st); s.className = n === wz.step ? 'on' : (n < wz.step ? 'done' : ''); });
  $('#dt-back').style.visibility = wz.step === 1 ? 'hidden' : 'visible';
  if (wz.step === 1) {
    var slotOpts = '';
    if (SLOTS[x.kind]) for (var i = 1; i <= SLOTS[x.kind]; i++) {
      var taken = db.tests.some(function (y) { return y.exam === x.exam && y.kind === x.kind && y.slot === i && y.id !== x.id; });
      slotOpts += '<option value="' + i + '"' + (x.slot === i ? ' selected' : '') + (taken ? ' disabled' : '') + '>' + i + (taken ? ' (already uploaded)' : '') + '</option>';
    }
    b.innerHTML = '<div class="form">' +
      field('Exam', '<select class="input" id="w-exam"' + (wz.editing ? ' disabled' : '') + '>' + examOptions(x.exam) + '</select>') +
      field('Type', '<select class="input" id="w-kind"' + (wz.editing ? ' disabled' : '') + '>' + ['part', 'half', 'full', 'live', 'assigned'].map(function (k) { return '<option value="' + k + '"' + (x.kind === k ? ' selected' : '') + '>' + KIND[k] + '</option>'; }).join('') + '</select>') +
      (SLOTS[x.kind] ? field('Position in the series', '<select class="input" id="w-slot">' + slotOpts + '</select>', 'e.g. Part Test 3 of 6.') : '') +
      field('Title (shown to students)', '<input class="input" id="w-title" value="' + esc(x.title) + '">') +
      '<div class="full">' + field('Syllabus covered', '<textarea class="input" id="w-ch" placeholder="Chapters in this test, by subject">' + esc(x.chapters) + '</textarea>') + '</div>' +
      field('Number of questions', '<input class="input" type="number" min="1" id="w-q" value="' + x.questions + '">', 'Default from the exam pattern.') +
      field('Duration (minutes)', '<input class="input" type="number" min="1" id="w-m" value="' + x.minutes + '">') +
      (x.kind === 'live' ?
        field('Start date and time', '<input class="input" type="datetime-local" id="w-start" value="' + esc(x.start) + '">') +
        field('Entry window (minutes)', '<input class="input" type="number" min="0" id="w-window" value="' + x.window + '">') +
        field('Rank published at', '<input class="input" type="datetime-local" id="w-result" value="' + esc(x.resultAt) + '">') : '') +
      (x.kind === 'assigned' ? audienceUI(x) +
        field('Available from', '<input class="input" type="datetime-local" id="w-opens" value="' + esc(x.opens || '') + '">', 'Leave empty to open as soon as you publish.') +
        field('Due by (optional)', '<input class="input" type="datetime-local" id="w-due" value="' + esc(x.due || '') + '">') : '') +
      '</div><div class="alert a-err" id="w-err" hidden></div>';
    if (x.kind === 'assigned') bindAudience();
    if (!wz.editing) {
      $('#w-exam').addEventListener('change', function () { readStep1(); x.exam = this.value; x.slot = null; x.title = ''; applyDefaults(x); drawWizard(); });
      $('#w-kind').addEventListener('change', function () { readStep1(); x.kind = this.value; x.slot = null; x.title = ''; applyDefaults(x); drawWizard(); });
    }
    var sl = $('#w-slot'); if (sl) sl.addEventListener('change', function () { x.slot = Number(this.value); if (!wz.editing) { var t = x.title.replace(/\s\d+$/, ''); x.title = t + ' ' + x.slot; $('#w-title').value = x.title; } });
    setNext([['Next: files', 'btn-primary', function () { if (readStep1(true)) { wz.step = 2; drawWizard(); } }]]);
  }
  if (wz.step === 2) {
    b.innerHTML =
      '<div class="drop"><b>Question paper</b><span class="hint" style="margin: 0">Word (.docx), PDF or Studyverse QB JSON. Questions, options and the answer key can be in the same file.</span>' +
      '<input type="file" id="w-file" accept=".docx,.pdf,.json,.xlsx" aria-label="Question paper file">' + (x.file ? '<span class="file-ok">Current file: ' + esc(x.file) + '</span>' : '') + '<div id="w-parse"></div></div>' +
      '<div class="drop"><b>Solutions (optional)</b><span class="hint" style="margin: 0">Shown to students after they submit. Can be added later.</span>' +
      '<input type="file" id="w-sol" accept=".docx,.pdf" aria-label="Solutions file">' + (x.solutions ? '<span class="file-ok">Current file: ' + esc(x.solutions) + '</span>' : '') + '</div>' +
      '<div class="alert a-info">The server reads Word and PDF files and turns them into questions with formulas and diagrams. You check them in the preview before publishing.</div>' +
      '<div class="alert a-err" id="w-err" hidden></div>';
    $('#w-file').addEventListener('change', function () {
      var f = this.files[0]; if (!f) return;
      x.file = f.name; x.parsed = null; x.missing = 0;
      var out = $('#w-parse');
      if (/\.json$/i.test(f.name)) {
        var r = new FileReader();
        r.onload = function () {
          try {
            var data = JSON.parse(r.result);
            var qs = Array.isArray(data) ? data : (data.questions || []);
            if (!qs.length) throw new Error('none');
            var miss = qs.filter(function (q) { var a = q.answer != null ? q.answer : (q.correctAnswer != null ? q.correctAnswer : q.correct); return a == null || a === ''; }).length;
            x.parsed = qs.length; x.missing = miss;
            out.innerHTML = '<div class="alert ' + (miss ? 'a-warn' : 'a-ok') + '" style="margin-top: 6px">Found ' + qs.length + ' questions' + (miss ? '; ' + miss + ' have no answer.' : ', all with answers.') + '</div>';
          } catch (e) { out.innerHTML = '<div class="alert a-err" style="margin-top: 6px">Couldn\u2019t read this JSON file. Check it\u2019s a question list.</div>'; x.file = ''; }
        };
        r.readAsText(f);
      } else {
        out.innerHTML = '<span class="file-ok">' + esc(f.name) + ' attached. It will be read when you save.</span>';
      }
    });
    $('#w-sol').addEventListener('change', function () { if (this.files[0]) x.solutions = this.files[0].name; });
    setNext([['Next: review', 'btn-primary', function () {
      if (!x.file) { var e = $('#w-err'); e.textContent = 'Attach the question paper.'; e.hidden = false; return; }
      wz.step = 3; drawWizard();
    }]]);
  }
  if (wz.step === 3) {
    var checks = [];
    if (x.parsed != null && x.parsed !== x.questions) checks.push(['a-warn', 'The file has ' + x.parsed + ' questions but the test is set to ' + x.questions + '.']);
    if (x.missing) checks.push(['a-warn', x.missing + ' questions have no answer. You can save as a draft and add them later; the test can\u2019t be published until then.']);
    if (!x.solutions) checks.push(['a-info', 'No solutions file yet. Students will see answers only.']);
    if (!checks.length) checks.push(['a-ok', 'Everything looks ready.']);
    b.innerHTML = '<div class="summary-list">' +
      row('Exam', examLabel(x.exam)) + row('Type', KIND[x.kind] + (x.slot ? ' ' + x.slot + ' of ' + SLOTS[x.kind] : '')) + row('Title', x.title) +
      row('Questions', x.questions) + row('Duration', x.minutes + ' minutes') +
      (x.kind === 'live' ? row('Starts', when(x.start)) + row('Entry window', x.window + ' minutes') + row('Rank published', when(x.resultAt)) : '') +
      (x.kind === 'assigned' ? row('Given to', audienceText(x) + ' (' + audienceCount(x) + ' student' + (audienceCount(x) === 1 ? '' : 's') + ')') + row('Opens', x.opens ? when(x.opens) : 'When published') + row('Due', x.due ? when(x.due) : 'No due date') : '') +
      row('Question paper', x.file) + row('Solutions', x.solutions || 'Not added') + '</div>' +
      (x.kind === 'assigned' ? '<label class="check" style="margin-top: 4px"><input type="checkbox" id="w-notify" checked> Notify these students in the app and by SMS when published</label>' : '') +
      '<div>' + checks.map(function (c) { return '<div class="alert ' + c[0] + '">' + esc(c[1]) + '</div>'; }).join('') + '</div>';
    var canPublish = !x.missing;
    setNext([
      ['Save as draft', 'btn-outline', function () { commit('draft'); }],
      [x.kind === 'live' ? 'Schedule' : 'Publish', 'btn-primary', function () { commit(x.kind === 'live' ? 'scheduled' : 'published'); }, !canPublish]
    ]);
  }
  function row(k, v) { return '<div><span>' + esc(k) + '</span><span>' + esc(v) + '</span></div>'; }
}
function audienceUI(x) {
  var a = x.audience || { type: 'students', groupIds: [], studentIds: [] };
  var radio = function (v, label) { return '<label class="check"><input type="radio" name="w-aud" value="' + v + '"' + (a.type === v ? ' checked' : '') + '> ' + label + '</label>'; };
  var lms = db.students.filter(function (s) { return s.lms; });
  return '<div class="full" style="display: grid; gap: 10px; border: 1px solid var(--line); border-radius: 12px; padding: 14px">' +
    '<b>Who gets this test?</b>' +
    '<div style="display: flex; flex-wrap: wrap; gap: 18px">' + radio('students', 'Individual students') + radio('groups', 'Groups') + radio('all', 'All ' + esc(examLabel(x.exam)) + ' students') + '</div>' +
    '<div data-aud-pane="students"' + (a.type === 'students' ? '' : ' hidden') + ' style="display: grid; gap: 8px">' +
      '<label class="l" for="w-sq" style="margin: 0">Search Studyverse course (LMS) students</label>' +
      '<input class="input" id="w-sq" placeholder="Name, mobile or city">' +
      '<div style="max-height: 200px; overflow-y: auto; border: 1px solid var(--line); border-radius: 8px; padding: 6px 10px">' +
      (lms.length ? lms.map(function (s) {
        return '<label class="check" data-s-row="' + esc((s.name + ' ' + s.phone + ' ' + s.city).toLowerCase()) + '" style="padding: 6px 0"><input type="checkbox" data-aud-s value="' + s.id + '"' + ((a.studentIds || []).indexOf(s.id) >= 0 ? ' checked' : '') + '> ' + esc(s.name) + ' <span class="hint" style="margin: 0">· ' + esc(examLabel(s.exam)) + ', ' + esc(s.city) + '</span></label>';
      }).join('') : '<p class="hint">No LMS students yet.</p>') + '</div>' +
      '<p class="hint" style="margin: 0">Personal tests are for Studyverse course students only for now.</p></div>' +
    '<div data-aud-pane="groups"' + (a.type === 'groups' ? '' : ' hidden') + ' style="display: grid; gap: 6px">' +
      (db.groups.length ? db.groups.map(function (g) {
        return '<label class="check"><input type="checkbox" data-aud-g value="' + g.id + '"' + ((a.groupIds || []).indexOf(g.id) >= 0 ? ' checked' : '') + '> ' + esc(g.name) + ' <span class="hint" style="margin: 0">· ' + g.studentIds.length + ' students</span></label>';
      }).join('') : '<p class="hint">No groups yet. Create one under Students &amp; groups.</p>') + '</div>' +
    '<div data-aud-pane="all"' + (a.type === 'all' ? '' : ' hidden') + '><p class="hint" style="margin: 0">Every student preparing for ' + esc(examLabel(x.exam)) + ' will see this test, in addition to their test series.</p></div>' +
    '</div>';
}
function bindAudience() {
  $$('input[name="w-aud"]').forEach(function (r) {
    r.addEventListener('change', function () { $$('[data-aud-pane]').forEach(function (p) { p.hidden = p.dataset.audPane !== r.value; }); });
  });
  var sq = $('#w-sq');
  if (sq) sq.addEventListener('input', function () {
    var q = sq.value.trim().toLowerCase();
    $$('[data-s-row]').forEach(function (row) { row.hidden = q && row.dataset.sRow.indexOf(q) < 0; });
  });
}
function readStep1(validate) {
  var x = wz.x;
  var t = $('#w-title'); if (!t) return true;
  x.title = t.value.trim(); x.chapters = $('#w-ch').value.trim();
  x.questions = Number($('#w-q').value); x.minutes = Number($('#w-m').value);
  var sl = $('#w-slot'); if (sl) x.slot = Number(sl.value);
  if (x.kind === 'live') { x.start = $('#w-start').value; x.window = Number($('#w-window').value) || 0; x.resultAt = $('#w-result').value; }
  if (x.kind === 'assigned') {
    var typeEl = $('input[name="w-aud"]:checked');
    x.audience = {
      type: typeEl ? typeEl.value : 'all',
      groupIds: $$('[data-aud-g]:checked').map(function (c) { return c.value; }),
      studentIds: $$('[data-aud-s]:checked').map(function (c) { return c.value; })
    };
    x.opens = $('#w-opens').value; x.due = $('#w-due').value;
  }
  if (!validate) return true;
  var err = '';
  if (!x.title) err = 'Add a title.';
  else if (!(x.questions > 0) || !(x.minutes > 0)) err = 'Enter the number of questions and the duration.';
  else if (SLOTS[x.kind] && !x.slot) err = 'All ' + SLOTS[x.kind] + ' ' + KIND[x.kind].toLowerCase() + ' positions for ' + examLabel(x.exam) + ' are already used. Edit an existing one instead.';
  else if (x.kind === 'live' && !x.start) err = 'Choose when the live test starts.';
  else if (x.kind === 'assigned' && x.audience.type === 'groups' && !x.audience.groupIds.length) err = 'Choose at least one group.';
  else if (x.kind === 'assigned' && x.audience.type === 'students' && !x.audience.studentIds.length) err = 'Choose at least one student.';
  else if (x.kind === 'assigned' && x.due && x.opens && new Date(x.due) <= new Date(x.opens)) err = 'The due date must be after the test opens.';
  else if (x.kind === 'live' && x.resultAt && new Date(x.resultAt) <= new Date(x.start)) err = 'The rank must be published after the test starts.';
  if (err) { var e = $('#w-err'); e.textContent = err; e.hidden = false; return false; }
  return true;
}
function setNext(btns) {
  var w = $('#dt-next-wrap'); w.innerHTML = '';
  btns.forEach(function (d) {
    var bt = document.createElement('button'); bt.type = 'button'; bt.className = 'btn ' + d[1]; bt.textContent = d[0];
    if (d[3]) bt.disabled = true;
    bt.addEventListener('click', d[2]); w.appendChild(bt);
  });
}
function commit(status) {
  var x = wz.x; x.status = status;
  var clean = { id: x.id || (x.exam + '-' + x.kind + '-' + (x.slot || Date.now())), exam: x.exam, kind: x.kind, slot: x.slot, title: x.title, chapters: x.chapters, questions: x.questions, minutes: x.minutes, status: status, file: x.file, solutions: x.solutions || '', missing: x.missing || 0 };
  if (x.kind === 'live') { clean.start = x.start; clean.window = x.window; clean.resultAt = x.resultAt; }
  if (x.kind === 'assigned') { clean.audience = x.audience; clean.opens = x.opens; clean.due = x.due; }
  var notify = $('#w-notify') && $('#w-notify').checked && status !== 'draft';
  var i = db.tests.findIndex(function (y) { return y.id === clean.id; });
  if (i >= 0) db.tests[i] = clean; else db.tests.push(clean);
  save(); dlgTest.close(); render();
  toast(clean.title + (status === 'draft' ? ' saved as draft' : status === 'scheduled' ? ' scheduled for ' + when(clean.start) : ' published' + (clean.kind === 'assigned' ? ' to ' + audienceText(clean) : '')) + (notify ? '. Students notified.' : ''));
}

/* ---------- mount (called by Admin.jsx once the shell is in the DOM) ----------
   Static elements are bound once per element so React StrictMode's double
   effect doesn't attach duplicate listeners. */
function once(el, fn) {
  if (!el || el.__tvBound) return;
  el.__tvBound = true;
  el.addEventListener('click', fn);
}
export default function mountAdmin(el) {
  root = el || document.body;
  dlgForm = $('#dlg-form');
  dlgTest = $('#dlg-test');

  $$('.side [data-view]').forEach(function (b) {
    once(b, function () { go(b.dataset.view); $('#view').focus(); });
  });
  once($('#reset'), function () {
    if (!confirm('Reset all demo data? Your changes in this browser will be lost.')) return;
    db = seed(); save(); render(); toast('Demo data reset');
  });
  once($('#df-save'), function () {
    var err = onSave && onSave();
    if (err) { $('#df-err').textContent = err; $('#df-err').hidden = false; return; }
    dlgForm.close();
  });
  $$('[data-close]').forEach(function (b) {
    once(b, function () { b.closest('dialog').close(); });
  });
  once($('#dt-back'), function () { if (wz.step > 1) { wz.step--; drawWizard(); } });

  var startView = 'dashboard';
  try { startView = location.hash.slice(1) || 'dashboard'; } catch (e) { /* ignore */ }
  go(startView);
}
