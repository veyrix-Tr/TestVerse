// lib/scoring.js
// Server-side scoring. The rules are the same as the result screen's
// frontend/src/pages/Test/scoring.js, so the stored score and what the student
// sees always agree. Responses come from the browser, so they are cleaned first
// (cleanResponses) — never score raw client data.

const hasAnswer = (q, a) => {
  if (a == null || a === '') return false;
  if (q.type === 'multiple') return Array.isArray(a) && a.length > 0;
  if (q.type === 'integer' || q.type === 'numerical') return String(a).trim() !== '' && !isNaN(Number(a));
  return true;
};

const scoreQuestion = (q, r) => {
  // NTA rule: "answered and marked for review" IS evaluated; "marked" without an answer is not.
  const a = r && r.answer;
  if (!hasAnswer(q, a)) return { status: 'skipped', marks: 0 };
  const m = q.marks;
  switch (q.type) {
    case 'single':
    case 'ar':
    case 'match':
      return a === q.answer ? { status: 'correct', marks: m.correct } : { status: 'wrong', marks: m.wrong };
    case 'integer':
      return Number(a) === q.answer ? { status: 'correct', marks: m.correct } : { status: 'wrong', marks: m.wrong };
    case 'numerical':
      return Math.abs(Number(a) - q.answer) <= (q.tolerance || 0) ? { status: 'correct', marks: m.correct } : { status: 'wrong', marks: m.wrong };
    case 'multiple': {
      const chosenWrong = a.some((x) => q.answer.indexOf(x) < 0);
      if (chosenWrong) return { status: 'wrong', marks: m.wrong };
      if (a.length === q.answer.length) return { status: 'correct', marks: m.correct };
      // JEE Advanced partial marking: +1 for each correct option chosen, when no wrong option is chosen.
      return m.partial ? { status: 'partial', marks: a.length } : { status: 'wrong', marks: m.wrong };
    }
  }
  return { status: 'skipped', marks: 0 };
};

const questionsOf = (paper) => paper.sections.flatMap((s) => s.questions);

// Totals for a submitted attempt (the summary stored on the Attempt row).
const scoreAttempt = (paper, responses) => {
  const out = { score: 0, maxScore: 0, correct: 0, wrong: 0, partial: 0, skipped: 0 };
  for (const q of questionsOf(paper)) {
    const sc = scoreQuestion(q, responses[q.id]);
    out.score += sc.marks;
    out.maxScore += q.marks.correct;
    out[sc.status]++;
  }
  return out;
};

// Keeps only well-formed responses to this paper's questions, in the same
// shape the CBT screen uses: { [qid]: { answer, marked, visited, timeMs } }.
const cleanAnswer = (q, a) => {
  if (a == null || a === '') return null;
  const nOpts = Array.isArray(q.options) ? q.options.length : 0;
  const isIdx = (x) => Number.isInteger(x) && x >= 0 && x < nOpts;
  switch (q.type) {
    case 'single':
    case 'ar':
    case 'match':
      return isIdx(a) ? a : null;
    case 'multiple': {
      if (!Array.isArray(a)) return null;
      const set = [...new Set(a.filter(isIdx))].sort((x, y) => x - y);
      return set.length ? set : null;
    }
    case 'integer':
    case 'numerical': {
      const s = String(a).trim().slice(0, 24);
      return s !== '' && !isNaN(Number(s)) ? s : null;
    }
  }
  return null;
};

const cleanResponses = (paper, input) => {
  const src = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const out = {};
  for (const q of questionsOf(paper)) {
    const r = src[q.id];
    if (!r || typeof r !== 'object') continue;
    const timeMs = Number(r.timeMs);
    out[q.id] = {
      answer:  cleanAnswer(q, r.answer),
      marked:  r.marked === true,
      visited: r.visited === true,
      timeMs:  Number.isFinite(timeMs) && timeMs > 0 ? Math.min(Math.round(timeMs), 1e8) : 0,
    };
  }
  return out;
};

module.exports = { hasAnswer, scoreQuestion, scoreAttempt, cleanResponses, questionsOf };
