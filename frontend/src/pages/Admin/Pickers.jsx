import { useEffect, useId, useRef, useState } from 'react'
import { useDebounced, useStudentSearch } from './pickerHooks.js'
import Dropdown from './Dropdown.jsx'
import { EXAM_OPTIONS, GRADE_OPTIONS, allStudents, examClass, studentsKey } from './studentsApi.js'

/* Removable chip: "Revision group  Remove" */
export function Chip({ children, sub, onRemove, busy, removeLabel }) {
  return (
    <span className="sg-chip">
      <span className="sg-chip-t">
        {children}
        {sub && <small>{sub}</small>}
      </span>
      {onRemove && (
        <button type="button" onClick={onRemove} disabled={busy} aria-label={removeLabel || 'Remove'}>
          Remove
        </button>
      )}
    </span>
  )
}

/*
  A button that opens a searchable list; choosing an option calls onPick.
  Options: [{ id, label, sub, tag: { cls, text }, disabled, note }].
  Either pass `options` (filtered here) or `search(q)` returning a Promise of
  options (for server searches).
*/
export function OptionPicker({ label, title, options, search, onPick, placeholder = 'Search', empty = 'Nothing matches.', disabled, busy, align }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const [remote, setRemote] = useState(null)
  const wrap = useRef(null)
  const input = useRef(null)
  const listId = useId()
  const dq = useDebounced(q, search ? 250 : 0)

  useEffect(() => {
    if (!open || !search) return
    let live = true
    search(dq).then(
      (o) => live && setRemote({ q: dq, list: o }),
      (e) => live && setRemote({ q: dq, list: [], error: e.message }),
    )
    return () => {
      live = false
    }
  }, [open, dq, search])

  useEffect(() => {
    if (!open) return
    const off = (e) => {
      if (wrap.current && !wrap.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', off)
    return () => document.removeEventListener('mousedown', off)
  }, [open])

  const needle = q.trim().toLowerCase()
  const list = search
    ? (remote && remote.list) || []
    : (options || []).filter((o) => !needle || (o.label + ' ' + (o.sub || '') + ' ' + (o.tag ? o.tag.text : '')).toLowerCase().includes(needle))
  const loading = search && (!remote || remote.q !== q)

  function choose(o) {
    if (!o || o.disabled) return
    setOpen(false)
    setQ('')
    onPick(o)
  }

  function toggle() {
    setOpen((v) => !v)
    setQ('')
    setActive(0)
    setTimeout(() => input.current && input.current.focus(), 0)
  }

  function onKey(e) {
    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, list.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      choose(list[active])
    }
  }

  return (
    <div className={'sg-pick' + (align === 'right' ? ' right' : '')} ref={wrap}>
      <button className="btn btn-outline btn-sm" type="button" aria-expanded={open ? 'true' : 'false'} onClick={toggle} disabled={disabled || busy}>
        {busy ? 'Saving…' : label}
      </button>
      {open && (
        <div className="sg-pop" role="dialog" aria-label={title || label}>
          {title && <b className="sg-pop-title">{title}</b>}
          <input
            ref={input}
            className="input"
            data-live-ok
            value={q}
            placeholder={placeholder}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-label={placeholder}
            onChange={(e) => {
              setQ(e.target.value)
              setActive(0)
            }}
            onKeyDown={onKey}
          />
          <ul className="sg-pop-list" id={listId} role="listbox">
            {loading && !list.length ? (
              <li className="sg-pop-none">Searching…</li>
            ) : remote && remote.error ? (
              <li className="sg-pop-none">{remote.error}</li>
            ) : !list.length ? (
              <li className="sg-pop-none">{empty}</li>
            ) : (
              list.map((o, i) => (
                <li
                  key={o.id}
                  role="option"
                  aria-selected={i === active ? 'true' : 'false'}
                  aria-disabled={o.disabled ? 'true' : undefined}
                  className={(i === active ? 'on' : '') + (o.disabled ? ' off' : '')}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(o)}
                >
                  <span className="sg-pop-main">
                    <b>{o.label}</b>
                    {o.sub && <small>{o.sub}</small>}
                    {o.note && <small className="sg-pop-note">{o.note}</small>}
                  </span>
                  {o.tag && <span className={'pill ' + o.tag.cls}>{o.tag.text}</span>}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

/*
  Search-and-tick list of students for building a group.
  `selected`: array of student rows; `exclude`: Set of ids already in.
*/
/*
  Tick-list of students for forming a group. Paid students only by default
  (only they can take group tests). Filter by search, class and exam;
  "Select all" ticks every student matching the filters, not only those shown.
*/
const CHIPS_SHOWN = 12

export function StudentMultiPicker({ selected, onChange, exclude, autoFocus, paidOnly = true }) {
  const [q, setQ] = useState('')
  const [grade, setGrade] = useState('')
  const [exam, setExam] = useState('')
  const [allKey, setAllKey] = useState(null) // filters "Select all" was used with
  const [selecting, setSelecting] = useState(false)
  const [selErr, setSelErr] = useState(null)
  const filters = { q, plan: paidOnly ? 'paid' : '', grade, exam }
  const { list, total, error, pending } = useStudentSearch(filters, 30)
  const chosen = new Set(selected.map((s) => s.id))
  const shown = (list || []).filter((s) => !exclude || !exclude.has(s.id))
  const key = studentsKey(filters)
  const allTicked = allKey === key && shown.length > 0 && shown.every((s) => chosen.has(s.id))
  const filtered = !!(q.trim() || grade || exam)

  function toggle(s) {
    onChange(chosen.has(s.id) ? selected.filter((x) => x.id !== s.id) : [...selected, s])
  }

  async function toggleAll() {
    setSelErr(null)
    if (allTicked) {
      // untick everyone matching these filters
      setSelecting(true)
      try {
        const ids = new Set((await allStudents(filters)).map((s) => s.id))
        onChange(selected.filter((s) => !ids.has(s.id)))
        setAllKey(null)
      } catch (e) {
        setSelErr(e.message)
      } finally {
        setSelecting(false)
      }
      return
    }
    setSelecting(true)
    try {
      const all = (await allStudents(filters)).filter((s) => (!exclude || !exclude.has(s.id)) && !chosen.has(s.id))
      onChange([...selected, ...all])
      setAllKey(key)
    } catch (e) {
      setSelErr(e.message)
    } finally {
      setSelecting(false)
    }
  }

  const available = Math.max(0, total - (exclude ? (list || []).filter((s) => exclude.has(s.id)).length : 0))

  return (
    <div className="sg-multi">
      <div className="sg-multi-top">
        <label className="sr" htmlFor="sg-multi-q">
          Search students
        </label>
        <input
          id="sg-multi-q"
          className="input"
          data-live-ok
          value={q}
          autoFocus={autoFocus}
          placeholder="Search name, email, mobile or city"
          onChange={(e) => setQ(e.target.value)}
        />
        <Dropdown id="sg-multi-grade" label="Class" value={grade} onChange={setGrade} options={GRADE_OPTIONS} />
        <Dropdown id="sg-multi-exam" label="Exam" value={exam} onChange={setExam} options={EXAM_OPTIONS} />
      </div>
      <div className="sg-multi-bar">
        <label className={'check sg-all' + (selecting ? ' is-busy' : '')}>
          <input type="checkbox" checked={allTicked} disabled={selecting || !shown.length} onChange={toggleAll} />
          <span>{selecting ? 'Selecting…' : allTicked ? `All ${available} selected` : `Select all ${list ? available : ''}${filtered ? ' matching' : ''}`.trim()}</span>
        </label>
        <span className="hint">
          {paidOnly ? 'Paid students only. ' : ''}
          {selected.length ? plural(selected.length) + ' chosen' : 'Tick students to add them.'}
        </span>
        {selected.length > 0 && (
          <button
            type="button"
            className="linkbtn sg-clear-all"
            onClick={() => {
              onChange([])
              setAllKey(null)
            }}
          >
            Clear
          </button>
        )}
      </div>
      {selErr && (
        <p className="err" role="alert">
          {selErr}
        </p>
      )}
      {selected.length > 0 && (
        <div className="sg-chips">
          {selected.slice(0, CHIPS_SHOWN).map((s) => (
            <Chip key={s.id} onRemove={() => toggle(s)} removeLabel={'Remove ' + s.name}>
              {s.name}
            </Chip>
          ))}
          {selected.length > CHIPS_SHOWN && <span className="hint sg-chips-more">and {selected.length - CHIPS_SHOWN} more</span>}
        </div>
      )}
      <ul className={'sg-multi-list' + (pending ? ' pending' : '')} aria-label="Students">
        {error ? (
          <li className="sg-pop-none">{error}</li>
        ) : list == null ? (
          <li className="sg-pop-none">Loading students…</li>
        ) : !shown.length ? (
          <li className="sg-pop-none">
            {filtered
              ? 'No paid student matches these filters.'
              : exclude && exclude.size
                ? 'Every paid student is already in this group.'
                : paidOnly
                  ? 'No paid students yet. Students appear here once they have an active batch.'
                  : 'No students have signed up yet.'}
          </li>
        ) : (
          shown.map((s) => (
            <li key={s.id}>
              <label className="check">
                <input type="checkbox" checked={chosen.has(s.id)} onChange={() => toggle(s)} />
                <span className="sg-multi-main">
                  <b>{s.name}</b>
                  <small>{[s.email, s.batch ? s.batch.name : examClass(s), s.city].filter(Boolean).join(' · ')}</small>
                </span>
              </label>
            </li>
          ))
        )}
      </ul>
      {list && total > list.length && <p className="hint">Showing the newest {list.length} of {total}. Search or filter to find others; Select all includes every match.</p>}
    </div>
  )
}

const plural = (n) => n + (n === 1 ? ' student' : ' students')
