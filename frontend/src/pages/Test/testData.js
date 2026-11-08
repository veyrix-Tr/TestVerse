/*
  Turns the test API's replies (backend/controllers/testsController.js) into
  the shapes the CBT views use.
*/
import { flatten } from './data/papers.js'

const EXAM_LABELS = { jee: 'JEE', neet: 'NEET', 'jee-main': 'JEE Main', 'jee-advanced': 'JEE Advanced' }

export function examLabel(exam) {
  return EXAM_LABELS[exam] || (exam ? String(exam).toUpperCase() : '')
}

/* Test details + paper -> the `paper` object the views read
   (title, exam, durationMin, languages, sections …). Questions without a
   chapter are grouped as "Other questions" in the analysis. */
export function paperOf(test) {
  const sections = test.paper.sections.map((s) => ({
    ...s,
    questions: s.questions.map((q) => (q.chapter ? q : { ...q, chapter: 'Other questions' })),
  }))
  return {
    id: test.id,
    title: test.title,
    subject: test.subject,
    exam: examLabel(test.exam) || test.subject,
    durationMin: test.durationMin,
    opensAt: test.opensAt,
    closesAt: test.closesAt,
    instructions: test.instructions || '',
    languages: test.paper.languages && test.paper.languages.length ? test.paper.languages : ['en'],
    sections,
  }
}

export { flatten }

/* Server attempt (+ the device's backup of the same attempt) -> the view's attempt:
   { startedAt, deadline, durationMs (ms), responses, current, lang, tabSwitches,
     submittedAt, autoSubmitted, score, maxScore }.
   The backup wins for responses only when it holds changes the server hasn't
   confirmed yet (pending); position, language and tab switches are device-only. */
export function attemptOf(sa, local, nQuestions) {
  const startedAt = Date.parse(sa.startedAt)
  const deadline = Date.parse(sa.deadline)
  const same = !!local && local.startedAt === startedAt
  const responses = same && local.pending && local.responses ? local.responses : sa.responses || {}
  const current = same && Number.isInteger(local.current) && local.current < nQuestions ? local.current : 0
  return {
    startedAt,
    deadline,
    durationMs: deadline - startedAt,
    responses,
    current,
    lang: (same && local.lang) || 'en',
    tabSwitches: (same && local.tabSwitches) || 0,
    warned5: !!(same && local.warned5),
    submittedAt: sa.submittedAt ? Date.parse(sa.submittedAt) : null,
    autoSubmitted: !!sa.autoSubmitted,
    score: sa.score,
    maxScore: sa.maxScore,
  }
}
