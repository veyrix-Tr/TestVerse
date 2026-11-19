/*
  On-screen basic calculator for JEE Advanced tests (the real exam gives one
  from 2027): + − × ÷, √, %, ±, memory. Like any basic calculator it works
  left to right (2 + 3 × 4 = 20), keeps 12 significant digits, and rounds
  every result so 0.1 + 0.2 shows 0.3. Pure logic: calcReducer(state, key).
*/

const DIGITS = 12
export const OPS = ['+', '−', '×', '÷']

export const initialCalc = {
  entry: '0', // what the display shows
  acc: null, // left-hand number waiting for an operator
  op: null, // pending operator
  fresh: true, // the next digit starts a new number
  hasEntry: false, // the display holds a new number (not just the last result)
  memory: 0,
  expr: '', // the line above the display, e.g. "12 × 3 ="
  error: '', // set after an impossible step; only C, CE or a digit clear it
  last: null, // { op, arg } so pressing = again repeats the last step
}

const round = (n) => Number(n.toPrecision(DIGITS))

/* A number as the display shows it: 12 significant digits, scientific
   notation only when it won't fit. */
export function fmt(n) {
  if (Object.is(n, -0)) n = 0
  const r = round(n)
  const s = String(r)
  // significant digits only: "0.333…" has 12, not 13
  const sig = s.replace(/[-.]/g, '').replace(/^0+/, '').length
  if (s.includes('e') || sig > DIGITS) return r.toExponential(DIGITS - 1).replace(/\.?0+e/, 'e')
  return s
}

function apply(a, op, b) {
  if (op === '+') return a + b
  if (op === '−') return a - b
  if (op === '×') return a * b
  return b === 0 ? NaN : a / b
}

// Result of a step, or the error state when it isn't a usable number
function result(s, n, expr, divByZero) {
  if (!Number.isFinite(n)) {
    return { ...initialCalc, memory: s.memory, entry: 'Error', expr, error: divByZero ? 'Cannot divide by zero' : 'Number too large' }
  }
  return { ...s, entry: fmt(n), expr }
}

export function calcReducer(s, key) {
  if (s.error && !(key === 'C' || key === 'CE' || /^[0-9.]$/.test(key))) return s
  if (s.error) s = { ...initialCalc, memory: s.memory }
  const x = Number(s.entry)

  if (/^[0-9]$/.test(key) || key === '.') {
    let e = s.fresh ? '0' : s.entry
    if (key === '.') {
      if (e.includes('.')) return s
      e += '.'
    } else {
      if (e.replace(/[-.]/g, '').length >= DIGITS) return s
      e = e === '0' ? key : e === '-0' ? '-' + key : e + key
    }
    return { ...s, entry: e, fresh: false, hasEntry: true }
  }

  if (OPS.includes(key)) {
    if (s.op && !s.hasEntry) return { ...s, op: key, expr: fmt(s.acc) + ' ' + key } // change of mind
    let acc = x
    if (s.op) {
      const r = apply(s.acc, s.op, x)
      if (!Number.isFinite(r)) return result(s, r, fmt(s.acc) + ' ' + s.op + ' ' + fmt(x), s.op === '÷' && x === 0)
      acc = round(r)
    }
    return { ...s, entry: fmt(acc), acc, op: key, fresh: true, hasEntry: false, expr: fmt(acc) + ' ' + key }
  }

  switch (key) {
    case '=': {
      let a, op, b
      if (s.op) [a, op, b] = [s.acc, s.op, s.hasEntry ? x : s.acc]
      else if (s.last) [a, op, b] = [x, s.last.op, s.last.arg]
      else return { ...s, expr: fmt(x) + ' =', fresh: true, hasEntry: false }
      const expr = fmt(a) + ' ' + op + ' ' + fmt(b) + ' ='
      const r = apply(a, op, b)
      if (!Number.isFinite(r)) return result(s, r, expr, op === '÷' && b === 0)
      return { ...s, entry: fmt(round(r)), acc: null, op: null, fresh: true, hasEntry: false, expr, last: { op, arg: b } }
    }
    case '√': {
      const head = s.op ? fmt(s.acc) + ' ' + s.op + ' ' : ''
      if (x < 0) return { ...initialCalc, memory: s.memory, entry: 'Error', expr: head + '√(' + fmt(x) + ')', error: 'Invalid input' }
      return { ...result(s, Math.sqrt(x), head + '√(' + fmt(x) + ')'), fresh: true, hasEntry: true }
    }
    case '%': {
      // a + b% = a + (a × b / 100); a × b% = a × (b / 100); on its own, b / 100
      const p = s.op === '+' || s.op === '−' ? (s.acc * x) / 100 : x / 100
      const head = s.op ? fmt(s.acc) + ' ' + s.op + ' ' : ''
      return { ...result(s, p, head + fmt(p)), fresh: true, hasEntry: true }
    }
    case '±':
      if (s.entry === '0') return s
      return { ...s, entry: s.entry.startsWith('-') ? s.entry.slice(1) : '-' + s.entry, hasEntry: true }
    case '⌫': {
      if (s.fresh) return s
      const e = s.entry.slice(0, -1)
      return { ...s, entry: e === '' || e === '-' ? '0' : e }
    }
    case 'CE':
      return { ...s, entry: '0', fresh: false, hasEntry: true }
    case 'C':
      return { ...initialCalc, memory: s.memory }
    case 'MC':
      return { ...s, memory: 0 }
    case 'MR':
      return { ...s, entry: fmt(s.memory), fresh: true, hasEntry: true }
    case 'M+':
      return { ...s, memory: round(s.memory + x), fresh: true }
    case 'M−':
      return { ...s, memory: round(s.memory - x), fresh: true }
  }
  return s
}

/* Keyboard key -> calculator key (null = not a calculator key). */
export function keyOf(e) {
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
