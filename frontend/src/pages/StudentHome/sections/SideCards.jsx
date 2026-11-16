import { Link } from 'react-router-dom'
import PendingLink from '../../../components/PendingLink.jsx'
import { fmt } from '../../../lib/format.js'
import { STUDYVERSE_URL } from '../../../lib/links.js'

const longDay = (iso) => fmt(iso, { day: 'numeric', month: 'long', year: 'numeric' })

const INCLUDED = ['Every test published for your batch', 'The free full-length mocks', 'Score and analysis after every attempt; solutions by email']
const UNLOCKS = ['Every test published for your batch', 'Live tests on a fixed schedule', 'A full year of access from the day you join']

const TIPS = [
  ['Sit it in one go', 'Find a quiet stretch of time, just like exam day. The clock keeps running if you leave.'],
  ['Mark, don’t stall', 'Unsure? Mark for review and move on. Marked answers still count.'],
  ['Review every wrong answer', 'Your result shows each correct answer and the chapter-wise analysis, so you can see where your marks slipped.'],
]

/* The batch a paid student holds. `full` adds what's included (Account page). */
export function BatchCard({ me, full }) {
  const sub = me.subscription
  return (
    <section className="card rail-card batch-card" aria-labelledby="batch-title">
      <p className="eyebrow">Your batch</p>
      <h2 id="batch-title" className="batch-name">
        {sub.batch.name}
      </h2>
      <dl className="kv">
        <div>
          <dt>Status</dt>
          <dd>
            <span className="status status-green">Active</span>
          </dd>
        </div>
        {sub.activatedAt ? (
          <div>
            <dt>Active since</dt>
            <dd>{longDay(sub.activatedAt)}</dd>
          </div>
        ) : null}
        {sub.expiresAt ? (
          <div>
            <dt>Valid until</dt>
            <dd>{longDay(sub.expiresAt)}</dd>
          </div>
        ) : null}
        <div>
          <dt>For</dt>
          <dd>{[me.examText, sub.batch.grade].filter(Boolean).join(' · ') || '—'}</dd>
        </div>
      </dl>
      {full ? (
        <>
          <p className="kv-label">What’s included</p>
          <ul className="dots">
            {INCLUDED.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
        </>
      ) : (
        <Link className="text-link" to="/student/account">
          Plan details
        </Link>
      )}
    </section>
  )
}

/* Free access: progress through the free mocks and the way to a batch. A navy card, so the gold button belongs. */
export function FreePlanCard({ free }) {
  const pct = free.total ? Math.round((free.done / free.total) * 100) : 0
  const left = free.total - free.done
  return (
    <section className="card rail-card upgrade-card" aria-labelledby="batch-title">
      <p className="eyebrow">Free access</p>
      <h2 id="batch-title">Unlock your full test series</h2>
      <div className="upgrade-progress">
        <div className="upgrade-progress-top">
          <span>Free mocks taken</span>
          <b>
            {free.done} of {free.total}
          </b>
        </div>
        <span className="plan-bar" aria-hidden="true">
          <i style={{ width: pct + '%' }}></i>
        </span>
      </div>
      <ul className="dots">
        {UNLOCKS.map((u) => (
          <li key={u}>{u}</li>
        ))}
      </ul>
      <PendingLink className="btn btn-gold btn-block" to="/subscribe" viewTransition>
        Unlock your batch
      </PendingLink>
      <p className="hint">{left > 0 ? `${left} free mock${left === 1 ? '' : 's'} still waiting for you.` : 'You’ve taken every free mock. Retake them any time.'}</p>
    </section>
  )
}

/* Studyverse classes: the same card for every student, opening Studyverse in a new tab. */
export function StudyverseCard() {
  return (
    <section className="card rail-card sv-card" aria-labelledby="sv-title">
      <h2 id="sv-title" className="sv-title">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M22 10 12 5 2 10l10 5 10-5Z" />
          <path d="M6 12v5c0 1.1 2.7 3 6 3s6-1.9 6-3v-5" />
          <path d="M22 10v6" />
        </svg>
        Want to learn personally?
      </h2>
      <p className="rail-text sv-text">Get a Studyverse teacher who works from your own test results.</p>
      <a className="btn btn-gold btn-block" href={STUDYVERSE_URL} target="_blank" rel="noopener">
        Explore Studyverse <span aria-hidden="true">↗</span>
        <span className="sr"> (opens in a new tab)</span>
      </a>
    </section>
  )
}

/* Before the first result: how to get the most from a mock. */
export function TipsCard() {
  return (
    <section className="card rail-card" aria-labelledby="tips-title">
      <h2 id="tips-title">Before your first mock</h2>
      <ol className="tips">
        {TIPS.map(([title, text]) => (
          <li key={title}>
            <b>{title}</b>
            <span>{text}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
