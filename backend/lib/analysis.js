// lib/analysis.js
// The after-test numbers that need more than the stored totals: per subject
// (section) marks, accuracy and time, plus the guessing and time-sink counts.
// Worked out from the paper and the attempt's responses on every read, so
// nothing extra is stored. Rules match frontend/src/pages/Test/scoring.js.

const prisma = require('./prisma');
const { scoreQuestion } = require('./scoring');

const DEFAULTS = { guessSeconds: 30, slowSeconds: 180, reportNotice: true };

// The admin's analysis settings (Admin › Website), or the defaults. Never
// throws: results and submitting must keep working even if this read fails
// (e.g. before the after-test migration has been applied).
const resultSettings = async () => {
  try {
    const s = await prisma.websiteSettings.findFirst({ select: { guessSeconds: true, slowSeconds: true, reportNotice: true } });
    return s ? { ...DEFAULTS, ...s } : { ...DEFAULTS };
  } catch (e) {
    console.error('result settings:', e.message);
    return { ...DEFAULTS };
  }
};

// One submitted attempt in a few numbers, for the progress charts:
//   { sections: [{ name, marks, max, correct, wrong, partial, skipped }],
//     guesses, slow, wrong }
// `guesses` = wrong answers faster than guessSeconds; `slow` = wrong answers
// slower than slowSeconds.
const analyse = (paper, responses, settings = DEFAULTS) => {
  const guessMs = settings.guessSeconds * 1000;
  const slowMs  = settings.slowSeconds * 1000;
  const out = { sections: [], guesses: 0, slow: 0, wrong: 0 };
  if (!paper || !Array.isArray(paper.sections)) return out;
  const res = responses || {};
  for (const s of paper.sections) {
    const S = { name: s.name, marks: 0, max: 0, correct: 0, wrong: 0, partial: 0, skipped: 0 };
    for (const q of s.questions) {
      const r = res[q.id];
      const sc = scoreQuestion(q, r);
      const t = (r && r.timeMs) || 0;
      S.marks += sc.marks;
      S.max += q.marks.correct;
      S[sc.status]++;
      if (sc.status === 'wrong') {
        out.wrong++;
        if (t > 0 && t < guessMs) out.guesses++;
        if (t > slowMs) out.slow++;
      }
    }
    out.sections.push(S);
  }
  return out;
};

module.exports = { DEFAULTS, resultSettings, analyse };
