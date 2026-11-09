import { useEffect, useState } from 'react'
import { cached, remember } from './cache.js'
import { examClass, listStudents, studentsKey } from './studentsApi.js'

/* Text input whose value settles after `ms` (for server searches). */
export function useDebounced(value, ms = 250) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

/* A list already loaded: by a picker before, or by the Students tab with the
   same filters (studentsKey). Returns { list, total } or null. */
function known(f) {
  const hit = cached(studentsKey(f))
  return hit ? { list: hit.data.students, total: hit.data.total } : null
}

/* Students matching filters { q, plan, grade, exam }. A list that's already
   loaded shows at once without asking the server again; new ones are fetched
   and remembered. Only the search text is debounced. */
export function useStudentSearch(filters, limit = 20) {
  const dq = useDebounced(filters.q || '')
  const f = { ...filters, q: dq }
  const key = studentsKey(f)
  const [state, setState] = useState({ key: null, list: null, total: 0, error: null })
  const hit = known(f)
  useEffect(() => {
    const want = JSON.parse(JSON.stringify(f))
    if (known(want)) return undefined
    let live = true
    listStudents(want, 0, limit)
      .then((r) => {
        remember(studentsKey(want), r)
        if (live) setState({ key, list: r.students, total: r.total, error: null })
      })
      .catch((e) => live && setState((s) => ({ ...s, key, error: e.message })))
    return () => {
      live = false
    }
    // `key` stands for every filter value
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, limit])
  const result = hit ? { key, list: hit.list.slice(0, limit), total: hit.total, error: null } : state
  return { ...result, pending: result.key !== key || dq !== (filters.q || '') }
}

/* Student rows -> OptionPicker options */
export const studentOption = (s, taken) => ({
  id: s.id,
  label: s.name,
  sub: [s.email, s.batch ? s.batch.name : examClass(s), s.city].filter(Boolean).join(' · '),
  student: s,
  disabled: taken ? taken.has(s.id) : false,
  note: taken && taken.has(s.id) ? 'Already added' : undefined,
})

