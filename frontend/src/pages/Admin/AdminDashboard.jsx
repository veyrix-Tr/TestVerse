import { useState } from 'react'
import { api } from '../../lib/api.js'
import { getToken, loadSession } from '../../lib/session.js'
import LiveStamp from './LiveStamp.jsx'
import { ago } from './studentsApi.js'
import { useLive, useNow } from './useLive.js'

/*
  The admin home: real numbers from GET /api/admin/overview
  (backend/controllers/adminOverviewController.js), refreshed every 20 s and
  whenever the tab comes back into view. `onGo(view)` opens another admin
  section (the sidebar's data-view names).
*/

const loadOverview = () => api('/admin/overview', { token: getToken() })

const EXAM = { jee: 'JEE', neet: 'NEET', 'jee-main': 'JEE Main', 'jee-advanced': 'JEE Advanced' }
const KIND = { free: 'Free mock', live: 'Live test', series: 'Series' }

const inr = (n) => '₹' + Math.round(n || 0).toLocaleString('en-IN')
const fmt = (iso, o) => new Date(iso).toLocaleString('en-IN', o)
const shortDay = (key) => fmt(key + 'T12:00:00+05:30', { day: 'numeric', month: 'short' })
const longDay = (key) => fmt(key + 'T12:00:00+05:30', { weekday: 'long', day: 'numeric', month: 'long' })
const when = (iso) => fmt(iso, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
const plural = (n, one, many = one + 's') => n + ' ' + (n === 1 ? one : many)

/* "in 5 h", "in 20 min" until a moment */
function inTime(iso, now) {
  const m = Math.max(0, Math.round((new Date(iso).getTime() - now) / 60000))
  if (m < 60) return 'in ' + m + ' min'
  const h = Math.round(m / 60)
  if (h < 24) return 'in ' + h + ' h'
  const d = Math.round(h / 24)
  return 'in ' + d + (d === 1 ? ' day' : ' days')
}

/* "1:42:05" left on an attempt */
function left(ms) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const pad = (n) => String(n).padStart(2, '0')
  return Math.floor(s / 3600) + ':' + pad(Math.floor((s % 3600) / 60)) + ':' + pad(s % 60)
}

function greet() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

/* Week-on-week change, as text the tile shows next to its number */
function Delta({ now, prev, unit = '', suffix = 'vs last week' }) {
  if (now == null) return <span className="db-delta">{suffix.replace('vs', 'Nothing yet,')}</span>
  if (prev == null) return <span className="db-delta">First week of data</span>
  const d = Math.round((now - prev) * 10) / 10
  if (d === 0) return <span className="db-delta">Same as last week</span>
  return (
    <span className={'db-delta ' + (d > 0 ? 'up' : 'down')}>
      <i aria-hidden="true">{d > 0 ? '▲' : '▼'}</i>
      {Math.abs(d) + unit} {suffix}
    </span>
  )
}

