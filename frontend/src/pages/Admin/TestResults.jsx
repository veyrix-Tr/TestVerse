import { useCallback, useEffect, useMemo, useState } from 'react'
import BackButton from '../../components/BackButton.jsx'
import { downloadCsv } from './studentsApi.js'
import { EXAM_LABEL, getTestResults, when } from './testsApi.js'

/*
  Admin › a test's Results: the leaderboard (first attempts only, as ranked
  by the server: higher score, then less time, then earlier submission; equal
  score + time share a rank) and every student's result, with search and a
  CSV export. Opened from the tests list (TestsAdmin) and from a series
  (SeriesAdmin). The admin sees full names and contact details; students
  only ever see first names on their own leaderboard.
*/

const KIND = { free: 'Free test', live: 'Live test', series: 'Test series' }

/* 9_672_000 -> "2 h 41 min", 2_772_000 -> "46 min 12 s", 38_000 -> "38 s" */
function duration(ms) {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return '–'
  const s = Math.round(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h) return h + ' h' + (m ? ' ' + m + ' min' : '')
  if (m) return m + ' min' + (sec ? ' ' + sec + ' s' : '')
  return sec + ' s'
}

const num = (n) => (n == null ? '–' : Number(n).toLocaleString('en-IN', { maximumFractionDigits: 1 }))
const examText = (e) => (e ? EXAM_LABEL[e] || { 'jee-main': 'JEE Main', 'jee-advanced': 'JEE Advanced' }[e] || e.toUpperCase() : '')
const fileSafe = (s) =>
  (s || 'test')
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || 'test'

/* Where a test's window is right now (live and windowed free tests). */
function windowText(t, now) {
  if (t.closesAt && new Date(t.closesAt).getTime() <= now) return 'Ended ' + when(t.closesAt)
  if (t.opensAt && new Date(t.opensAt).getTime() > now) return 'Starts ' + when(t.opensAt)
  if (t.closesAt) return 'Open until ' + when(t.closesAt)
  if (t.opensAt) return 'Opened ' + when(t.opensAt)
  return ''
}

