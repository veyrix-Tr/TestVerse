// lib/paperFormat.js
// Reads a question paper in the admin JSON format (docs/test-format.md),
// checks it, and turns it into the shape the CBT screen uses:
//   { languages, sections: [{ name, questions: [{ id, type, chapter, marks,
//     text: {en, hi?}, options?: [{en, hi?}], answer, tolerance?, solution?, video? }] }] }
// Option answers arrive as letters ("B", ["A","C"]) and are stored as 0-based
// indexes. Every problem is reported, each with a readable place, so the admin
// can fix them all in one go.

const TYPES         = ['single', 'multiple', 'integer', 'numerical'];
const OPTION_TYPES  = ['single', 'multiple'];
const LANGUAGES     = ['en', 'hi'];
const MIN_OPTIONS   = 2;
const MAX_OPTIONS   = 6;
const MAX_QUESTIONS = 300;
const MAX_TEXT      = 20000;

const DEFAULT_MARKING = {
  single:    { correct: 4, wrong: -1 },
  multiple:  { correct: 4, wrong: -2, partial: true },
  integer:   { correct: 4, wrong: 0 },
  numerical: { correct: 4, wrong: 0 },
};

const YOUTUBE = /^https:\/\/(www\.|m\.)?(youtube\.com\/(watch\?v=|shorts\/|embed\/|live\/)|youtu\.be\/)[\w-]{6,}/;

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const num   = (v) => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN);

// A text field: "…" or { en: "…", hi: "…" } -> { en, hi? }; returns null if unusable.
const readText = (v) => {
  if (typeof v === 'string') return v.trim() ? { en: v.trim() } : null;
  if (isObj(v) && typeof v.en === 'string' && v.en.trim()) {
    const t = { en: v.en.trim() };
    if (typeof v.hi === 'string' && v.hi.trim()) t.hi = v.hi.trim();
    return t;
  }
  return null;
};
const tooLong = (t) => t && (t.en.length > MAX_TEXT || (t.hi && t.hi.length > MAX_TEXT));

// Test-level marking scheme: defaults, overridden by whatever the admin set.
// Returns { marking } or { errors }.
const normalizeMarking = (input) => {
  const errors  = [];
  const marking = {};
  const src     = isObj(input) ? input : {};
  for (const type of TYPES) {
    const d = DEFAULT_MARKING[type];
    const s = isObj(src[type]) ? src[type] : {};
    const correct = s.correct == null ? d.correct : num(s.correct);
    const wrong   = s.wrong == null ? d.wrong : num(s.wrong);
    if (!(correct > 0 && correct <= 100)) errors.push(`Marking › ${type}: marks for a correct answer must be between 1 and 100.`);
    if (!(wrong <= 0 && wrong >= -100)) errors.push(`Marking › ${type}: marks for a wrong answer must be 0 or negative.`);
    marking[type] = { correct, wrong };
    if (type === 'multiple') marking[type].partial = s.partial == null ? d.partial : s.partial === true;
  }
  return errors.length ? { errors } : { marking };
};

// A question's own "marks" override, on top of the test's marking for its type.
const readMarks = (raw, base, where, errors) => {
  if (raw == null) return { ...base };
  if (!isObj(raw)) {
    errors.push(`${where}: "marks" must look like {"correct": 4, "wrong": -1}.`);
    return { ...base };
  }
  const m = { ...base };
  if (raw.correct != null) m.correct = num(raw.correct);
  if (raw.wrong != null) m.wrong = num(raw.wrong);
  if (raw.partial != null) m.partial = raw.partial === true;
  if (!(m.correct > 0 && m.correct <= 100)) errors.push(`${where}: marks.correct must be between 1 and 100.`);
  if (!(m.wrong <= 0 && m.wrong >= -100)) errors.push(`${where}: marks.wrong must be 0 or negative.`);
  return m;
};

const letterOf = (i) => String.fromCharCode(65 + i);
const indexOfLetter = (v, n) => {
  if (typeof v !== 'string') return -1;
  const s = v.trim().toUpperCase();
  if (!/^[A-Z]$/.test(s)) return -1;
  const i = s.charCodeAt(0) - 65;
  return i < n ? i : -1;
};

