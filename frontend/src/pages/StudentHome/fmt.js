import { fmt } from '../../lib/format.js'

/* Date and text helpers shared by the student pages. */

/* "Sat, 14 Nov, 5:30 pm" */
export const when = (iso) => fmt(iso, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

/* "14 Nov 2026" */
export const day = (iso) => fmt(iso, { day: 'numeric', month: 'short', year: 'numeric' })

/* "2d 4h", "3h 12m", "12m" until a moment */
export function until(ms) {
  const m = Math.max(0, Math.ceil(ms / 60000))
  if (m >= 1440) return Math.floor(m / 1440) + 'd ' + Math.floor((m % 1440) / 60) + 'h'
  if (m >= 60) return Math.floor(m / 60) + 'h ' + (m % 60) + 'm'
  return m + 'm'
}

/* "Physics, Chemistry, Biology" -> ["Physics", "Chemistry", "Biology"] */
export const subjectsOf = (t) => (t.subject || '').split(',').map((x) => x.trim()).filter(Boolean)

/* A test's type: one subject ("Physics") or the full syllabus (several listed) */
export const isFullSyllabus = (t) => subjectsOf(t).length !== 1 || /&|\/|\+| and /i.test(t.subject || '')
export const scopeOf = (t) => (isFullSyllabus(t) ? 'Full syllabus' : subjectsOf(t)[0])
