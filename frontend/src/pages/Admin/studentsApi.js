import { api } from '../../lib/api.js'
import { getToken } from '../../lib/session.js'

/*
  Admin student / group / batch endpoints
  (backend/controllers/adminStudentsController.js). Every call sends the
  signed-in admin's token; errors are ApiError (.status, .field, .message).
*/
const call = (path, opts = {}) => api('/admin' + path, { ...opts, token: getToken() })
const id = (v) => encodeURIComponent(v)

export const PAGE = 50

/*
  filters -> query string (empty values left out):
    plan   'paid' (active batch) | 'free' (no active batch) | '' (everyone)
    status for free students: 'none' (no batch) | 'pending' (payment pending)
    batch, group (ids), grade ("Class 11" …), exam ('jee' | 'neet'), q (search)
*/
export function filterParams(f = {}) {
  const p = new URLSearchParams()
  if (f.q && f.q.trim()) p.set('q', f.q.trim())
  if (f.plan === 'free') p.set('status', f.status === 'none' || f.status === 'pending' ? f.status : 'free')
  else if (f.plan === 'paid') p.set('status', 'paid')
  if (f.plan !== 'free' && f.batch) p.set('batch', f.batch)
  if (f.grade) p.set('grade', f.grade)
  if (f.exam) p.set('exam', f.exam)
  if (f.group) p.set('group', f.group)
  return p
}

export function studentsQuery(f, offset = 0, limit = PAGE) {
  const p = filterParams(f)
  p.set('offset', String(offset))
  p.set('limit', String(limit))
  return p.toString()
}

/* Cache key for a students list (cache.js): the same filters give the same key
   on the Students tab and in the pickers, so a loaded list is reused. */
export const studentsKey = (f) => 'students:' + filterParams(f).toString()

export const GRADE_OPTIONS = [
  { value: '', label: 'All classes' },
  { value: 'Class 11', label: '11th' },
  { value: 'Class 12', label: '12th' },
  { value: 'Dropper / repeater', label: 'Dropper' },
]
export const EXAM_OPTIONS = [
  { value: '', label: 'All exams' },
  { value: 'jee', label: 'JEE' },
  { value: 'neet', label: 'NEET' },
]

export const listStudents = (f, offset, limit) => call('/students?' + studentsQuery(f, offset, limit))
export const getStudent = (sid) => call('/students/' + id(sid))
export const giveTestToStudent = (sid, testId) => call('/students/' + id(sid) + '/tests', { body: { testId } })
export const takeTestFromStudent = (sid, testId) => call('/students/' + id(sid) + '/tests/' + id(testId), { method: 'DELETE' })
// Added by the admin, and free access (no payment): a batch (null takes it back), a test series
export const createStudent = (body) => call('/students', { body })
export const setStudentBatch = (sid, batchId) => call('/students/' + id(sid) + '/batch', { body: { batchId }, method: 'PUT' })
export const giveSeries = (sid, seriesId) => call('/students/' + id(sid) + '/series', { body: { seriesId } })
export const takeSeries = (sid, seriesId) => call('/students/' + id(sid) + '/series/' + id(seriesId), { method: 'DELETE' })

export const listGroups = () => call('/groups').then((r) => r.groups)
export const createGroup = (body) => call('/groups', { body }).then((r) => r.group)
export const getGroup = (gid) => call('/groups/' + id(gid))
export const updateGroup = (gid, body) => call('/groups/' + id(gid), { body, method: 'PUT' })
export const addMembers = (gid, studentIds) => call('/groups/' + id(gid) + '/members', { body: { studentIds } })
export const removeMember = (gid, userId) => call('/groups/' + id(gid) + '/members/' + id(userId), { method: 'DELETE' })
export const giveTestToGroup = (gid, testId) => call('/groups/' + id(gid) + '/tests', { body: { testId } })
export const takeTestFromGroup = (gid, testId) => call('/groups/' + id(gid) + '/tests/' + id(testId), { method: 'DELETE' })
export const deleteGroup = (gid) => call('/groups/' + id(gid), { method: 'DELETE' })

export const listBatches = () => call('/batches').then((r) => r.batches)

/* Every student matching the filters (all pages), for the CSV export. */
export async function allStudents(f) {
  const out = []
  for (let offset = 0; ; offset += 500) {
    const r = await listStudents(f, offset, 500)
    out.push(...r.students)
    if (out.length >= r.total || !r.students.length) return out
  }
}

/* ---------- formatting ---------- */