const readQuestion = (raw, n, where, marking, errors) => {
  if (!isObj(raw)) {
    errors.push(`${where}: each question must be an object.`);
    return null;
  }
  const type = typeof raw.type === 'string' ? raw.type.trim().toLowerCase() : '';
  if (!TYPES.includes(type)) {
    errors.push(`${where}: "type" must be one of ${TYPES.join(', ')}${raw.type ? ` (got "${raw.type}")` : ''}.`);
    return null;
  }

  const q = { id: 'q' + n, type };
  const text = readText(raw.text);
  if (!text) errors.push(`${where}: "text" is missing. Use "…" or {"en": "…", "hi": "…"}.`);
  else if (tooLong(text)) errors.push(`${where}: "text" is too long.`);
  q.text = text || { en: '' };

  if (raw.chapter != null) {
    if (typeof raw.chapter !== 'string') errors.push(`${where}: "chapter" must be text.`);
    else if (raw.chapter.trim()) q.chapter = raw.chapter.trim().slice(0, 120);
  }

  q.marks = readMarks(raw.marks, marking[type], where, errors);

  if (OPTION_TYPES.includes(type)) {
    const opts = Array.isArray(raw.options) ? raw.options : null;
    if (!opts || opts.length < MIN_OPTIONS || opts.length > MAX_OPTIONS) {
      errors.push(`${where}: "options" must be a list of ${MIN_OPTIONS} to ${MAX_OPTIONS} choices.`);
      q.options = [];
    } else {
      q.options = opts.map((o, i) => {
        const t = readText(o);
        if (!t) errors.push(`${where}: option ${letterOf(i)} is empty.`);
        else if (tooLong(t)) errors.push(`${where}: option ${letterOf(i)} is too long.`);
        return t || { en: '' };
      });
    }
    const n = q.options.length;
    const range = n ? `A–${letterOf(n - 1)}` : 'one of the options';
    if (type === 'single') {
      const i = indexOfLetter(raw.answer, n);
      if (i < 0) errors.push(`${where}: "answer" must be one letter, ${range}${raw.answer != null ? ` (got ${JSON.stringify(raw.answer)})` : ''}.`);
      q.answer = i;
    } else {
      // ["A","C"], or "A,C" / "AC" for convenience
      const list = Array.isArray(raw.answer)
        ? raw.answer
        : typeof raw.answer === 'string'
          ? raw.answer.replace(/[\s,]/g, '').split('')
          : [];
      const idx = list.map((v) => indexOfLetter(v, n));
      if (!list.length || idx.some((i) => i < 0)) {
        errors.push(`${where}: "answer" must be a list of letters from ${range}, like ["A", "C"]${raw.answer != null ? ` (got ${JSON.stringify(raw.answer)})` : ''}.`);
      }
      q.answer = [...new Set(idx.filter((i) => i >= 0))].sort((a, b) => a - b);
    }
  } else {
    if (raw.options != null) errors.push(`${where}: ${type} questions don't have "options"; the student types the answer.`);
    const a = num(raw.answer);
    if (!Number.isFinite(a)) errors.push(`${where}: "answer" must be a number${raw.answer != null ? ` (got ${JSON.stringify(raw.answer)})` : ''}.`);
    else if (type === 'integer' && !Number.isInteger(a)) errors.push(`${where}: an integer question's answer must be a whole number (got ${a}).`);
    q.answer = Number.isFinite(a) ? a : 0;
    if (type === 'numerical') {
      const tol = raw.tolerance == null ? 0 : num(raw.tolerance);
      if (!(tol >= 0)) errors.push(`${where}: "tolerance" must be 0 or more.`);
      q.tolerance = tol >= 0 ? tol : 0;
    } else if (raw.tolerance != null) {
      errors.push(`${where}: "tolerance" only applies to numerical questions.`);
    }
  }

  if (raw.solution != null) {
    const s = readText(raw.solution);
    if (!s) errors.push(`${where}: "solution" must be text or {"en": "…", "hi": "…"}.`);
    else if (tooLong(s)) errors.push(`${where}: "solution" is too long.`);
    else q.solution = s.hi ? s : s.en;
  }

  if (raw.video != null && raw.video !== '') {
    if (typeof raw.video !== 'string' || !YOUTUBE.test(raw.video.trim())) errors.push(`${where}: "video" must be a YouTube link (https://youtu.be/… or https://www.youtube.com/watch?v=…).`);
    else q.video = raw.video.trim();
  }

  const known = ['type', 'text', 'options', 'answer', 'tolerance', 'marks', 'chapter', 'solution', 'video', 'id', 'number'];
  const extra = Object.keys(raw).filter((k) => !known.includes(k));
  if (extra.length) errors.push(`${where}: unknown field${extra.length > 1 ? 's' : ''} ${extra.map((k) => `"${k}"`).join(', ')}.`);

  return q;
};

