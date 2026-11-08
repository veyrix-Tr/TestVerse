import { api } from '../../lib/api.js'
import { getToken } from '../../lib/session.js'

/*
  Admin test endpoints (backend/controllers/adminTestsController.js).
  Every call sends the signed-in admin's token; errors are ApiError
  (.status, .field, .message, .data.errors).
*/
const call = (path, opts = {}) => api('/admin' + path, { ...opts, token: getToken() })

export const listTests = () => call('/tests').then((r) => r.tests)
export const getTest = (id) => call('/tests/' + encodeURIComponent(id)).then((r) => r.test)
export const validatePaper = (body) => call('/tests/validate', { body })
export const createTest = (body) => call('/tests', { body }).then((r) => r.test)
export const updateTest = (id, body) => call('/tests/' + encodeURIComponent(id), { body, method: 'PUT' }).then((r) => r.test)
export const setPublished = (id, on) =>
  call('/tests/' + encodeURIComponent(id) + (on ? '/publish' : '/unpublish'), { body: {} }).then((r) => r.test)
export const deleteTest = (id) => call('/tests/' + encodeURIComponent(id), { method: 'DELETE' })

/* Number of tests for the sidebar count; null when it can't be loaded. */
export function loadTestCount() {
  return listTests()
    .then((t) => t.length)
    .catch(() => null)
}

export const DEFAULT_MARKING = {
  single: { correct: 4, wrong: -1 },
  multiple: { correct: 4, wrong: -2, partial: true },
  integer: { correct: 4, wrong: 0 },
  numerical: { correct: 4, wrong: 0 },
}

export const TYPES = [
  { key: 'single', label: 'Single correct', short: 'Single' },
  { key: 'multiple', label: 'Multiple correct', short: 'Multiple' },
  { key: 'integer', label: 'Integer', short: 'Integer' },
  { key: 'numerical', label: 'Numerical', short: 'Numerical' },
]

export const typeLabel = (k) => (TYPES.find((t) => t.key === k) || {}).label || k

/* +4, −1, 0 (true minus sign) */
export function signed(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return '–'
  if (v > 0) return '+' + v
  if (v < 0) return '−' + Math.abs(v)
  return '0'
}

export const EXAM_LABEL = { jee: 'JEE', neet: 'NEET' }

/* ISO -> "12 Nov 2026, 2:00 pm" */
export function when(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d)) return ''
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
}

/* ISO -> value for <input type="datetime-local"> in the admin's own time zone */
export function toLocalInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d)) return ''
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

/* datetime-local value -> ISO (or null when empty) */
export function fromLocalInput(v) {
  if (!v) return null
  const d = new Date(v)
  return isNaN(d) ? v : d.toISOString()
}
