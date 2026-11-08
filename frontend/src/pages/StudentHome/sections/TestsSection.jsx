import { Link } from 'react-router-dom'
import { fmt, hms, pad } from '../../../lib/format.js'
import SectionHead from '../SectionHead.jsx'
import { GROUPS } from '../useTests.js'

const when = (iso) => fmt(iso, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
const clock = (iso) => fmt(iso, { hour: 'numeric', minute: '2-digit' })
const facts = (t) => `${t.questionCount} questions · ${t.durationMin} min · ${t.totalMarks} marks`

/* "2d 4h", "3h 12m", "12m" until a moment */
function until(ms) {
  const m = Math.max(0, Math.ceil(ms / 60000))
  if (m >= 1440) return Math.floor(m / 1440) + 'd ' + Math.floor((m % 1440) / 60) + 'h'
  if (m >= 60) return Math.floor(m / 60) + 'h ' + (m % 60) + 'm'
  return m + 'm'
}

function Segs({ ms }) {
  const s = Math.max(0, Math.floor(ms / 1000))
  return (
    <div className="clock-segs">
      {[
        [Math.floor(s / 86400), 'days'],
        [pad(Math.floor((s % 86400) / 3600)), 'hrs'],
        [pad(Math.floor((s % 3600) / 60)), 'min'],
        [pad(s % 60), 'sec'],
      ].map(([v, l]) => (
        <span className="seg" key={l}>
          <b>{v}</b>
          <small>{l}</small>
        </span>
      ))}
    </div>
  )
}

/* The one loud element on the dashboard: the test in progress, else one to start now, else the next one. */
export function TestHero({ test, now }) {
  if (!test) return null
  const href = '/test?test=' + encodeURIComponent(test.id)
  const s = test.status
  const live = s === 'in-progress' || s === 'open'

  let eyebrow, action, note, clockNode
  if (s === 'in-progress') {
    const left = Date.parse(test.attempt.deadline) - now
    eyebrow = 'In progress'
    action = (
      <Link className="btn btn-gold btn-lg" to={href}>
        Resume test
      </Link>
    )
    note = 'Your answers are saved. The clock keeps running while you’re away.'
    clockNode = (
      <div className="hero-clock" role="timer" aria-label="Time left in your test">
        <span className="clock-label">Time left</span>
        <span className="clock-big">{hms(left)}</span>
        <span className="clock-sub">Ends at {clock(test.attempt.deadline)}</span>
      </div>
    )
  } else if (s === 'open') {
    eyebrow = 'Available now'
    action = (
      <Link className="btn btn-gold btn-lg" to={href}>
        Start test
      </Link>
    )
    note = `You get the full ${test.durationMin} minute${test.durationMin === 1 ? '' : 's'} from the moment you press Start.`
    clockNode = test.closesAt ? (
      <div className="hero-clock" role="timer" aria-label="Time until the test closes">
        <span className="clock-label">Closes in</span>
        <Segs ms={Date.parse(test.closesAt) - now} />
      </div>
    ) : (
      <div className="hero-clock">
        <span className="clock-label">Duration</span>
        <span className="clock-big">
          {test.durationMin}
          <small className="clock-unit">min</small>
        </span>
        <span className="clock-sub">The clock starts when you do</span>
      </div>
    )
  } else {
    eyebrow = 'Next test'
    action = (
      <Link className="btn btn-on-navy btn-lg" to={href}>
        Read the instructions
      </Link>
    )
    note = `Opens ${when(test.opensAt)}.`
    clockNode = (
      <div className="hero-clock" role="timer" aria-label="Time until the test opens">
        <span className="clock-label">Opens in</span>
        <Segs ms={Date.parse(test.opensAt) - now} />
      </div>
    )
  }

  return (
    <section className={'hero' + (live ? ' is-live' : '')} aria-labelledby="hero-title">
      <div className="hero-main">
        <p className="hero-eyebrow">
          {live ? <span className="live-dot" aria-hidden="true"></span> : null}
          {eyebrow}
          {test.subject ? ' · ' + test.subject : ''}
        </p>
        <h2 id="hero-title">{test.title}</h2>
        <p className="hero-meta">{facts(test)}</p>
        <div className="hero-actions">
          {action}
          <span className="hero-note">{note}</span>
        </div>
      </div>
      {clockNode}
    </section>
  )
}

function Tile({ t, now }) {
  const href = '/test?test=' + encodeURIComponent(t.id)
  const head = (
    <>
      <span className="tt-top">
        <span className="tt-subject">{t.subject}</span>
      </span>
      <span className="tile-name">{t.title}</span>
      <span className="tt-facts">{facts(t)}</span>
    </>
  )

  if (t.status === 'in-progress') {
    return (
      <li>
        <Link className="tile test-tile is-progress" to={href} aria-label={`${t.title}, in progress, resume`}>
          {head}
          <span className="tt-foot">
            <span className="status status-amber">{hms(Date.parse(t.attempt.deadline) - now)} left</span>
            <span className="tt-cta">Resume</span>
          </span>
        </Link>
      </li>
    )
  }
  if (t.status === 'open') {
    return (
      <li>
        <Link className="tile test-tile is-next" to={href} aria-label={`${t.title}, available now, start`}>
          {head}
          <span className="tt-foot">
            <span className="tt-when">{t.closesAt ? 'Closes ' + when(t.closesAt) : 'Open now'}</span>
            <span className="tt-cta">Start</span>
          </span>
        </Link>
      </li>
    )
  }
  if (t.status === 'upcoming') {
    return (
      <li>
        <Link className="tile test-tile is-upcoming" to={href} aria-label={`${t.title}, opens ${when(t.opensAt)}`}>
          {head}
          <span className="tt-foot">
            <span className="tt-when">Opens {when(t.opensAt)}</span>
            <span className="status status-blue">in {until(Date.parse(t.opensAt) - now)}</span>
          </span>
        </Link>
      </li>
    )
  }
  if (t.status === 'done') {
    const a = t.attempt
    const p = a.maxScore ? Math.max(0, Math.round((a.score / a.maxScore) * 100)) : 0
    return (
      <li>
        <Link className="tile test-tile is-done" to={href + '&view=result'} aria-label={`${t.title}, score ${a.score} of ${a.maxScore}, view result`}>
          {head}
          <span className="tt-foot tt-foot-score">
            <span className="tile-score">
              <b>
                {a.score}
                <small> / {a.maxScore}</small>
              </b>
              <span className="tile-bar" aria-hidden="true">
                <i style={{ width: p + '%' }}></i>
              </span>
            </span>
            <span className="tt-cta">View result</span>
          </span>
        </Link>
      </li>
    )
  }
  return (
    <li>
      <div className="tile test-tile is-locked">
        {head}
        <span className="tt-foot">
          <span className="tt-when">{t.closesAt ? 'Closed ' + when(t.closesAt) : 'Closed'}</span>
        </span>
      </div>
    </li>
  )
}

/* Every published test for this student, grouped by what they can do with it. */
export default function TestsSection({ status, error, groups, total, now, onRetry }) {
  return (
    <section className="section" id="tests" aria-labelledby="tests-title" aria-busy={status === 'loading' ? 'true' : 'false'}>
      <SectionHead id="tests-title" title="Your tests" desc="Tests your teachers have published, with your score once you finish." />

      {status === 'loading' ? (
        <ul className="test-tiles" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <li key={i} className="tile test-tile is-skeleton">
              <span></span>
              <span></span>
              <span></span>
            </li>
          ))}
        </ul>
      ) : status === 'error' ? (
        <div className="card state-card" role="alert">
          <div>
            <h3>Couldn’t load your tests</h3>
            <p className="meta">{error}</p>
          </div>
          <button className="btn btn-outline" type="button" onClick={onRetry}>
            Try again
          </button>
        </div>
      ) : !total ? (
        <div className="card state-card is-empty">
          <div>
            <h3>No tests yet</h3>
            <p className="meta">Your teachers will publish them here.</p>
          </div>
        </div>
      ) : (
        <div className="test-groups">
          {GROUPS.map((g) =>
            groups[g.key].length ? (
              <div className={'test-group group-' + g.key} key={g.key}>
                <div className="stage-head">
                  <h3>{g.title}</h3>
                  <span>{groups[g.key].length}</span>
                  <span className="stage-desc">{g.desc}</span>
                </div>
                <ul className="test-tiles">
                  {groups[g.key].map((t) => (
                    <Tile key={t.id} t={t} now={now} />
                  ))}
                </ul>
              </div>
            ) : null,
          )}
        </div>
      )}
    </section>
  )
}