/* A tiny line of the last 14 days for a tile (decorative; the chart below has the detail) */
function Spark({ values }) {
  const max = Math.max(1, ...values)
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${30 - (v / max) * 26 - 2}`).join(' ')
  return (
    <svg className="db-spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

function Tile({ label, value, sub, delta, spark, tone }) {
  return (
    <div className={'card db-tile' + (tone ? ' is-' + tone : '')}>
      <span className="db-tile-label">{label}</span>
      <b className="db-tile-value">{value}</b>
      <div className="db-tile-foot">
        {delta}
        {sub ? <small>{sub}</small> : null}
      </div>
      {spark ? <Spark values={spark} /> : null}
    </div>
  )
}

/* Signups and submissions per day, 14 days: paired bars on one count axis, with hover details and a table view */
function DailyChart({ daily }) {
  const [hover, setHover] = useState(null)
  const max = Math.max(1, ...daily.flatMap((d) => [d.signups, d.submissions]))
  const step = max <= 4 ? 1 : Math.ceil(max / 4)
  const top = step * Math.ceil(max / step)
  const ticks = []
  for (let v = top; v >= 0; v -= step) ticks.push(v)
  const totals = daily.reduce((a, d) => ({ signups: a.signups + d.signups, submissions: a.submissions + d.submissions }), { signups: 0, submissions: 0 })

  return (
    <section className="card db-panel db-chart" aria-labelledby="db-chart-t">
      <div className="db-panel-head">
        <div>
          <h2 id="db-chart-t">Last 14 days</h2>
          <p>
            {plural(totals.signups, 'signup')} and {plural(totals.submissions, 'test submitted', 'tests submitted')}
          </p>
        </div>
        <ul className="db-legend" aria-label="Legend">
          <li>
            <i className="sw-sub" aria-hidden="true"></i>Tests submitted
          </li>
          <li>
            <i className="sw-sig" aria-hidden="true"></i>Signups
          </li>
        </ul>
      </div>

      <div className="db-plot" onMouseLeave={() => setHover(null)}>
        <div className="db-grid" aria-hidden="true">
          {ticks.map((t) => (
            <div key={t} style={{ bottom: (t / top) * 100 + '%' }}>
              <span>{t}</span>
            </div>
          ))}
        </div>
        <ol className="db-cols" aria-label="Signups and tests submitted per day">
          {daily.map((d, i) => (
            <li
              key={d.day}
              tabIndex={0}
              className={hover === i ? 'is-hover' : undefined}
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              aria-label={`${longDay(d.day)}: ${plural(d.submissions, 'test submitted', 'tests submitted')}, ${plural(d.signups, 'signup')}`}
            >
              <span className="db-bars">
                <i className="b-sub" style={{ height: (d.submissions / top) * 100 + '%' }}></i>
                <i className="b-sig" style={{ height: (d.signups / top) * 100 + '%' }}></i>
              </span>
              <span className="db-x">{i % 2 === daily.length % 2 ? '' : shortDay(d.day)}</span>
              {hover === i ? (
                <span className={'db-tip' + (i > daily.length - 4 ? ' is-left' : '')} role="tooltip">
                  <b>{longDay(d.day)}</b>
                  <span>
                    <i className="sw-sub"></i>
                    {plural(d.submissions, 'test submitted', 'tests submitted')}
                  </span>
                  <span>
                    <i className="sw-sig"></i>
                    {plural(d.signups, 'signup')}
                  </span>
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      </div>

      <details className="db-table">
        <summary>Show as a table</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">Day</th>
              <th scope="col">Tests submitted</th>
              <th scope="col">Signups</th>
            </tr>
          </thead>
          <tbody>
            {daily
              .slice()
              .reverse()
              .map((d) => (
                <tr key={d.day}>
                  <td>{longDay(d.day)}</td>
                  <td>{d.submissions}</td>
                  <td>{d.signups}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </details>
    </section>
  )
}

function LiveNow({ rows, offset, today }) {
  const now = useNow(1000) + offset
  return (
    <section className="db-panel db-live" aria-labelledby="db-live-t">
      <div className="db-panel-head">
        <div>
          <p className="db-live-label">
            <i aria-hidden="true"></i>Live now
          </p>
          <h2 id="db-live-t">
            {rows.length ? plural(rows.length, 'student') + ' in a test' : 'No one is in a test'}
          </h2>
        </div>
      </div>
      {rows.length ? (
        <ul className="db-live-list">
          {rows.map((r) => (
            <li key={r.student.id + r.test.id}>
              <span className="db-avatar" aria-hidden="true">
                {(r.student.name || '?').charAt(0)}
              </span>
              <span className="db-live-who">
                <b>{r.student.name}</b>
                <span>
                  {r.test.title}
                  {r.attemptNo > 1 ? ' · retake' : ''}
                </span>
              </span>
              <span className="db-live-left" title="Time left">
                {left(new Date(r.deadline).getTime() - now)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="db-live-empty">When a student starts a test, they show up here with the time they have left.</p>
      )}
      <dl className="db-today">
        <div>
          <dt>Submitted today</dt>
          <dd>{today.submissions}</dd>
        </div>
        <div>
          <dt>Joined today</dt>
          <dd>{today.signups}</dd>
        </div>
        <div>
          <dt>Open tests</dt>
          <dd>{today.open}</dd>
        </div>
      </dl>
    </section>
  )
}

function TestsPanel({ tests, onGo, now }) {
  const rows = [...tests.openNow.map((t) => ({ ...t, state: 'open' })), ...tests.upcoming.map((t) => ({ ...t, state: 'upcoming' }))].slice(0, 6)
  return (
    <section className="card db-panel" aria-labelledby="db-tests-t">
      <div className="db-panel-head">
        <div>
          <h2 id="db-tests-t">Open and upcoming tests</h2>
          <p>
            {plural(tests.published, 'published test')}
            {tests.drafts ? ' · ' + plural(tests.drafts, 'draft') : ''}
          </p>
        </div>
        <button className="btn btn-outline btn-sm" type="button" onClick={() => onGo('free')}>
          All tests
        </button>
      </div>
      <div className="db-kinds">
        {tests.byKind.map((k) => (
          <span key={k.kind}>
            <b>{k.published}</b>
            {KIND[k.kind]}
            {k.kind === 'series' ? '' : 's'}
          </span>
        ))}
      </div>
      {rows.length ? (
        <ul className="db-list">
          {rows.map((t) => (
            <li key={t.id}>
              <span className={'db-dot ' + (t.state === 'open' ? 'is-open' : 'is-soon')} aria-hidden="true"></span>
              <span className="db-list-main">
                <b>{t.title}</b>
                <span>
                  {[KIND[t.kind], EXAM[t.exam], t.questionCount ? t.questionCount + ' Qs' : ''].filter(Boolean).join(' · ')}
                </span>
              </span>
              <span className="db-list-side">
                {t.state === 'open' ? (
                  <>
                    <span className="pill p-published">Open</span>
                    <small>{t.closesAt ? 'Closes ' + inTime(t.closesAt, now) : plural(t.attempts, 'attempt')}</small>
                  </>
                ) : (
                  <>
                    <span className="pill p-scheduled">Opens {inTime(t.opensAt, now)}</span>
                    <small>{when(t.opensAt)}</small>
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="db-empty">No tests are open or scheduled. Publish one and it shows up here.</p>
      )}
    </section>
  )
}

function TopTests({ rows }) {
  return (
    <section className="card db-panel" aria-labelledby="db-top-t">
      <div className="db-panel-head">
        <div>
          <h2 id="db-top-t">Most taken tests</h2>
          <p>Submissions in the last 30 days, with the average score</p>
        </div>
      </div>
      {rows.length ? (
        <ol className="db-top">
          {rows.map((t, i) => (
            <li key={t.id}>
              <span className="db-rank">{i + 1}</span>
              <span className="db-list-main">
                <b>{t.title}</b>
                <span>{plural(t.attempts, 'submission')}</span>
              </span>
              <span className="db-score">
                <b>{t.avgPct == null ? 'No score' : Math.round(t.avgPct) + '%'}</b>
                <span className="db-meter" aria-hidden="true">
                  <i style={{ width: Math.max(0, Math.min(100, t.avgPct || 0)) + '%' }}></i>
                </span>
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="db-empty">Once students submit tests, the most popular ones show up here.</p>
      )}
    </section>
  )
}

const ACT = {
  signup: (a) => (
    <>
      <b>{a.student.name}</b> joined{a.exam ? ' for ' + (EXAM[a.exam] || a.exam) : ''}
    </>
  ),
  purchase: (a) => (
    <>
      <b>{a.student.name}</b> bought <b>{a.batch}</b> · {inr(a.amount)}
    </>
  ),
  submission: (a) => (
    <>
      <b>{a.student.name}</b> submitted <b>{a.test.title}</b> · {a.score} / {a.maxScore}
      {a.pct != null ? ' (' + Math.round(a.pct) + '%)' : ''}
      {a.attemptNo > 1 ? ' · retake' : ''}
      {a.autoSubmitted ? ' · time ran out' : ''}
    </>
  ),
}
const ACT_LABEL = { signup: 'New student', purchase: 'Purchase', submission: 'Test submitted' }

function Activity({ rows, now }) {
  return (
    <section className="card db-panel" aria-labelledby="db-act-t">
      <div className="db-panel-head">
        <div>
          <h2 id="db-act-t">Recent activity</h2>
          <p>Signups, purchases and submissions as they happen</p>
        </div>
      </div>
      {rows.length ? (
        <ol className="db-feed">
          {rows.map((a, i) => (
            <li key={a.type + a.at + i} className={'is-' + a.type}>
              <span className="db-feed-dot" aria-hidden="true"></span>
              <span className="db-feed-text">
                <span className="db-feed-kind">{ACT_LABEL[a.type]}</span>
                <span>{ACT[a.type](a)}</span>
              </span>
              <time dateTime={a.at}>{ago(a.at, now)}</time>
            </li>
          ))}
        </ol>
      ) : (
        <p className="db-empty">Nothing has happened yet. New signups and results will appear here.</p>
      )}
    </section>
  )
}

function Batches({ rows, kpis, onGo }) {
  const max = Math.max(1, ...rows.map((b) => b.active + b.pending))
  return (
    <section className="card db-panel" aria-labelledby="db-batch-t">
      <div className="db-panel-head">
        <div>
          <h2 id="db-batch-t">Batches</h2>
          <p>
            {kpis.paid} paid · {kpis.free} on free access{kpis.pending ? ' · ' + kpis.pending + ' payment pending' : ''}
          </p>
        </div>
        <button className="btn btn-outline btn-sm" type="button" onClick={() => onGo('students')}>
          Students
        </button>
      </div>
      <ul className="db-batches">
        {rows.map((b) => (
          <li key={b.id}>
            <span className="db-batch-name">
              <b>{b.name}</b>
              <span>{b.price != null ? inr(b.price) : 'No price'}</span>
            </span>
            <span className="db-batch-bar" aria-hidden="true">
              <i className="is-paid" style={{ width: (b.active / max) * 100 + '%' }}></i>
              <i className="is-pending" style={{ width: (b.pending / max) * 100 + '%' }}></i>
            </span>
            <span className="db-batch-n">
              <b>{b.active}</b> paid{b.pending ? <small> · {b.pending} pending</small> : null}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Attention({ items, onGo, now }) {
  const text = (a) => {
    if (a.kind === 'closing') return { t: `${a.title} closes ${inTime(a.at, now)}`, s: plural(a.attempts, 'student') + ' have started it so far.', action: 'Open tests' }
    if (a.kind === 'pending') return { t: plural(a.count, 'student is', 'students are') + ' waiting on payment', s: 'Their batch activates once the payment goes through.', action: 'View students' }
    if (a.kind === 'empty-drafts') return { t: plural(a.count, 'draft has', 'drafts have') + ' no question paper yet', s: 'Add the paper before you publish.', action: 'Open tests' }
    if (a.kind === 'untaken') return { t: plural(a.count, 'open test has', 'open tests have') + ' no attempts yet', s: a.titles.join(', '), action: 'Open tests' }
    return { t: '', s: '', action: '' }
  }
  return (
    <section className="card db-panel" aria-labelledby="db-attn-t">
      <div className="db-panel-head">
        <div>
          <h2 id="db-attn-t">Needs attention</h2>
          <p>{items.length ? plural(items.length, 'thing') + ' to look at' : 'Nothing needs you right now'}</p>
        </div>
      </div>
      {items.length ? (
        <ul className="db-attn">
          {items.map((a, i) => {
            const x = text(a)
            return (
              <li key={a.kind + i} className={'is-' + a.level}>
                <span>
                  <b>{x.t}</b>
                  <small>{x.s}</small>
                </span>
                <button className="btn btn-outline btn-sm" type="button" onClick={() => onGo(a.view)}>
                  {x.action}
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="db-allclear">
          <i aria-hidden="true">✓</i>All clear. Tests, drafts and payments are in order.
        </p>
      )}
    </section>
  )
}

function Skeleton() {
  return (
    <div className="db" aria-hidden="true">
      <div className="db-tiles">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card db-tile">
            <span className="skel" style={{ width: '40%' }}></span>
            <span className="skel skel-stat"></span>
            <span className="skel" style={{ width: '60%' }}></span>
          </div>
        ))}
      </div>
      <div className="db-row db-row-chart">
        <div className="card db-panel">
          <span className="skel db-skel-block"></span>
        </div>
        <div className="card db-panel">
          <span className="skel db-skel-block"></span>
        </div>
      </div>
    </div>
  )
}

export default function AdminDashboard({ onGo }) {
  const { data, error, at, loading, refresh } = useLive(loadOverview, 'overview', 'admin-overview')
  const now = useNow(15000)
  const first = ((loadSession() || {}).name || 'there').split(' ')[0]
  const offset = data ? new Date(data.serverNow).getTime() - (at || Date.now()) : 0
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })

  let body
  if (!data && error) {
    body = (
      <div className="card db-error" role="alert">
        <div>
          <h2>Couldn’t load the dashboard</h2>
          <p>{error}</p>
        </div>
        <button className="btn btn-primary" type="button" onClick={refresh} disabled={loading}>
          {loading ? 'Trying…' : 'Try again'}
        </button>
      </div>
    )
  } else if (!data) {
    body = <Skeleton />
  } else {
    const k = data.kpis
    const signups = data.daily.map((d) => d.signups)
    const subs = data.daily.map((d) => d.submissions)
    body = (
      <div className="db">
        <div className="db-tiles">
          <Tile label="Students" value={k.students.toLocaleString('en-IN')} delta={<Delta now={k.newWeek} prev={k.newPrevWeek} suffix="new vs last week" />} sub={k.newWeek + ' joined this week'} spark={signups} tone="sig" />
          <Tile label="Revenue" value={inr(k.revenue)} delta={<span className="db-delta">{k.revenueWeek ? inr(k.revenueWeek) + ' this week' : 'No sales this week'}</span>} sub={plural(k.paid, 'paid student')} tone="gold" />
          <Tile label="Tests submitted" value={k.submittedWeek} delta={<Delta now={k.submittedWeek} prev={k.submittedPrevWeek} />} sub={k.submittedToday + ' today · last 7 days'} spark={subs} tone="sub" />
          <Tile
            label="Average score"
            value={k.avgPctWeek == null ? 'No scores' : Math.round(k.avgPctWeek) + '%'}
            delta={k.avgPctWeek == null ? <span className="db-delta">No submissions this week</span> : <Delta now={k.avgPctWeek} prev={k.avgPctPrevWeek} unit=" pts" />}
            sub="Across this week's submissions"
          />
        </div>

        <div className="db-row db-row-chart">
          <DailyChart daily={data.daily} />
          <LiveNow rows={data.liveNow} offset={offset} today={{ submissions: k.submittedToday, signups: data.daily[data.daily.length - 1].signups, open: data.tests.openNow.length }} />
        </div>

        <div className="db-row">
          <TestsPanel tests={data.tests} onGo={onGo} now={now + offset} />
          <TopTests rows={data.topTests} />
        </div>

        <div className="db-row">
          <Activity rows={data.activity} now={now + offset} />
          <div className="db-stack">
            <Attention items={data.attention} onGo={onGo} now={now + offset} />
            <Batches rows={data.batches} kpis={k} onGo={onGo} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="head db-head">
        <div>
          <span className="db-date">{today}</span>
          <h1>
            {greet()}, {first}
          </h1>
          <p>Here’s how Testverse is doing right now. Everything updates on its own.</p>
        </div>
        <div className="db-head-actions">
          <LiveStamp at={at} loading={loading} error={error} onRefresh={refresh} />
        </div>
      </div>
      {body}
    </>
  )
}