export default function TestResults({ id, backText, onBack }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [now] = useState(() => Date.now())

  const load = useCallback(() => {
    setLoading(true)
    return getTestResults(id)
      .then((d) => {
        setData(d)
        setError(null)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const t = data && data.test
  const rows = useMemo(() => (data && Array.isArray(data.rows) ? data.rows : []), [data])
  const max = t ? t.totalMarks : null

  const stats = useMemo(() => {
    if (!data) return null
    const scores = rows.map((r) => r.score).filter((s) => typeof s === 'number')
    return {
      total: data.total ?? rows.length,
      avg: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null,
      top: scores.length ? Math.max(...scores) : null,
      inProgress: data.inProgress || 0,
    }
  }, [data, rows])

  const shown = useMemo(() => {
    const k = q.trim().toLowerCase()
    if (!k) return rows
    const digits = k.replace(/\D/g, '')
    return rows.filter(
      (r) =>
        (r.name || '').toLowerCase().includes(k) ||
        (r.email || '').toLowerCase().includes(k) ||
        (digits.length >= 3 && (r.phone || '').replace(/\D/g, '').includes(digits)),
    )
  }, [rows, q])

  function exportCsv() {
    const head = ['Rank', 'Name', 'Email', 'Mobile', 'City', 'State', 'Score', 'Max score', 'Accuracy %', 'Correct', 'Wrong', 'Partial', 'Skipped', 'Time taken', 'Time (seconds)', 'Submitted', 'Auto-submitted', 'Attempts', 'Best score']
    downloadCsv(fileSafe(t.title) + '-results.csv', [
      head,
      ...rows.map((r) => [
        r.rank,
        r.name,
        r.email,
        r.phone || '',
        r.city || '',
        r.state || '',
        r.score,
        r.maxScore,
        r.accuracy == null ? '' : r.accuracy,
        r.correct,
        r.wrong,
        r.partial,
        r.skipped,
        duration(r.timeMs),
        r.timeMs == null ? '' : Math.round(r.timeMs / 1000),
        when(r.submittedAt),
        r.autoSubmitted ? 'Yes' : 'No',
        r.attempts,
        r.bestScore,
      ]),
    ])
  }

  const meta = t
    ? [KIND[t.kind] || 'Test', t.kind === 'series' && t.seriesTitle, examText(t.exam), t.subject, t.questionCount ? t.questionCount + ' questions' : null, max != null ? max + ' marks' : null]
        .filter(Boolean)
        .join(' · ')
    : ''
  const win = t && t.kind !== 'series' ? windowText(t, now) : ''

  return (
    <div className="rr">
      <div className="head ts-head rr-head">
        <div>
          <BackButton onClick={onBack}>{backText}</BackButton>
          <h1>{t ? t.title : 'Results'}</h1>
          <p>{t ? meta : 'Leaderboard and every student’s result.'}</p>
          {t ? (
            <div className="ts-head-meta">
              <span className={'pill ' + (t.status === 'published' ? 'p-published' : 'p-draft')}>{t.status === 'published' ? 'Published' : 'Draft'}</span>
              {win ? <span className="hint">{win}</span> : null}
            </div>
          ) : null}
        </div>
        {rows.length ? (
          <div className="actions">
            <button className="btn btn-outline" type="button" onClick={() => load()} disabled={loading}>
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
            <button className="btn btn-primary" type="button" onClick={exportCsv}>
              Download CSV
            </button>
          </div>
        ) : null}
      </div>

      {error && !data ? (
        <div className="alert a-err" role="alert">
          <span className="ts-grow">Couldn&apos;t load the results. {error}</span>
          <button className="btn btn-outline btn-sm" type="button" disabled={loading} onClick={() => load()}>
            {loading ? 'Trying…' : 'Try again'}
          </button>
        </div>
      ) : (
        <>
          {error ? (
            <div className="alert a-err" role="alert">
              <span className="ts-grow">Couldn&apos;t refresh. {error}</span>
            </div>
          ) : null}

          <div className="stats rr-stats">
            <Stat label="Students ranked" value={stats && num(stats.total)} note={stats && 'First attempts only'} />
            <Stat label="Average score" value={stats && (stats.avg == null ? '–' : num(stats.avg))} note={stats && (stats.avg == null ? 'No scores yet' : 'out of ' + num(max))} />
            <Stat label="Top score" value={stats && (stats.top == null ? '–' : num(stats.top))} note={stats && (stats.top == null ? 'No scores yet' : 'out of ' + num(max))} />
            <Stat label="In progress" value={stats && num(stats.inProgress)} note={stats && (stats.inProgress ? 'Writing their first attempt' : 'Nobody writing now')} />
          </div>

          {!data ? (
            <SkeletonTable />
          ) : !rows.length ? (
            <div className="card ts-empty">
              <h2>No one has submitted this test yet</h2>
              <p className="hint">
                {stats.inProgress
                  ? stats.inProgress + (stats.inProgress === 1 ? ' student is' : ' students are') + ' writing it now. Their results and rank show up here as soon as they submit.'
                  : 'Each student’s first attempt is ranked here once they submit: score first, then less time taken. Retakes never change a rank.'}
              </p>
            </div>
          ) : (
            <>
              <div className="filters rr-filters">
                <label className="sr" htmlFor="rr-q">
                  Search results
                </label>
                <input
                  className="input search"
                  id="rr-q"
                  type="search"
                  value={q}
                  placeholder="Search name, email or mobile"
                  onChange={(e) => setQ(e.target.value)}
                />
                <span className="hint rr-count" aria-live="polite">
                  {q.trim() ? shown.length + ' of ' + rows.length + ' students' : 'Ranked by first attempt: score, then less time. Retakes don’t change a rank.'}
                </span>
              </div>

              <div className="table-wrap rr-table">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Rank</th>
                      <th scope="col">Student</th>
                      <th scope="col">City</th>
                      <th scope="col">Score</th>
                      <th scope="col">Accuracy</th>
                      <th scope="col">
                        <abbr title="Correct · Wrong · Skipped">C · W · S</abbr>
                      </th>
                      <th scope="col">Time</th>
                      <th scope="col">Submitted</th>
                      <th scope="col">Attempts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.length ? (
                      shown.map((r) => <Row key={r.userId} r={r} />)
                    ) : (
                      <tr>
                        <td className="hint" colSpan={9}>
                          No student matches “{q.trim()}”.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

function Rank({ n, className = '' }) {
  const medal = n === 1 ? ' is-gold' : n === 2 ? ' is-silver' : n === 3 ? ' is-bronze' : ''
  return (
    <span className={'rr-rank' + medal + (className ? ' ' + className : '')} aria-label={'Rank ' + n}>
      {n}
    </span>
  )
}

function Row({ r }) {
  const contact = [r.email, r.phone].filter(Boolean).join(' · ')
  return (
    <tr className={r.rank <= 3 ? 'is-top' : undefined}>
      <td className="rr-rank-cell">
        <Rank n={r.rank} />
      </td>
      <td className="rr-student">
        <Rank n={r.rank} className="rr-rank-m" />
        <span className="rr-who">
          <b>{r.name || 'Unnamed student'}</b>
          {contact ? <span className="sub">{contact}</span> : null}
        </span>
      </td>
      <td data-label="City">
        {r.city || '–'}
        {r.state ? <span className="sub">{r.state}</span> : null}
      </td>
      <td data-label="Score" className="rr-score">
        <b>{num(r.score)}</b>
        <span className="rr-of"> / {num(r.maxScore)}</span>
      </td>
      <td data-label="Accuracy">{r.accuracy == null ? '–' : r.accuracy + '%'}</td>
      <td data-label="C · W · S" className="rr-cws">
        <span className="rr-c">{r.correct}</span>
        <span aria-hidden="true"> · </span>
        <span className="rr-w">{r.wrong}</span>
        <span aria-hidden="true"> · </span>
        <span>{r.skipped}</span>
        {r.partial ? <span className="sub">+ {r.partial} partly correct</span> : null}
        <span className="sr">
          {r.correct} correct, {r.wrong} wrong, {r.skipped} skipped
        </span>
      </td>
      <td data-label="Time">{duration(r.timeMs)}</td>
      <td data-label="Submitted">
        {when(r.submittedAt) || '–'}
        {r.autoSubmitted ? (
          <span className="pill p-warn rr-auto" title="Time ran out, so it was submitted automatically">
            Auto
          </span>
        ) : null}
      </td>
      <td data-label="Attempts">
        {r.attempts > 1 ? (
          <>
            {r.attempts} <span className="sub rr-best">best {num(r.bestScore)}</span>
          </>
        ) : (
          r.attempts || 1
        )}
      </td>
    </tr>
  )
}

function Stat({ label, value, note }) {
  return (
    <div className="card stat">
      <span>{label}</span>
      {value == null ? (
        <b aria-busy="true">
          <span className="skel skel-stat"></span>
          <span className="sr">Loading</span>
        </b>
      ) : (
        <b>{value}</b>
      )}
      <small>{note || (value == null ? <span className="skel skel-note"></span> : null)}</small>
    </div>
  )
}

function SkeletonTable() {
  return (
    <div className="table-wrap rr-skel" aria-busy="true">
      <span className="sr">Loading results…</span>
      {[0, 1, 2, 3, 4].map((i) => (
        <div className="rr-skel-row" key={i} aria-hidden="true">
          <span className="skel rr-skel-rank"></span>
          <span className="rr-skel-who">
            <span className="skel" style={{ width: 140 - i * 12 + 'px' }}></span>
            <span className="skel" style={{ width: 200 - i * 10 + 'px' }}></span>
          </span>
          <span className="skel rr-skel-num"></span>
          <span className="skel rr-skel-num"></span>
        </div>
      ))}
    </div>
  )
}
