import { useEffect, useReducer, useRef, useState } from 'react'
import { calcReducer, initialCalc, keyOf } from '../calc.js'

// Rows of a basic calculator; "=" spans two rows and "0" two columns (Test.css)
const KEYS = [
  ['MC', 'MR', 'M+', 'M−'],
  ['C', 'CE', '⌫', '÷'],
  ['√', '%', '±', '×'],
  ['7', '8', '9', '−'],
  ['4', '5', '6', '+'],
  ['1', '2', '3', '='],
  ['0', '.'],
]
const NAME = {
  MC: 'Memory clear', MR: 'Memory recall', 'M+': 'Memory add', 'M−': 'Memory subtract',
  C: 'Clear all', CE: 'Clear entry', '⌫': 'Backspace', '÷': 'Divide', '×': 'Multiply', '−': 'Minus', '+': 'Plus',
  '=': 'Equals', '√': 'Square root', '%': 'Percent', '±': 'Change sign', '.': 'Decimal point',
}
const kind = (k) => (k === '=' ? ' k-eq' : '÷×−+'.includes(k) ? ' k-op' : k.startsWith('M') ? ' k-mem' : k === 'C' || k === 'CE' || k === '⌫' ? ' k-clr' : k === '0' ? ' k-0' : '')

const SMALL = '(max-width: 640px)'
const isSmall = () => typeof window !== 'undefined' && window.matchMedia(SMALL).matches

/*
  The on-screen basic calculator of JEE Advanced tests. On a laptop it floats
  and can be dragged by its title bar; on a phone it opens from the bottom.
  It stays mounted while closed, so the number on it is still there when the
  student opens it again.

  While it is open the keyboard belongs to it wherever the focus is (after
  clicking "Save & next", say), so typing 2*3 Enter can never pick options or
  press a focused button; Test.jsx turns its shortcuts off meanwhile. Only
  the answer box (an input) and an open dialog keep their keys. `paused` (the
  question palette sheet is open on top of it) hands the keyboard back too.
*/
export default function Calculator({ open, onClose, paused }) {
  const [s, press] = useReducer(calcReducer, initialCalc)
  const [pos, setPos] = useState(null) // { x, y } once dragged; null = default corner
  const [small, setSmall] = useState(isSmall)
  const ref = useRef(null)
  const drag = useRef(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    const mq = window.matchMedia(SMALL)
    const on = () => setSmall(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  // Opening puts the keyboard on the calculator
  useEffect(() => {
    if (open) ref.current?.focus()
  }, [open])

  // Keep a dragged calculator on screen: on opening and when the window
  // changes size. Only while it is open and floating, because a closed one
  // measures 0 × 0 and the phone panel has a different size.
  useEffect(() => {
    if (small || !open) return undefined
    const fit = () => setPos((p) => (p ? clamp(p.x, p.y) : p))
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [small, open])

  // The keyboard (see the note above). Capture phase, so it runs before the
  // exam's own key handling and before a focused button reacts to Enter.
  useEffect(() => {
    if (!open || paused) return undefined
    function onKey(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const t = e.target
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      if (document.querySelector('dialog[open]')) return
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        closeRef.current()
        return
      }
      const k = keyOf(e)
      if (!k) return
      e.preventDefault()
      e.stopPropagation()
      press(k)
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [open, paused])

  // Inside the window, title bar always reachable (even on a very short screen)
  function clamp(x, y) {
    const el = ref.current
    const w = el.offsetWidth
    const h = el.offsetHeight
    return { x: Math.max(8, Math.min(x, window.innerWidth - w - 8)), y: Math.max(8, Math.min(y, window.innerHeight - h - 8)) }
  }

  function onPointerDown(e) {
    if (small || e.button !== 0 || e.target.closest('button')) return
    const r = ref.current.getBoundingClientRect()
    drag.current = { dx: e.clientX - r.left, dy: e.clientY - r.top }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function onPointerMove(e) {
    if (drag.current) setPos(clamp(e.clientX - drag.current.dx, e.clientY - drag.current.dy))
  }
  function onPointerUp() {
    drag.current = null
  }

  const shown = s.entry.replace(/-/g, '−')
  return (
    <div
      ref={ref}
      id="calc"
      className={'calc' + (small ? ' docked' : '')}
      role="dialog"
      aria-label="Calculator"
      tabIndex={-1}
      hidden={!open}
      style={!small && pos ? { left: pos.x, top: pos.y, right: 'auto' } : undefined}
    >
      <div className="calc-head" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
        <span className="calc-title">Calculator</span>
        <button className="calc-x" type="button" aria-label="Close calculator" onClick={onClose}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
      <div className="calc-screen">
        <div className="calc-expr">{s.error || s.expr.replace(/-/g, '−') || ' '}</div>
        <output className={'calc-val' + (shown.length > 15 ? ' longer' : shown.length > 11 ? ' long' : '')} aria-live="polite">
          {shown}
        </output>
        {s.memory !== 0 ? (
          <span className="calc-m" title="A number is stored in memory">
            M
          </span>
        ) : null}
      </div>
      <div className="calc-keys">
        {KEYS.flat().map((k) => (
          <button key={k} type="button" className={'calc-k' + kind(k)} aria-label={NAME[k]} onClick={() => press(k)}>
            {k}
          </button>
        ))}
      </div>
    </div>
  )
}
