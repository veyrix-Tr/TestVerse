import { useEffect, useId, useRef, useState } from 'react'

/*
  The admin's dropdown (replaces the browser's <select>, whose list was cut
  short and didn't follow the theme). A button shows the chosen option; the
  list opens below with every option visible.
  Keyboard: Enter / Space / ArrowDown open; Arrow keys, Home, End move;
  Enter picks; Escape or Tab closes.
  options: [{ value, label }]
*/
export default function Dropdown({ id, label, value, options, onChange, disabled, className = '' }) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const rootRef = useRef(null)
  const btnRef = useRef(null)
  const listId = useId()
  const current = options.find((o) => o.value === value) || options[0]

  useEffect(() => {
    if (!open) return undefined
    const away = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', away)
    return () => document.removeEventListener('mousedown', away)
  }, [open])

  function show() {
    setActive(Math.max(0, options.findIndex((o) => o.value === value)))
    setOpen(true)
  }

  function pick(o) {
    setOpen(false)
    btnRef.current?.focus()
    if (o.value !== value) onChange(o.value)
  }

  function onKey(e) {
    if (!open) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
        e.preventDefault()
        show()
      }
      return
    }
    const last = options.length - 1
    if (e.key === 'ArrowDown') setActive((i) => Math.min(last, i + 1))
    else if (e.key === 'ArrowUp') setActive((i) => Math.max(0, i - 1))
    else if (e.key === 'Home') setActive(0)
    else if (e.key === 'End') setActive(last)
    else if (e.key === 'Enter' || e.key === ' ') pick(options[active])
    else if (e.key === 'Escape') setOpen(false)
    else if (e.key === 'Tab') return setOpen(false)
    else return
    e.preventDefault()
  }

  return (
    <div className={'dd ' + className + (open ? ' is-open' : '')} ref={rootRef}>
      <button
        ref={btnRef}
        id={id}
        type="button"
        className="input dd-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={label + ': ' + current.label}
        disabled={disabled}
        data-live-ok
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKey}
      >
        <span className="dd-value">{current.label}</span>
      </button>
      {open && (
        <ul className="dd-list" id={listId} role="listbox" aria-label={label} aria-activedescendant={listId + '-' + active} tabIndex={-1}>
          {options.map((o, i) => (
            <li
              key={o.value}
              id={listId + '-' + i}
              role="option"
              aria-selected={o.value === value}
              className={(i === active ? 'is-active' : '') + (o.value === value ? ' is-chosen' : '')}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(o)}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
