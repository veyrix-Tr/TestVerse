import PendingLink from '../../../components/PendingLink.jsx'
import { fmt, hms, pad } from '../../../lib/format.js'
import { subjectsOf, until, when } from '../fmt.js'
import { pctOf } from '../useTests.js'

const clock = (iso) => fmt(iso, { hour: 'numeric', minute: '2-digit' })
const facts = (t) => `${t.questionCount} questions · ${t.durationMin} min · ${t.totalMarks} marks`

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
        <span className="clock-seg" key={l}>
          <b>{v}</b>
          <small>{l}</small>
        </span>
      ))}
    </div>
  )
}

/* The one loud element on the dashboard: the test in progress, else one to start now, else the next one. */
export function TestHero({ test, now, loading }) {
  if (loading) {
    return (
      <section className="hero is-skeleton" aria-busy="true" aria-label="Loading your next test">
        <div className="hero-main">
          <span className="skel skel-on-navy" style={{ width: '22%', height: 12 }}></span>
          <span className="skel skel-on-navy" style={{ width: '64%', height: 30 }}></span>
          <span className="skel skel-on-navy" style={{ width: '40%' }}></span>
          <span className="skel skel-on-navy" style={{ width: 168, height: 52, borderRadius: 12 }}></span>
        </div>
        <span className="skel skel-on-navy hero-clock-skel"></span>
      </section>
    )
  }
  if (!test) return null
  const href = '/test?test=' + encodeURIComponent(test.id)
  const s = test.status
  const live = s === 'in-progress' || s === 'open'

  let eyebrow, action, note, clockNode
  if (s === 'in-progress') {
    const left = Date.parse(test.attempt.deadline) - now
    eyebrow = 'In progress'
    action = (
      <PendingLink className="btn btn-gold btn-lg" to={href}>
        Resume test
      </PendingLink>
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
      <PendingLink className="btn btn-gold btn-lg" to={href}>
        Start test
      </PendingLink>
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
      <PendingLink className="btn btn-on-navy btn-lg" to={href}>
        Read the instructions
      </PendingLink>
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


/* One test as a card: what it is, how big it is, and what the student can do with it now. */
export function TestCard({ t, now }) {
  const href = '/test?test=' + encodeURIComponent(t.id)
  const s = t.status
  const best = t.best
  const bestPct = pctOf(best)
  const tries = (t.history || []).length

  let state, actions
  if (s === 'in-progress') {
    state = <span className="status status-amber">{hms(Date.parse(t.attempt.deadline) - now)} left</span>
    actions = (
      <PendingLink className="btn btn-gold btn-sm" to={href}>
        {tries ? 'Resume retake' : 'Resume test'}
      </PendingLink>
    )
  } else if (s === 'open') {
    state = <span className="tc-when">{t.closesAt ? 'Closes ' + when(t.closesAt) : 'Open now · no deadline'}</span>
    actions = (
      <PendingLink className="btn btn-primary btn-sm" to={href}>
        Start test
      </PendingLink>
    )
  } else if (s === 'upcoming') {
    state = <span className="status status-blue">Opens in {until(Date.parse(t.opensAt) - now)}</span>
    actions = (
      <PendingLink className="btn btn-outline btn-sm" to={href}>
        Instructions
      </PendingLink>
    )
  } else if (s === 'done') {
    state = null
    actions = (
      <>
        <PendingLink className="btn btn-outline btn-sm" to={'/student/result?test=' + encodeURIComponent(t.id)}>
          View result
        </PendingLink>
        {t.canRetake ? (
          <PendingLink className="btn btn-primary btn-sm" to={href + '&retake=1'}>
            Retake
          </PendingLink>
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
