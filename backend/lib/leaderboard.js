// lib/leaderboard.js
// A test's leaderboard: every student's FIRST submitted attempt, ranked. Retakes
// are practice — they never move anyone's position — but a student who retakes
// is told where that retake's score would stand among everyone's first attempts.
//
// Order: higher score first; on equal scores, less time taken; then whoever
// submitted earlier. Students with exactly the same score and time share a rank.
// Read straight from the Attempt rows (score is stored at submit), so nothing
// extra is kept.

const prisma = require('./prisma');

// Time spent on an attempt: from start to submit, never more than the time allowed.
const timeTaken = (a) => {
  const end = Math.min(a.submittedAt.getTime(), a.deadline.getTime());
  return Math.max(0, end - a.startedAt.getTime());
};

// a before b?
const better = (a, b) => b.score - a.score || a.timeMs - b.timeMs || a.submittedAt - b.submittedAt;

// Same place on the board (score and time equal)?
const tied = (a, b) => a.score === b.score && a.timeMs === b.timeMs;

// Ranked first attempts of a test. `userSelect` picks which user fields come
// along (students get first names only; admins get contact details).
const rankedFirstAttempts = async (testId, userSelect) => {
  const rows = await prisma.attempt.findMany({
    where:  { testId, attemptNo: 1, submittedAt: { not: null } },
    select: {
      userId: true, score: true, maxScore: true, correct: true, wrong: true, partial: true, skipped: true,
      startedAt: true, deadline: true, submittedAt: true, autoSubmitted: true,
      user: { select: userSelect },
    },
  });
  const list = rows.map((a) => ({ ...a, score: a.score || 0, timeMs: timeTaken(a) })).sort(better);
  let rank = 0;
  list.forEach((a, i) => {
    if (i === 0 || !tied(a, list[i - 1])) rank = i + 1;
    a.rank = rank;
  });
  return list;
};

// Where a score would land among the board's entries, leaving out `exceptUserId`'s
// own entry: 1 + how many are strictly ahead of it.
const wouldRank = (list, entry, exceptUserId) =>
  1 + list.filter((x) => x.userId !== exceptUserId && better(x, entry) < 0 && !tied(x, entry)).length;

// Accuracy as the result page counts it: (correct + half of partly correct) ÷ attempted.
const accuracyOf = (a) => {
  const tried = (a.correct || 0) + (a.wrong || 0) + (a.partial || 0);
  return tried ? Math.round((((a.correct || 0) + (a.partial || 0) * 0.5) / tried) * 100) : null;
};

const firstName = (name) => String(name || '').trim().split(/\s+/)[0] || 'Student';

module.exports = { rankedFirstAttempts, wouldRank, accuracyOf, firstName, timeTaken, better, tied };
