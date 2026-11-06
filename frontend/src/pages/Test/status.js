import { hasAnswer } from './answers.js'

/* Palette status of a question: nv | na | an | mr | am (design status()) */
export function statusOf(a, q) {
  const r = a.responses[q.id]
  if (!r || !r.visited) return 'nv'
  const ans = hasAnswer(q, r.answer)
  if (r.marked) return ans ? 'am' : 'mr'
  return ans ? 'an' : 'na'
}

export function countsOf(a, list) {
  const c = { nv: 0, na: 0, an: 0, mr: 0, am: 0 }
  list.forEach((f) => c[statusOf(a, f.q)]++)
  return c
}

export const STATUS_LABEL = {
  nv: 'not visited',
  na: 'not answered',
  an: 'answered',
  mr: 'marked for review',
  am: 'answered and marked',
}
