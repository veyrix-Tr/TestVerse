import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../../lib/api.js'
import { getToken } from '../../lib/session.js'

/*
  The signed-in student's published tests (GET /api/tests) with their status
  and score. `offset` is the server clock minus this device's clock, so
  countdowns agree with the server. The list reloads when the tab comes back
  into view and when a countdown crosses a boundary (a test opens or closes,
  or an attempt's time runs out).
*/
export function useTests() {
  const [state, setState] = useState({ status: 'loading', tests: [], offset: 0, error: '' })
  const lastLoad = useRef(0)

  const load = useCallback(async (quiet) => {
    lastLoad.current = Date.now()
    if (!quiet) setState((s) => ({ ...s, status: s.tests.length ? s.status : 'loading', error: '' }))
    try {
      const d = await api('/tests', { token: getToken() })
      const t = Date.parse(d.serverNow)
      setState({ status: 'ready', tests: d.tests || [], offset: Number.isFinite(t) ? t - Date.now() : 0, error: '' })
    } catch (e) {
      setState((s) => (quiet && s.status === 'ready' ? s : { ...s, status: 'error', error: e.message }))
    }
  }, [])

  useEffect(() => {
    // state starts as 'loading'; fetch outside the effect's synchronous body
    const first = setTimeout(() => load(true), 0)
    function onVis() {
      if (!document.hidden && Date.now() - lastLoad.current > 5000) load(true)
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearTimeout(first)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [load])

  /* Reload (at most every 10 s) when the list is out of date. */
  const refresh = useCallback(() => {
    if (Date.now() - lastLoad.current > 10000) load(true)
  }, [load])

  return { ...state, reload: load, refresh }
}

/* The status right now, on the server's clock. `stale` means the server would
   say something different, so the list should be reloaded. */
export function statusNow(t, now) {
  const at = (iso) => (iso ? Date.parse(iso) : NaN)
  if (t.status === 'upcoming' && now >= at(t.opensAt)) return { status: 'open', stale: true }
  if (t.status === 'open' && now >= at(t.closesAt)) return { status: 'closed', stale: true }
  if (t.status === 'in-progress' && t.attempt && now >= at(t.attempt.deadline)) return { status: 'in-progress', stale: true }
  return { status: t.status, stale: false }
}

/* Groups in the order the dashboard shows them. */
export const GROUPS = [
  { key: 'in-progress', title: 'In progress', desc: 'The clock is running. Your answers are saved.' },
  { key: 'open', title: 'Available now', desc: 'Start any time before it closes.' },
  { key: 'upcoming', title: 'Upcoming', desc: 'You can read the instructions now and start once it opens.' },
  { key: 'done', title: 'Completed', desc: 'Open a result for your score and answers. Detailed analysis and solutions are sent to your email.' },
  { key: 'closed', title: 'Closed', desc: 'These closed before you started them.' },
]

const ts = (iso) => (iso ? Date.parse(iso) : 0)

export function groupTests(tests, now) {
  const by = Object.fromEntries(GROUPS.map((g) => [g.key, []]))
  for (const t of tests) {
    const s = statusNow(t, now).status
    if (by[s]) by[s].push({ ...t, status: s })
  }
  by['in-progress'].sort((a, b) => ts(a.attempt.deadline) - ts(b.attempt.deadline))
  by.open.sort((a, b) => (ts(a.closesAt) || Infinity) - (ts(b.closesAt) || Infinity))
  by.upcoming.sort((a, b) => ts(a.opensAt) - ts(b.opensAt))
  by.done.sort((a, b) => ts(b.attempt.submittedAt) - ts(a.attempt.submittedAt))
  by.closed.sort((a, b) => ts(b.closesAt) - ts(a.closesAt))
  return by
}

/* Every submitted attempt across all tests, newest first, each with its test
   and the change in score from the student's previous attempt at that test.
   `latest` marks the newest attempt of its test (the one that can be retaken). */
export function resultsOf(tests) {
  const rows = []
  for (const t of tests) {
    const h = t.history || []
    h.forEach((a, i) => {
      const prev = h[i + 1]
      rows.push({ test: t, a, latest: i === 0, delta: prev ? a.score - prev.score : null })
    })
  }
  return rows.sort((x, y) => ts(y.a.submittedAt) - ts(x.a.submittedAt))
}

/* Score as a percentage of the maximum (0–100), or null. */
export const pctOf = (a) => (a && a.maxScore > 0 ? Math.max(0, Math.round((a.score / a.maxScore) * 100)) : null)

/* Share of attempted questions answered correctly (partial counts half), or null. */
export function accuracyOf(a) {
  const tried = (a.correct || 0) + (a.wrong || 0) + (a.partial || 0)
  return tried ? Math.round((((a.correct || 0) + (a.partial || 0) * 0.5) / tried) * 100) : null
}

/* The one test the hero should show: in progress, else available, else the next upcoming. */
export function heroTest(groups) {
  return groups['in-progress'][0] || groups.open[0] || groups.upcoming[0] || null
}

/* Where a test is taken, and where one attempt's result (optionally at its solutions) opens. */
export const testHref = (t) => '/test?test=' + encodeURIComponent(t.id)
export const resultHref = (t, a, hash) => '/student/result?test=' + encodeURIComponent(t.id) + (a ? '&attempt=' + a.attemptNo : '') + (hash ? '#' + hash : '')

/* Headline numbers over every submitted attempt (rows from resultsOf, newest first). */
export function summaryOf(tests, rows) {
  const pcts = rows.map((r) => pctOf(r.a)).filter((p) => p != null)
  const first = rows.length ? pctOf(rows[rows.length - 1].a) : null
  const last = rows.length ? pctOf(rows[0].a) : null
  return {
    taken: tests.filter((t) => (t.history || []).length).length,
    total: tests.length,
    attempts: rows.length,
    best: pcts.length ? Math.max(...pcts) : null,
    avg: pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null,
    // Percentage points from the first attempt to the latest (needs two attempts)
    change: rows.length > 1 && first != null && last != null ? last - first : null,
  }
}

/* "+6 pts" / "−4 pts" / "No change" */
export const signed = (n, unit = '') => (n > 0 ? '+' + n : n < 0 ? '−' + Math.abs(n) : '0') + unit
