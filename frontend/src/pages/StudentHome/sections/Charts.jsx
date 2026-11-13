import { Link } from 'react-router-dom'
import { fmt } from '../../../lib/format.js'
import { accuracyOf, pctOf, resultHref } from '../useTests.js'

const short = (iso) => fmt(iso, { day: 'numeric', month: 'short' })

/* A y-range that hugs the data (in steps of 10, at least 30 points tall, inside 0–100). */
function yRange(values) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const step = max - min > 40 ? 20 : 10
  let lo = Math.max(0, Math.floor((min - 6) / step) * step)
  let hi = Math.min(100, Math.ceil((max + 6) / step) * step)
  if (hi - lo < 30) {
    hi = Math.min(100, lo + 30)
    lo = Math.max(0, hi - 30)
  }
  const ticks = []
  for (let t = hi; t >= lo; t -= step) ticks.push(t)
  return { lo, hi, ticks }
}

/*
  Score as a percentage of maximum marks, attempt by attempt (oldest to
  newest), as a line. Each point links to that attempt's result and shows the
  test, date and marks on hover or focus. A dashed line marks the average.
*/
export function ScoreTrend({ rows }) {
  const list = rows.slice().reverse()
  const values = list.map((r) => pctOf(r.a) || 0)
  const { lo, hi, ticks } = yRange(values)
  const n = list.length
  const y = (v) => (1 - (v - lo) / (hi - lo)) * 100
  const pts = list.map((r, i) => ({ r, p: values[i], x: n === 1 ? 50 : 3 + (i * 94) / (n - 1), y: y(values[i]) }))
  const last = pts[n - 1]
  const best = Math.max(...values)
  const avg = Math.round(values.reduce((a, b) => a + b, 0) / n)
  const line = pts.map((d) => d.x + ',' + d.y).join(' ')
  // Every label when there's room; otherwise every k-th plus the latest
  const every = Math.ceil(n / 8)
  const showX = (i) => i === n - 1 || (i % every === 0 && n - 1 - i >= every / 2)
  const showVal = (d, i) => n <= 10 || i === n - 1 || d.p === best

  return (
    <figure className="card chart-card trend-card">
      <div className="chart-head">
        <div>
          <h3>Score trend</h3>
          <p className="meta">Percent of maximum marks, every attempt, oldest to latest</p>
        </div>
        <div className="chart-kpi">
          <b>{last.p}%</b>
          <span>latest · best {best}% · average {avg}%</span>
        </div>
      </div>

      <div className="trend" role="img" aria-label={'Score by attempt, oldest to latest: ' + pts.map((d) => d.r.test.title + ' ' + short(d.r.a.submittedAt) + ', ' + d.p + '%').join('; ')}>
        <div className="trend-plot">
          {ticks.map((t) => (
            <div className="trend-grid" key={t} style={{ top: y(t) + '%' }}>
              <span>{t}%</span>
            </div>
          ))}
          {n > 1 ? (
            <div className="trend-avg" style={{ top: y(avg) + '%' }} aria-hidden="true">
              <span>Avg {avg}%</span>
            </div>
          ) : null}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="sh-trend-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="var(--blue)" stopOpacity="0.16" />
                <stop offset="1" stopColor="var(--blue)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {n > 1 ? <polygon points={pts[0].x + ',100 ' + line + ' ' + last.x + ',100'} fill="url(#sh-trend-fill)" /> : null}
            <polyline points={line} fill="none" stroke="var(--blue)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
          {pts.map((d, i) => (
            <Link
              key={d.r.test.id + '-' + d.r.a.attemptNo}
              to={resultHref(d.r.test, d.r.a)}
              className={'trend-pt' + (i === n - 1 ? ' is-last' : '') + (d.x < 18 ? ' tip-left' : d.x > 82 ? ' tip-right' : '')}
              style={{ left: d.x + '%', top: d.y + '%' }}
              aria-label={d.r.test.title + (d.r.a.attemptNo > 1 ? ', attempt ' + d.r.a.attemptNo : '') + ', ' + short(d.r.a.submittedAt) + ': ' + d.p + '%. Open result'}
            >
              <i aria-hidden="true"></i>
              {showVal(d, i) ? (
                <span className={'trend-val' + (i === n - 1 || d.p === best ? '' : ' is-minor')} aria-hidden="true">
                  {d.p}%
                </span>
              ) : null}
              <span className="trend-tip" aria-hidden="true">
                <b>{d.r.test.title}</b>
                <span>
                  {short(d.r.a.submittedAt)}
                  {d.r.a.attemptNo > 1 ? ' · attempt ' + d.r.a.attemptNo : ''}
                </span>
                <span>
                  {d.r.a.score} / {d.r.a.maxScore} · <b>{d.p}%</b>
                </span>
              </span>
            </Link>
          ))}
        </div>
        <div className="trend-x" aria-hidden="true">
          {pts.map((d, i) =>
            showX(i) ? (
              <span key={d.r.test.id + '-' + d.r.a.attemptNo} className={i === n - 1 ? 'is-last' : (n - 1 - i) % 2 ? 'is-minor' : undefined} style={{ left: d.x + '%' }}>
                {short(d.r.a.submittedAt)}
              </span>
            ) : null,
          )}
        </div>
      </div>
      {n === 1 ? <p className="meta">One attempt so far. Take another test, or retake this one, to see the trend.</p> : null}
    </figure>
  )
}

/* Each test's best attempt as a horizontal bar, strongest first. The weakest is flagged once there are three or more. */
export function BestBars({ tests }) {
  const list = tests
    .filter((t) => t.best)
    .map((t) => ({ t, p: pctOf(t.best) || 0, tries: (t.history || []).length }))
    .sort((a, b) => b.p - a.p)
  const weakest = list.length >= 3 ? list[list.length - 1].t.id : null

  return (
    <figure className="card chart-card">
      <div className="chart-head">
        <div>
          <h3>Best score by test</h3>
          <p className="meta">Your best attempt at each test, as a percent of maximum</p>
        </div>
      </div>
      <ul className="hbars">
        {list.map(({ t, p, tries }) => (
          <li key={t.id} className={t.id === weakest ? 'is-weak' : undefined}>
            <span className="hbar-label">
              <Link to={resultHref(t, t.best)}>{t.title}</Link>
              <span className="hbar-sub">
                {t.id === weakest ? <span className="hbar-flag">Needs work · </span> : null}
                {tries > 1 ? 'Best of ' + tries + ' attempts' : '1 attempt'}
              </span>
            </span>
            <span className="hbar-track" aria-hidden="true">
              <i style={{ width: Math.max(2, p) + '%' }}></i>
            </span>
            <b>
              {p}%<small> · {t.best.score}/{t.best.maxScore}</small>
            </b>
          </li>
        ))}
      </ul>
    </figure>
  )
}

/* Rail card: the last few scores as bars, oldest to newest, with a link to Results. */
export function TrendCard({ rows }) {
  const last = rows.slice(0, 8).reverse()
  const best = Math.max(...last.map((r) => pctOf(r.a) || 0))
  return (
    <section className="card rail-card" aria-labelledby="trend-title">
      <div className="rail-head">
        <h2 id="trend-title">Score trend</h2>
        <span className="meta">Best {best}%</span>
      </div>
      <ol className="bars" aria-label={'Your last ' + last.length + ' scores: ' + last.map((r) => (pctOf(r.a) || 0) + '%').join(', ')}>
        {last.map((r, i) => {
          const p = pctOf(r.a) || 0
          return (
            <li key={r.test.id + r.a.attemptNo} className={i === last.length - 1 ? 'is-last' : undefined} title={r.test.title + (r.a.attemptNo > 1 ? ' (attempt ' + r.a.attemptNo + ')' : '') + ': ' + r.a.score + ' / ' + r.a.maxScore}>
              <span className="bar-val">{p}%</span>
              <span className="bar-col" aria-hidden="true">
                <i style={{ height: Math.max(4, p) + '%' }}></i>
              </span>
            </li>
          )
        })}
      </ol>
      <div className="rail-foot">
        <p className="rail-text">Percent of maximum marks, oldest to newest.</p>
        <Link className="text-link" to="/student/results">
          See all results
        </Link>
      </div>
    </section>
  )
}

/* ---------- Progress over time: subject accuracy and guessing habit ---------- */

const attemptLabel = (r) => r.test.title + (r.a.attemptNo > 1 ? ', attempt ' + r.a.attemptNo : '') + ', ' + short(r.a.submittedAt)

// x position (percent) of point i of n, matching ScoreTrend
const xOf = (i, n) => (n === 1 ? 50 : 3 + (i * 94) / (n - 1))

// Every x label when there's room; otherwise every k-th plus the latest
function xLabels(n) {
  const every = Math.ceil(n / 8)
  return (i) => i === n - 1 || (i % every === 0 && n - 1 - i >= every / 2)
}

// Tooltip side so it never spills out of the plot
const tipSide = (x) => (x < 18 ? ' tip-left' : x > 82 ? ' tip-right' : '')

/* One colour per subject, in the order subjects first appear. */
const SERIES = ['var(--blue)', 'var(--green)', 'var(--amber)', 'var(--purple)', 'var(--red)', 'var(--ink-2)']

/* The same subject is sometimes named differently across papers. */
const ALIAS = { math: 'Mathematics', maths: 'Mathematics', mathematics: 'Mathematics', bio: 'Biology', biology: 'Biology' }
const subjectKey = (name) => {
  const k = String(name || '').trim().replace(/\s+/g, ' ').toLowerCase()
  return ALIAS[k] ? ALIAS[k].toLowerCase() : k
}
const subjectName = (name) => {
  const s = String(name || '').trim().replace(/\s+/g, ' ')
  return ALIAS[s.toLowerCase()] || s
}

/*
  Rows (newest first) → attempts oldest to newest that have per-section
  analysis, and one series per subject: accuracy at each attempt where that
  subject had at least one attempted question.
*/
function subjectSeries(rows) {
  const attempts = []
  for (const r of rows.slice().reverse()) {
    const sections = r.a?.analysis?.sections
    if (!Array.isArray(sections) || !sections.length) continue
    // Merge sections that are the same subject (e.g. "Physics" A and B)
    const bySubject = new Map()
    for (const s of sections) {
      const key = subjectKey(s?.name)
      if (!key) continue
      const m = bySubject.get(key) || { key, name: subjectName(s.name), correct: 0, wrong: 0, partial: 0 }
      m.correct += s.correct || 0
      m.wrong += s.wrong || 0
      m.partial += s.partial || 0
      bySubject.set(key, m)
    }
    const points = [...bySubject.values()].map((m) => ({ ...m, acc: accuracyOf(m) })).filter((m) => m.acc != null)
    if (points.length) attempts.push({ r, points })
  }

  const series = new Map()
  attempts.forEach(({ points }, i) => {
    for (const p of points) {
      if (!series.has(p.key)) series.set(p.key, { key: p.key, name: p.name, pts: [] })
      series.get(p.key).pts.push({ i, acc: p.acc, tried: p.correct + p.wrong + p.partial })
    }
  })
  const list = [...series.values()].map((s, k) => ({ ...s, color: SERIES[k % SERIES.length] }))
  return { attempts, series: list }
}

/* A one-line placeholder card for a chart that needs more attempts. */
function ChartHint({ title, sub, text }) {
  return (
    <figure className="card chart-card">
      <div className="chart-head">
        <div>
          <h3>{title}</h3>
          <p className="meta">{sub}</p>
        </div>
      </div>
      <p className="meta chart-hint">{text}</p>
    </figure>
  )
}

/*
  Accuracy (correct ÷ attempted, partial counts half) per subject, attempt by
  attempt, one line per subject. The legend gives each subject's latest
  accuracy and its change since the first attempt; hovering or focusing an
  attempt shows every subject's accuracy in it and links to the result.
*/
export function SubjectTrend({ rows }) {
  const { attempts, series } = subjectSeries(rows)
  const title = 'Subject accuracy'
  const sub = 'Correct out of attempted in each subject, oldest to latest'
  if (attempts.length < 2 || !series.some((s) => s.pts.length > 1)) {
    return <ChartHint title={title} sub={sub} text="Submit two or more tests to see how your accuracy in each subject is changing." />
  }

  const n = attempts.length
  const { lo, hi, ticks } = yRange(series.flatMap((s) => s.pts.map((p) => p.acc)))
  const y = (v) => (1 - (v - lo) / (hi - lo)) * 100
  const showX = xLabels(n)
  const half = n > 1 ? 47 / (n - 1) : 50 // half the gap between attempts, for the hover columns

  return (
    <figure className="card chart-card strend-card">
      <div className="chart-head">
        <div>
          <h3>{title}</h3>
          <p className="meta">{sub}</p>
        </div>
      </div>

      <ul className="strend-legend">
        {series.map((s) => {
          const first = s.pts[0].acc
          const last = s.pts[s.pts.length - 1].acc
          const d = last - first
          return (
            <li key={s.key} style={{ '--c': s.color }}>
              <i aria-hidden="true"></i>
              <span>{s.name}</span>
              <b>{last}%</b>
              {s.pts.length > 1 && d !== 0 ? (
                <small className={d > 0 ? 'delta up' : 'delta down'}>
                  {d > 0 ? '+' : '−'}
                  {Math.abs(d)} since first
                </small>
              ) : null}
            </li>
          )
        })}
      </ul>

      <div
        className="trend"
        role="img"
        aria-label={'Accuracy by subject, oldest to latest attempt. ' + series.map((s) => s.name + ': ' + s.pts.map((p) => p.acc + '%').join(', ')).join('. ')}
      >
        <div className="trend-plot">
          {ticks.map((t) => (
            <div className="trend-grid" key={t} style={{ top: y(t) + '%' }}>
              <span>{t}%</span>
            </div>
          ))}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {series.map((s) =>
              s.pts.length > 1 ? (
                <polyline
                  key={s.key}
                  points={s.pts.map((p) => xOf(p.i, n) + ',' + y(p.acc)).join(' ')}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ) : null,
            )}
          </svg>
          {series.flatMap((s) =>
            s.pts.map((p) => (
              <span
                key={s.key + '-' + p.i}
                className={'strend-dot' + (p.i === n - 1 ? ' is-last' : '')}
                style={{ left: xOf(p.i, n) + '%', top: y(p.acc) + '%', '--c': s.color }}
                aria-hidden="true"
              ></span>
            )),
          )}
          {attempts.map(({ r, points }, i) => {
            const x = xOf(i, n)
            return (
              <Link
                key={r.test.id + '-' + r.a.attemptNo}
                to={resultHref(r.test, r.a)}
                className={'strend-col' + tipSide(x)}
                style={{ left: Math.max(0, x - half) + '%', width: Math.min(100, x + half) - Math.max(0, x - half) + '%', '--x': x - Math.max(0, x - half) + '%' }}
                aria-label={attemptLabel(r) + ': ' + points.map((p) => p.name + ' ' + p.acc + '%').join(', ') + '. Open result'}
              >
                <span className="trend-tip strend-tip" aria-hidden="true">
                  <b>{r.test.title}</b>
                  <span>
                    {short(r.a.submittedAt)}
                    {r.a.attemptNo > 1 ? ' · attempt ' + r.a.attemptNo : ''}
                  </span>
                  {points.map((p) => (
                    <span key={p.key} className="strend-tip-row" style={{ '--c': (series.find((s) => s.key === p.key) || {}).color }}>
                      <i></i>
                      {p.name} <b>{p.acc}%</b>
                    </span>
                  ))}
                </span>
              </Link>
            )
          })}
        </div>
        <div className="trend-x" aria-hidden="true">
          {attempts.map(({ r }, i) =>
            showX(i) ? (
              <span key={r.test.id + '-' + r.a.attemptNo} className={i === n - 1 ? 'is-last' : (n - 1 - i) % 2 ? 'is-minor' : undefined} style={{ left: xOf(i, n) + '%' }}>
                {short(r.a.submittedAt)}
              </span>
            ) : null,
          )}
        </div>
      </div>
    </figure>
  )
}

/*
  Likely guesses (wrong answers given faster than the guess limit) in each of
  the last attempts, oldest to newest, as columns. The headline compares the
  latest attempt with the average.
*/
const GUESS_MAX = 12

export function GuessTrend({ rows }) {
  const all = rows.filter((r) => r.a?.analysis && typeof r.a.analysis.guesses === 'number')
  const title = 'Guessing habit'
  const sub = 'Wrong answers given too quickly to have been worked out'
  if (all.length < 2) {
    return <ChartHint title={title} sub={sub} text="Submit two or more tests to see whether you’re guessing less over time." />
  }

  const list = all.slice(0, GUESS_MAX).reverse()
  const n = list.length
  const g = (r) => r.a.analysis.guesses || 0
  const top = Math.max(1, ...list.map(g))
  const last = list[n - 1]
  const avg = Math.round((list.reduce((s, r) => s + g(r), 0) / n) * 10) / 10
  const lastWrong = last.a.analysis.wrong || 0
  const share = lastWrong ? Math.round((g(last) / lastWrong) * 100) : null
  const vsAvg = g(last) < avg ? 'below' : g(last) > avg ? 'above' : 'at'

  return (
    <figure className="card chart-card guess-card">
      <div className="chart-head">
        <div>
          <h3>{title}</h3>
          <p className="meta">
            {sub}
            {all.length > GUESS_MAX ? ' · last ' + GUESS_MAX + ' attempts' : ''}
          </p>
        </div>
        <div className="chart-kpi">
          <b>{g(last)}</b>
          <span>
            {g(last) === 1 ? 'guess' : 'guesses'} latest{share != null ? ' · ' + share + '% of wrong' : ''}
          </span>
        </div>
      </div>

      <ol
        className="gbars"
        aria-label={'Likely guesses per attempt, oldest to latest: ' + list.map((r) => attemptLabel(r) + ', ' + g(r)).join('; ')}
      >
        {list.map((r, i) => {
          const x = n === 1 ? 50 : (i / (n - 1)) * 100
          const wrong = r.a.analysis.wrong || 0
          const slow = r.a.analysis.slow || 0
          return (
            <li key={r.test.id + '-' + r.a.attemptNo} className={i === n - 1 ? 'is-last' : undefined}>
              <Link
                to={resultHref(r.test, r.a)}
                className={'gbar' + tipSide(x)}
                aria-label={attemptLabel(r) + ': ' + g(r) + ' likely guesses out of ' + wrong + ' wrong answers. Open result'}
              >
                <span className="bar-val" aria-hidden="true">
                  {g(r)}
                </span>
                <span className="bar-col" aria-hidden="true">
                  <i style={{ height: g(r) ? Math.max(4, (g(r) / top) * 100) + '%' : '0' }}></i>
                </span>
                <span className="gbar-x" aria-hidden="true">
                  {short(r.a.submittedAt)}
                </span>
                <span className="trend-tip gbar-tip" aria-hidden="true">
                  <b>{r.test.title}</b>
                  <span>
                    {short(r.a.submittedAt)}
                    {r.a.attemptNo > 1 ? ' · attempt ' + r.a.attemptNo : ''}
                  </span>
                  <span>
                    <b>{g(r)}</b> likely {g(r) === 1 ? 'guess' : 'guesses'} of {wrong} wrong
                  </span>
                  {slow ? (
                    <span>
                      {slow} wrong after a long think
                    </span>
                  ) : null}
                </span>
              </Link>
            </li>
          )
        })}
      </ol>
      <p className="meta">
        Average {avg} per attempt. Your latest is {vsAvg} average
        {vsAvg === 'below' ? ', fewer answers on a hunch than usual.' : vsAvg === 'above' ? '. Skip a question rather than guess when unsure.' : '.'}
      </p>
    </figure>
  )
}
