import { useEffect, useState } from 'react'
import { examClass, listStudents } from './studentsApi.js'

/* Text input whose value settles after `ms` (for server searches). */
export function useDebounced(value, ms = 250) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

/* Students matching a search, from the server. */
export function useStudentSearch(q, limit = 20) {
  const dq = useDebounced(q)
  const [state, setState] = useState({ q: null, list: null, total: 0, error: null })
  useEffect(() => {
    let live = true
    listStudents({ q: dq }, 0, limit)
      .then((r) => live && setState({ q: dq, list: r.students, total: r.total, error: null }))
      .catch((e) => live && setState((s) => ({ ...s, q: dq, error: e.message })))
    return () => {
      live = false
    }
  }, [dq, limit])
  return { ...state, pending: state.q !== q }
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

