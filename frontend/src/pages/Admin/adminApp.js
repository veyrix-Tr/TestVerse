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
var onView = null; // Admin.jsx: told which view is showing
var dlgForm = null,
  onSave = null;
var dlgTest = null,
  wz = null;

/* ======================================================================
   DEMO DATA. In the real app all of this lives on the server (e.g. Firebase),
   only signed-in admins can change it, and the website and student app read
   from the same place, so a change here shows up everywhere.
   ====================================================================== */
var STORE_KEY = 'sv-admin-demo-v4'; /* v4: demo students & groups removed (now real) */
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
      { id: 'L3', exam: 'neet', kind: 'live', slot: null, title: 'NEET Half Syllabus Live Test', chapters: 'Class 11', questions: 180, minutes: 180, status: 'draft', start: '2026-11-15T14:00', window: 30, resultAt: '2026-11-15T20:00', file: '', missing: 0 }
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
      showAnnouncement: true
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
function load() { try { db = JSON.parse(localStorage.getItem(STORE_KEY)); } catch { db = null; } if (!db || !db.exams || !db.requests) db = seed(); delete db.students; delete db.groups; }
function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); } catch {} }
load();

/* ---------- helpers ---------- */
var $ = function (s, el) { return (el || document).querySelector(s); };
var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function when(iso) {
  if (!iso) return '—';
  var d = new Date(iso);
  if (isNaN(d)) return '—';
  return d.toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}
function examLabel(id) { return id === 'all' ? 'All exams' : (db.exams[id] ? db.exams[id].label : id); }
var KIND = { part: 'Part test', half: 'Half syllabus', full: 'Full syllabus', live: 'Live test' };
var SLOTS = { part: 6, half: 3, full: 2 };
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
var ui = { view: 'dashboard' };
var VIEWS = {};
function go(view) {
  if (view === 'tests') view = 'free';
  ui.view = VIEWS[view] ? view : 'dashboard';
  $$('.side [data-view]').forEach(function (b) { b.setAttribute('aria-current', b.dataset.view === ui.view ? 'page' : 'false'); });
  if (location.hash.slice(1) !== ui.view) { try { history.replaceState(null, '', '#' + ui.view); } catch { /* not allowed in some previews */ } }
  if (onView) onView(ui.view);
  render();
}
function render() {
  $('#view').innerHTML = VIEWS[ui.view]();
  if (bind[ui.view]) bind[ui.view]();
}

var bind = {};

/* ---------- Dashboard ----------
   Real, API-backed screen: Admin.jsx renders <AdminDashboard/> beside #view
   while this view is active, so #view stays empty here. */
VIEWS.dashboard = function () { return ''; };

/* ---------- Free tests, Live tests, Test series ----------
   Real, API-backed screens: Admin.jsx renders <TestsAdmin/> (free / live) or
   <SeriesAdmin/> beside #view while one of these views is active (see onView
   in mountAdmin), so #view stays empty here. "#tests" (the old single Tests
   section) opens Free tests. */
VIEWS.free = function () { return ''; };
VIEWS.live = function () { return ''; };
VIEWS.series = function () { return ''; };
function find(id) { return db.tests.filter(function (x) { return x.id === id; })[0]; }

/* ---------- Video requests and Analysis ----------
   Coming soon: Admin.jsx renders a "coming soon" screen beside #view while
   either view is active, so #view stays empty here. */
VIEWS.requests = function () { return ''; };
VIEWS.analysis = function () { return ''; };

/* ---------- Students & groups ----------
   Real, API-backed screen: Admin.jsx renders <StudentsAdmin/> beside #view
   while this view is active, so #view stays empty here. */
VIEWS.students = function () { return ''; };

/* ---------- Website info ----------
   React screen: Admin.jsx renders <WebsiteAdmin/> beside #view while this view
   is active, so #view stays empty here. */
