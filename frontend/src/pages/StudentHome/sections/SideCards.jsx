import { Link } from 'react-router-dom'
import PendingLink from '../../../components/PendingLink.jsx'
import { fmt } from '../../../lib/format.js'

const longDay = (iso) => fmt(iso, { day: 'numeric', month: 'long', year: 'numeric' })

const INCLUDED = ['Every test published for your batch', 'The free full-length mocks', 'Score, solutions and analysis after every attempt']
const UNLOCKS = ['Every test published for your batch', 'Live tests on a fixed schedule', 'Video solutions from your teachers']

const TIPS = [
  ['Sit it in one go', 'Find a quiet stretch of time, just like exam day. The clock keeps running if you leave.'],
  ['Mark, don’t stall', 'Unsure? Mark for review and move on. Marked answers still count.'],
  ['Review every wrong answer', 'The solutions and chapter-wise analysis show where your marks slipped.'],
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
