export function hasAnswer(q, a) {
  if (a == null || a === '') return false
  if (q.type === 'multiple') return Array.isArray(a) && a.length > 0
  if (q.type === 'integer' || q.type === 'numerical') return String(a).trim() !== '' && !isNaN(Number(a))
  return true
}
