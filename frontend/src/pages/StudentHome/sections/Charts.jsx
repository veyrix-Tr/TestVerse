import { Link } from 'react-router-dom'
import { fmt } from '../../../lib/format.js'
import { pctOf, resultHref } from '../useTests.js'

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
