/*
  SCORING. The real app must run this ON THE SERVER after submission, using
  the stored answer key. Kept here (copied verbatim from design/test.html) so
  the developer can copy the exact rules.
*/
import { hasAnswer } from './answers.js'

export { hasAnswer }

export function scoreQuestion(q, r) {
  // NTA rule: "answered and marked for review" IS evaluated; "marked" without an answer is not.
  const a = r && r.answer
  if (!hasAnswer(q, a)) return { status: 'skipped', marks: 0 }
  const m = q.marks
  switch (q.type) {
    case 'single':
    case 'ar':
    case 'match':
      return a === q.answer ? { status: 'correct', marks: m.correct } : { status: 'wrong', marks: m.wrong }
    case 'integer':
      return Number(a) === q.answer ? { status: 'correct', marks: m.correct } : { status: 'wrong', marks: m.wrong }
    case 'numerical':
      return Math.abs(Number(a) - q.answer) <= (q.tolerance || 0) ? { status: 'correct', marks: m.correct } : { status: 'wrong', marks: m.wrong }
    case 'multiple': {
      const chosenWrong = a.some((x) => q.answer.indexOf(x) < 0)
      if (chosenWrong) return { status: 'wrong', marks: m.wrong }
      if (a.length === q.answer.length) return { status: 'correct', marks: m.correct }
      // JEE Advanced partial marking: +1 for each correct option chosen, when no wrong option is chosen.
      return m.partial ? { status: 'partial', marks: a.length } : { status: 'wrong', marks: m.wrong }
    }
  }
  return { status: 'skipped', marks: 0 }
}

export function computeResult(flat, attempt) {
  const max = flat.reduce((a, f) => a + f.q.marks.correct, 0)
  // lost = full marks of wrong (and the missing part of partly correct) answers plus negative marks;
  // left = full marks of skipped questions. total + lost + left = max.
  const res = { total: 0, max, correct: 0, wrong: 0, partial: 0, skipped: 0, negative: 0, lost: 0, left: 0, sections: {}, chapters: {}, items: [], timeMs: 0 }
  flat.forEach((f, i) => {
    const r = attempt.responses[f.q.id] || {}
    const sc = scoreQuestion(f.q, r)
    const t = r.timeMs || 0
    res.total += sc.marks
    res[sc.status]++
    res.timeMs += t
    if (sc.marks < 0) res.negative += -sc.marks
    if (sc.status === 'skipped') res.left += f.q.marks.correct
    else res.lost += f.q.marks.correct - sc.marks
    const S = (res.sections[f.sec] = res.sections[f.sec] || { marks: 0, max: 0, correct: 0, wrong: 0, partial: 0, skipped: 0, time: 0, n: 0 })
    S.marks += sc.marks
    S.max += f.q.marks.correct
    S[sc.status]++
    S.time += t
    S.n++
    const C = (res.chapters[f.q.chapter] = res.chapters[f.q.chapter] || { right: 0, n: 0, lost: 0, sec: f.sec })
    C.n++
    if (sc.status === 'correct') C.right++
    C.lost += f.q.marks.correct - sc.marks
    res.items.push({ f, n: i + 1, r, sc, time: t })
  })
  return res
}
