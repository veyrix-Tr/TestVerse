/*
  On-screen basic calculator for JEE Advanced tests (the real exam gives one
  from 2027): + − × ÷, √, %, ±, memory. Like any basic calculator it works
  left to right (2 + 3 × 4 = 20) and shows 12 significant digits. Results are
  kept at full precision between steps and only rounded for the display, so
  0.1 + 0.2 shows 0.3 and 1 ÷ 3 × 3 shows 1. Pure logic: calcReducer(state, key).
*/

const DIGITS = 12
const MAX_LEN = 16 // longer plain numbers (0.00000333…) switch to scientific form
export const OPS = ['+', '−', '×', '÷']

export const initialCalc = {
  entry: '0', // what the display shows
  val: null, // the exact number behind a calculated display (null while typing)
  acc: null, // left-hand number waiting for an operator
  op: null, // pending operator
  fresh: true, // the next digit starts a new number
  hasEntry: false, // the display holds a new number (not just the last result)
  memory: 0,
  expr: '', // the line above the display, e.g. "12 × 3 ="
  error: '', // set after an impossible step; only C, CE or a digit clear it
  last: null, // { op, arg } so pressing = again repeats the last step
}

/* A number as the display shows it: 12 significant digits, scientific
   notation only when it won't fit. */
export function fmt(n) {
  if (Object.is(n, -0)) n = 0
  const r = Number(n.toPrecision(DIGITS))
  const s = String(r)
  // significant digits only: "0.333…" has 12, not 13
  const sig = s.replace(/[-.]/g, '').replace(/^0+/, '').length
  if (s.includes('e') || sig > DIGITS || s.length > MAX_LEN) return r.toExponential(DIGITS - 1).replace(/\.?0+e/, 'e')
  return s
}

function apply(a, op, b) {
  if (op === '+') return a + b
  if (op === '−') return a - b
  if (op === '×') return a * b
  return b === 0 ? NaN : a / b
}

const failed = (s, expr, error) => ({ ...initialCalc, memory: s.memory, entry: 'Error', expr, error })

// Show a calculated number (kept exact in `val`), or the error state
function show(s, n, expr, more) {
  if (!Number.isFinite(n)) return failed(s, expr, 'Number too large')
  return { ...s, entry: fmt(n), val: n, expr, ...more }
}

export function calcReducer(s, key) {
  if (s.error && !(key === 'C' || key === 'CE' || /^[0-9.]$/.test(key))) return s
  if (s.error) s = { ...initialCalc, memory: s.memory }
  const x = s.val != null ? s.val : Number(s.entry)

  if (/^[0-9]$/.test(key) || key === '.') {
    let e = s.fresh ? '0' : s.entry
    if (key === '.') {
      if (e.includes('.')) return s
      e += '.'
    } else {
      if (e.replace(/[-.]/g, '').length >= DIGITS) return s
      e = e === '0' ? key : e === '-0' ? '-' + key : e + key
    }
    return { ...s, entry: e, val: null, fresh: false, hasEntry: true }
  }

  if (OPS.includes(key)) {
    if (s.op && !s.hasEntry) return { ...s, op: key, expr: fmt(s.acc) + ' ' + key } // change of mind
    let acc = x
    if (s.op) {
      acc = apply(s.acc, s.op, x)
      if (s.op === '÷' && x === 0) return failed(s, fmt(s.acc) + ' ÷ 0', 'Cannot divide by zero')
    }
    return show(s, acc, fmt(acc) + ' ' + key, { acc, op: key, fresh: true, hasEntry: false })
  }

  switch (key) {
    case '=': {
      let a, op, b
      if (s.op) [a, op, b] = [s.acc, s.op, s.hasEntry ? x : s.acc]
      else if (s.last) [a, op, b] = [x, s.last.op, s.last.arg]
      else return { ...s, expr: fmt(x) + ' =', fresh: true, hasEntry: false }
      const expr = fmt(a) + ' ' + op + ' ' + fmt(b) + ' ='
      if (op === '÷' && b === 0) return failed(s, expr, 'Cannot divide by zero')
      return show(s, apply(a, op, b), expr, { acc: null, op: null, fresh: true, hasEntry: false, last: { op, arg: b } })
    }
    case '√': {
      const expr = (s.op ? fmt(s.acc) + ' ' + s.op + ' ' : '') + '√(' + fmt(x) + ')'
      if (x < 0) return failed(s, expr, 'Invalid input')
      return show(s, Math.sqrt(x), expr, { fresh: true, hasEntry: true })
    }
    case '%': {
      // a + b% = a + (a × b / 100); a × b% = a × (b / 100); on its own, b / 100
      const p = s.op === '+' || s.op === '−' ? (s.acc * x) / 100 : x / 100
      return show(s, p, (s.op ? fmt(s.acc) + ' ' + s.op + ' ' : '') + fmt(p), { fresh: true, hasEntry: true })
    }
    case '±':
      if (s.val != null) return show(s, -s.val, s.expr, { hasEntry: true })
      if (s.entry === '0') return s
      return { ...s, entry: s.entry.startsWith('-') ? s.entry.slice(1) : '-' + s.entry, hasEntry: true }
    case '⌫': {
      if (s.fresh) return s
      const e = s.entry.slice(0, -1)
      return { ...s, entry: e === '' || e === '-' ? '0' : e, val: null }
    }
    case 'CE':
      return { ...s, entry: '0', val: null, fresh: false, hasEntry: true }
    case 'C':
      return { ...initialCalc, memory: s.memory }
    case 'MC':
      return { ...s, memory: 0 }
    case 'MR':
      return show(s, s.memory, s.expr, { fresh: true, hasEntry: true })
    case 'M+':
      return { ...s, memory: s.memory + x, fresh: true }
    case 'M−':
      return { ...s, memory: s.memory - x, fresh: true }
  }
  return s
}

/* Keyboard key -> calculator key (null = not a calculator key). */
export function keyOf(e) {
  // Number-pad digits count even with Num Lock off (when they'd be Home, arrows …)
  if (/^Numpad[0-9]$/.test(e.code || '')) return e.code.slice(6)
  if (e.code === 'NumpadDecimal') return '.'
  const k = e.key
  if (/^[0-9.]$/.test(k)) return k
  if (k === ',') return '.'
  if (k === '+') return '+'
  if (k === '-') return '−'
  if (k === '*' || k === 'x' || k === 'X') return '×'
  if (k === '/') return '÷'
  if (k === '%') return '%'
  if (k === 'Enter' || k === '=') return '='
  if (k === 'Backspace') return '⌫'
  if (k === 'Delete') return 'CE'
  if (k === 'c' || k === 'C') return 'C'
  return null // Escape closes the calculator instead (Calculator.jsx)
}
