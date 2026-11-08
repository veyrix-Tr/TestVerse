/* Formatting helpers taken from the design scripts (design/*.html). */

export function pad(n) {
  return (n < 10 ? '0' : '') + n
}

/* ₹999 */
export function money(n) {
  return '₹' + Math.round(n).toLocaleString('en-IN')
}

/* Same as money(); the student pages call it rupee(). */
export const rupee = money

/* '₹1,500' — the student home uses this exact helper. */
export function rupeeLabel(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN')
}

/* 02:41:18 from milliseconds */
export function hms(ms) {
  const s = Math.max(0, Math.floor(ms / 1000))
  return pad(Math.floor(s / 3600)) + ':' + pad(Math.floor((s % 3600) / 60)) + ':' + pad(s % 60)
}

/* 17m 04s from milliseconds */
export function mmss(ms) {
  const s = Math.round(ms / 1000)
  return Math.floor(s / 60) + 'm ' + pad(s % 60) + 's'
}

export function fmt(iso, opts) {
  return new Date(iso).toLocaleString('en-IN', opts || { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
}

export function greet() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

/* Copy to clipboard with a graceful fallback. */
export function copyText(text) {
  return navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()
}