export const EXAM = { 'jee-main': 'JEE Main', 'jee-advanced': 'JEE Advanced', neet: 'NEET' }
export const examText = (e) => EXAM[e] || e || ''
export const gradeText = (g) => (g === 'Dropper / repeater' ? 'Dropper' : g || '')
export const examClass = (s) => [examText(s.exam), gradeText(s.grade)].filter(Boolean).join(' · ')

/* "8 Nov 2026" */
export function day(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d)) return ''
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

/* "8 Nov 2026, 2:05 pm" */
export function dayTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d)) return ''
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
}

/* "just now", "5 min ago", "3 h ago", "yesterday", "4 days ago", else the date */
export function ago(iso, now = Date.now()) {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (isNaN(t)) return ''
  const s = Math.max(0, Math.round((now - t) / 1000))
  if (s < 45) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return m + ' min ago'
  const h = Math.round(m / 60)
  if (h < 24) return h + ' h ago'
  const d = Math.round(h / 24)
  if (d === 1) return 'yesterday'
  if (d < 7) return d + ' days ago'
  return day(iso)
}

/* 2_700_000 -> "45 min", 3_900_000 -> "1 h 5 min", 40_000 -> "40 s" */
export function duration(ms) {
  if (!(ms >= 0)) return ''
  const s = Math.round(ms / 1000)
  if (s < 60) return s + ' s'
  const m = Math.round(s / 60)
  if (m < 60) return m + ' min'
  return Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : '')
}

export const pctText = (p) => (p == null ? '–' : (Math.round(p * 10) / 10).toLocaleString('en-IN') + '%')
export const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many || one + 's')

export function batchState(s) {
  if (!s.batch) return { cls: 'p-draft', text: 'No batch' }
  return s.batch.status === 'active' ? { cls: 'p-published', text: 'Active' } : { cls: 'p-warn', text: 'Pending' }
}

/* Latest activity: last submitted test, else last login. */
export function lastActive(s) {
  const t = s.stats && s.stats.lastAt
  const l = s.lastLoginAt
  if (t && (!l || new Date(t) >= new Date(l))) return { at: t, what: 'Submitted a test' }
  if (l) return { at: l, what: 'Logged in' }
  return null
}

/* List of names -> "A", "A and B", "A, B and C" */
export function andList(parts) {
  if (parts.length <= 1) return parts.join('')
  return parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1]
}

/*
  A test's audience as words.
  full:  "12th JEE, Revision group and 3 students"
  short: "12th JEE, Revision group +3"
*/
export function audienceText(a, short) {
  if (!a || a.mode !== 'custom') return 'Everyone'
  const named = [...(a.batches || []).map((b) => b.name), ...(a.groups || []).map((g) => g.name)]
  const st = a.students || []
  if (!named.length && !st.length) return 'Nobody yet'
  if (short) {
    const shown = named.slice(0, 2)
    const rest = named.length - shown.length + st.length
    if (!shown.length) return st.length === 1 ? st[0].name : plural(st.length, 'student')
    return shown.join(', ') + (rest ? ' +' + rest : '')
  }
  const parts = [...named]
  if (st.length === 1) parts.push(st[0].name)
  else if (st.length) parts.push(plural(st.length, 'student'))
  return andList(parts)
}

/* Downloads rows (first row = header) as a CSV file. */
export function downloadCsv(name, rows) {
  const cell = (v) => {
    let s = String(v == null ? '' : v)
    // Text a student typed (e.g. a name "=HYPERLINK(…)") must not run as a
    // formula in Excel or Sheets: a leading ' makes it plain text. Real
    // numbers (a score of -3) are left alone.
    if (typeof v !== 'number' && /^[=+\-@\t\r]/.test(s)) s = "'" + s
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
  }
  const csv = '﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/* ---------- test audience ---------- */

/*
  value: { mode: 'all' | 'custom', batches: [{id,name}], groups: [{id,name}], students: [{id,name,email}] }
*/
export const EVERYONE = { mode: 'all', batches: [], groups: [], students: [] }

export const audienceFrom = (a) => ({
  mode: a && a.mode === 'custom' ? 'custom' : 'all',
  batches: (a && a.batches) || [],
  groups: (a && a.groups) || [],
  students: (a && a.students) || [],
})

export const audienceBody = (a) => ({
  mode: a.mode,
  batchIds: a.mode === 'custom' ? a.batches.map((x) => x.id) : [],
  groupIds: a.mode === 'custom' ? a.groups.map((x) => x.id) : [],
  studentIds: a.mode === 'custom' ? a.students.map((x) => x.id) : [],
})

