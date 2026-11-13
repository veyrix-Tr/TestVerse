/*
  Shared CBT helpers. The paper itself comes from the server (GET /api/tests/:id,
  without answers; the paper with correct answers only after submitting. There are
  no written solutions: those are emailed to students outside the website).
  Question shape (backend/lib/paperFormat.js):
    { id, type, chapter?, text:{en,hi?}, options?:[{en,hi?}], answer, tolerance?,
      marks:{correct, wrong, partial?}, video? }
  type: single | multiple | integer | numerical (ar | match are still rendered)
*/
export const AR_OPTIONS = [
  { en: 'Both A and R are true, and R is the correct explanation of A', hi: 'A और R दोनों सत्य हैं, और R, A की सही व्याख्या है' },
  { en: 'Both A and R are true, but R is not the correct explanation of A', hi: 'A और R दोनों सत्य हैं, परंतु R, A की सही व्याख्या नहीं है' },
  { en: 'A is true but R is false', hi: 'A सत्य है परंतु R असत्य है' },
  { en: 'A is false but R is true', hi: 'A असत्य है परंतु R सत्य है' },
]

export const Q_TYPE_LABELS = {
  single: 'Single correct',
  multiple: 'One or more correct',
  integer: 'Integer answer',
  numerical: 'Numerical answer',
  ar: 'Assertion–Reason',
  match: 'Match the following',
}

export function flatten(paper) {
  const flat = []
  paper.sections.forEach((s, si) => s.questions.forEach((q, qi) => flat.push({ q, si, qi, sec: s.name })))
  return flat
}
