import { useState } from 'react'
import { Link } from 'react-router-dom'
import { fmt, hms, pad } from '../../../lib/format.js'
import SectionHead from '../SectionHead.jsx'
import { GROUPS, pctOf } from '../useTests.js'

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
          {test.isFree ? ' · Free mock' : ''}
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

const EXAM_LABEL = { neet: 'NEET', jee: 'JEE Main' }

/* "Physics, Chemistry, Biology" -> ["Physics", "Chemistry", "Biology"] */
const subjectsOf = (t) => (t.subject || '').split(',').map((x) => x.trim()).filter(Boolean)

const FILTERS = [
  { key: 'all', label: 'All', has: () => true },
  { key: 'todo', label: 'To do', has: (s) => s === 'in-progress' || s === 'open' || s === 'upcoming' },
  { key: 'done', label: 'Completed', has: (s) => s === 'done' },
]

/* One test as a card: what it is, how big it is, and what the student can do with it now. */
function TestCard({ t, now }) {
  const href = '/test?test=' + encodeURIComponent(t.id)
  const s = t.status
  const best = t.best
  const bestPct = pctOf(best)
  const tries = (t.history || []).length

  let state, actions
  if (s === 'in-progress') {
    state = <span className="status status-amber">{hms(Date.parse(t.attempt.deadline) - now)} left</span>
    actions = (
      <Link className="btn btn-gold btn-sm" to={href}>
        {tries ? 'Resume retake' : 'Resume test'}
      </Link>
    )
  } else if (s === 'open') {
    state = <span className="tc-when">{t.closesAt ? 'Closes ' + when(t.closesAt) : 'Open now · no deadline'}</span>
    actions = (
      <Link className="btn btn-primary btn-sm" to={href}>
        Start test
      </Link>
    )
  } else if (s === 'upcoming') {
    state = <span className="status status-blue">Opens in {until(Date.parse(t.opensAt) - now)}</span>
    actions = (
      <Link className="btn btn-outline btn-sm" to={href}>
        Instructions
      </Link>
    )
  } else if (s === 'done') {
    state = null
    actions = (
      <>
        <Link className="btn btn-outline btn-sm" to={href + '&view=result'}>
          View result
        </Link>
        {t.canRetake ? (
          <Link className="btn btn-primary btn-sm" to={href + '&retake=1'}>
            Retake
          </Link>
        ) : null}
      </>
    )
  } else {
    state = <span className="tc-when">{t.closesAt ? 'Closed ' + when(t.closesAt) : 'Closed'}</span>
    actions = null
  }

  return (
    <li>
      <article className={'tcard is-' + s} aria-labelledby={'tc-' + t.id}>
        <div className="tc-badges">
          {t.isFree ? <span className="chip chip-gold">Free mock</span> : null}
          {EXAM_LABEL[t.exam] ? <span className="chip chip-grey">{EXAM_LABEL[t.exam]}</span> : null}
          {s === 'done' ? <span className="status status-green">Completed{tries > 1 ? ' · ' + tries + ' attempts' : ''}</span> : null}
        </div>

        <h3 className="tc-title" id={'tc-' + t.id}>
          {t.title}
        </h3>
        <p className="tc-subjects">{subjectsOf(t).join(' · ')}</p>

        <dl className="tc-facts">
          <div>
            <dt>Questions</dt>
            <dd>{t.questionCount}</dd>
          </div>
          <div>
            <dt>Minutes</dt>
            <dd>{t.durationMin}</dd>
          </div>
          <div>
            <dt>Marks</dt>
            <dd>{t.totalMarks}</dd>
          </div>
        </dl>

        {s === 'done' && best ? (
          <div className="tc-score">
            <div className="tc-score-top">
              <span>{tries > 1 ? 'Best score' : 'Your score'}</span>
              <b>
                {best.score}
                <small> / {best.maxScore}</small>
              </b>
            </div>
            <span className="tile-bar" aria-hidden="true">
              <i style={{ width: (bestPct || 0) + '%' }}></i>
            </span>
          </div>
        ) : null}

        <div className="tc-foot">
          {state}
          {actions ? <div className="tc-actions">{actions}</div> : null}
        </div>
      </article>
    </li>
  )
}

/* Every published test for this student, filtered by what they can do with it. */
export default function TestsSection({ status, error, groups, total, now, onRetry, free }) {
  const [filter, setFilter] = useState('all')
  const ordered = GROUPS.flatMap((g) => groups[g.key])
  const count = (f) => ordered.filter((t) => f.has(t.status)).length
  const active = FILTERS.find((f) => f.key === filter) || FILTERS[0]
  const shown = ordered.filter((t) => active.has(t.status))

  return (
    <section className="section" id="tests" aria-labelledby="tests-title" aria-busy={status === 'loading' ? 'true' : 'false'}>
      <SectionHead
        id="tests-title"
        title="Your tests"
        desc={free ? 'Your free full-length mocks, on the real exam pattern. Take them as often as you like.' : 'Tests your teachers have published, with your score once you finish.'}
      >
        {status === 'ready' && total ? (
          <div className="filter-tabs" role="group" aria-label="Show tests">
            {FILTERS.map((f) => (
              <button key={f.key} type="button" aria-pressed={filter === f.key ? 'true' : 'false'} onClick={() => setFilter(f.key)}>
                {f.label}
                <span>{count(f)}</span>
              </button>
            ))}
          </div>
        ) : null}
      </SectionHead>

      {status === 'loading' ? (
        <ul className="tcards" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <li key={i} className="tcard is-skeleton">
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
      ) : !shown.length ? (
        <div className="card state-card is-empty">
          <div>
            <h3>{filter === 'done' ? 'Nothing completed yet' : 'You’re all caught up'}</h3>
            <p className="meta">{filter === 'done' ? 'Finish a test and it shows up here with your score.' : 'Every test is done. You can retake any of them from Completed.'}</p>
          </div>
        </div>
      ) : (
        <ul className="tcards">
          {shown.map((t) => (
            <TestCard key={t.id} t={t} now={now} />
          ))}
        </ul>
      )}
    </section>
  )
}
