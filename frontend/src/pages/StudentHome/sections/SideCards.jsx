import { Link } from 'react-router-dom'
import { fmt } from '../../../lib/format.js'
import { pctOf } from '../useTests.js'

const UNLOCKS = ['Every test published for your batch', 'Live tests on a fixed schedule', 'Video solutions from your teachers']

const TIPS = [
  ['Sit it in one go', 'Find a quiet 3 hours, just like exam day. The clock keeps running if you leave.'],
  ['Mark, don’t stall', 'Unsure? Mark for review and move on. Marked answers still count.'],
  ['Review every wrong answer', 'The solutions and chapter-wise analysis show where your marks slipped.'],
]

/* Percent of max for the last few attempts, oldest to newest, as bars. */
function TrendCard({ rows }) {
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
            <li key={r.test.id + r.a.attemptNo} className={i === last.length - 1 ? 'is-last' : undefined} title={r.test.title + (r.a.attemptNo > 1 ? ' (retake)' : '') + ': ' + r.a.score + ' / ' + r.a.maxScore}>
              <span className="bar-val">{p}%</span>
              <span className="bar-col" aria-hidden="true">
                <i style={{ height: Math.max(4, p) + '%' }}></i>
              </span>
            </li>
          )
        })}
      </ol>
      <p className="rail-text">Percent of maximum marks, oldest to newest. Retakes count too.</p>
    </section>
  )
}

/* Right rail: the student's plan, their score trend (or tips before the first
   result) and where solutions live. */
export default function SideCards({ me, rows, freeLeft }) {
  const latest = rows[0]
  return (
    <>
      {me.subscription ? (
        <section className="card rail-card" id="batch" aria-labelledby="batch-title">
          <p className="eyebrow">Your batch</p>
          <h2 id="batch-title" className="batch-name">
            {me.subscription.batch.name}
          </h2>
          <p className="rail-text">
            {[me.examText, me.subscription.batch.grade].filter(Boolean).join(' · ')}
            {me.subscription.activatedAt ? (
              <>
                <br />
                Active since {fmt(me.subscription.activatedAt, { day: 'numeric', month: 'long', year: 'numeric' })}
              </>
            ) : null}
          </p>
        </section>
      ) : (
        <section className="card rail-card upgrade-card" id="batch" aria-labelledby="batch-title">
          <p className="eyebrow">You’re on free access</p>
          <h2 id="batch-title">Unlock your full test series</h2>
          <ul className="ticks">
            {UNLOCKS.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
          <Link className="btn btn-gold btn-block" to="/subscribe" viewTransition>
            See your batch
          </Link>
          <p className="hint">{freeLeft ? `${freeLeft} free mock${freeLeft === 1 ? '' : 's'} still waiting for you.` : 'You’ve taken every free mock. Retake them any time.'}</p>
        </section>
      )}

      {rows.length ? (
        <TrendCard rows={rows} />
      ) : (
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
      )}

      <section className="card rail-card" id="videos" aria-labelledby="videos-title">
        <h2 id="videos-title">Solutions</h2>
        <p className="rail-text">Every result has a worked solution for each question, and a video where your teacher recorded one.</p>
        {latest ? (
          <Link className="text-link" to={'/test?test=' + encodeURIComponent(latest.test.id) + '&view=result&attempt=' + latest.a.attemptNo}>
            Review {latest.test.title}
          </Link>
        ) : (
          <p className="meta">Finish a test to see its solutions here.</p>
        )}
      </section>
    </>
  )
}