// normalizePaper(input, { subject, marking }) -> { paper, summary } or { errors }
// `input` is the parsed JSON: { languages?, sections: [...] }, { questions: [...] }
// or a plain array of questions (one section named after the subject).
const normalizePaper = (input, { subject, marking } = {}) => {
  const errors = [];
  const mk = normalizeMarking(marking);
  if (mk.errors) return { errors: mk.errors };

  let src = input;
  if (Array.isArray(src)) src = { sections: [{ name: subject || 'Questions', questions: src }] };
  else if (isObj(src) && !src.sections && Array.isArray(src.questions)) src = { ...src, sections: [{ name: subject || 'Questions', questions: src.questions }] };
  if (!isObj(src) || !Array.isArray(src.sections)) {
    return { errors: ['The paper must be {"sections": [...]}, {"questions": [...]} or a list of questions.'] };
  }

  let languages = ['en'];
  if (src.languages != null) {
    if (!Array.isArray(src.languages) || !src.languages.length || src.languages.some((l) => !LANGUAGES.includes(l)) || !src.languages.includes('en')) {
      errors.push('"languages" must be ["en"] or ["en", "hi"].');
    } else {
      languages = [...new Set(src.languages)];
    }
  }

  if (!src.sections.length) errors.push('The paper has no sections.');
  const names = new Set();
  let n = 0;
  const sections = src.sections.map((sec, si) => {
    const label = isObj(sec) && typeof sec.name === 'string' && sec.name.trim() ? sec.name.trim() : `Section ${si + 1}`;
    if (!isObj(sec)) {
      errors.push(`${label}: each section must be {"name": "…", "questions": [...]}.`);
      return { name: label, questions: [] };
    }
    if (!(typeof sec.name === 'string' && sec.name.trim())) errors.push(`${label}: the section needs a "name", like "Physics".`);
    else if (names.has(label.toLowerCase())) errors.push(`${label}: two sections have this name; section names must be different.`);
    names.add(label.toLowerCase());
    if (!Array.isArray(sec.questions) || !sec.questions.length) {
      errors.push(`${label}: the section has no questions.`);
      return { name: label.slice(0, 60), questions: [] };
    }
    const questions = sec.questions
      .map((raw, qi) => readQuestion(raw, ++n, `${label} › Q${qi + 1}`, mk.marking, errors))
      .filter(Boolean);
    return { name: label.slice(0, 60), questions };
  });

  if (n > MAX_QUESTIONS) errors.push(`The paper has ${n} questions; the most allowed is ${MAX_QUESTIONS}.`);
  if (errors.length) return { errors };

  const all = sections.flatMap((s) => s.questions);
  const byType = Object.fromEntries(TYPES.map((t) => [t, all.filter((q) => q.type === t).length]));
  const summary = {
    questionCount: all.length,
    totalMarks:    all.reduce((a, q) => a + q.marks.correct, 0),
    languages,
    byType,
    sections:      sections.map((s) => ({ name: s.name, questions: s.questions.length, marks: s.questions.reduce((a, q) => a + q.marks.correct, 0) })),
  };
  return { paper: { languages, sections }, summary, marking: mk.marking };
};

// The student's copy before submitting: no answers, tolerances, solutions or videos.
const stripAnswers = (paper) => ({
  languages: paper.languages,
  sections: paper.sections.map((s) => ({
    name: s.name,
    // eslint-disable-next-line no-unused-vars
    questions: s.questions.map(({ answer, tolerance, solution, video, ...q }) => q),
  })),
});

module.exports = { TYPES, DEFAULT_MARKING, normalizeMarking, normalizePaper, stripAnswers };