VIEWS.website = function () { return ''; };

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
      field('Type', '<select class="input" id="w-kind"' + (wz.editing ? ' disabled' : '') + '>' + ['part', 'half', 'full', 'live'].map(function (k) { return '<option value="' + k + '"' + (x.kind === k ? ' selected' : '') + '>' + KIND[k] + '</option>'; }).join('') + '</select>') +
      (SLOTS[x.kind] ? field('Position in the series', '<select class="input" id="w-slot">' + slotOpts + '</select>', 'e.g. Part Test 3 of 6.') : '') +
      field('Title (shown to students)', '<input class="input" id="w-title" value="' + esc(x.title) + '">') +
      '<div class="full">' + field('Syllabus covered', '<textarea class="input" id="w-ch" placeholder="Chapters in this test, by subject">' + esc(x.chapters) + '</textarea>') + '</div>' +
      field('Number of questions', '<input class="input" type="number" min="1" id="w-q" value="' + x.questions + '">', 'Default from the exam pattern.') +
      field('Duration (minutes)', '<input class="input" type="number" min="1" id="w-m" value="' + x.minutes + '">') +
      (x.kind === 'live' ?
        field('Start date and time', '<input class="input" type="datetime-local" id="w-start" value="' + esc(x.start) + '">') +
        field('Entry window (minutes)', '<input class="input" type="number" min="0" id="w-window" value="' + x.window + '">') +
        field('Rank published at', '<input class="input" type="datetime-local" id="w-result" value="' + esc(x.resultAt) + '">') : '') +
      '</div><div class="alert a-err" id="w-err" hidden></div>';
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
          } catch { out.innerHTML = '<div class="alert a-err" style="margin-top: 6px">Couldn\u2019t read this JSON file. Check it\u2019s a question list.</div>'; x.file = ''; }
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
      row('Question paper', x.file) + row('Solutions', x.solutions || 'Not added') + '</div>' +
      '<div>' + checks.map(function (c) { return '<div class="alert ' + c[0] + '">' + esc(c[1]) + '</div>'; }).join('') + '</div>';
    var canPublish = !x.missing;
    setNext([
      ['Save as draft', 'btn-outline', function () { commit('draft'); }],
      [x.kind === 'live' ? 'Schedule' : 'Publish', 'btn-primary', function () { commit(x.kind === 'live' ? 'scheduled' : 'published'); }, !canPublish]
    ]);
  }
  function row(k, v) { return '<div><span>' + esc(k) + '</span><span>' + esc(v) + '</span></div>'; }
}
function readStep1(validate) {
  var x = wz.x;
  var t = $('#w-title'); if (!t) return true;
  x.title = t.value.trim(); x.chapters = $('#w-ch').value.trim();
  x.questions = Number($('#w-q').value); x.minutes = Number($('#w-m').value);
  var sl = $('#w-slot'); if (sl) x.slot = Number(sl.value);
  if (x.kind === 'live') { x.start = $('#w-start').value; x.window = Number($('#w-window').value) || 0; x.resultAt = $('#w-result').value; }
  if (!validate) return true;
  var err = '';
  if (!x.title) err = 'Add a title.';
  else if (!(x.questions > 0) || !(x.minutes > 0)) err = 'Enter the number of questions and the duration.';
  else if (SLOTS[x.kind] && !x.slot) err = 'All ' + SLOTS[x.kind] + ' ' + KIND[x.kind].toLowerCase() + ' positions for ' + examLabel(x.exam) + ' are already used. Edit an existing one instead.';
  else if (x.kind === 'live' && !x.start) err = 'Choose when the live test starts.';
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
  var i = db.tests.findIndex(function (y) { return y.id === clean.id; });
  if (i >= 0) db.tests[i] = clean; else db.tests.push(clean);
  save(); dlgTest.close(); render();
  toast(clean.title + (status === 'draft' ? ' saved as draft' : status === 'scheduled' ? ' scheduled for ' + when(clean.start) : ' published'));
}

/* ---------- mount (called by Admin.jsx once the shell is in the DOM) ----------
   Static elements are bound once per element so React StrictMode's double
   effect doesn't attach duplicate listeners. */
function once(el, fn) {
  if (!el || el.__tvBound) return;
  el.__tvBound = true;
  el.addEventListener('click', fn);
}
export default function mountAdmin(el, opts) {
  root = el || document.body;
  onView = (opts && opts.onView) || null;
  dlgForm = $('#dlg-form');
  dlgTest = $('#dlg-test');

  $$('.side [data-view]').forEach(function (b) {
    once(b, function () { go(b.dataset.view); $('#view').focus(); });
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
  try { startView = location.hash.slice(1) || 'dashboard'; } catch { /* ignore */ }
  go(startView);
}
