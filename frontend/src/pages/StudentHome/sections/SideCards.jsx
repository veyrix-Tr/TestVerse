import { Link } from 'react-router-dom'
import { fmt } from '../../../lib/format.js'

/* Right rail: where solutions live, and the student's batch (or how to get one). */
export default function SideCards({ me, latestDone }) {
  return (
    <>
      <section className="card rail-card" id="videos" aria-labelledby="videos-title">
        <h2 id="videos-title">Video solutions</h2>
        <p className="rail-text">
          Every test’s result has a worked solution for each question, and a video where your teacher recorded one. Open a completed test to go through it.
        </p>
        {latestDone ? (
          <Link className="text-link" to={'/test?test=' + encodeURIComponent(latestDone.id) + '&view=result'}>
            Review {latestDone.title}
          </Link>
        ) : (
          <p className="meta">Finish a test to see its solutions here.</p>
        )}
      </section>

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
        <section className="card rail-card teacher-card" id="batch" aria-labelledby="batch-title">
          <p className="eyebrow">Free access</p>
          <h2 id="batch-title">Unlock every test in your batch</h2>
          <p className="rail-text">You can take the free mock tests now. Buy your batch to get every test your teachers publish for it, with full solutions.</p>
          <Link className="btn btn-gold btn-block" to="/subscribe" viewTransition>
            See your batch
          </Link>
        </section>
      )}
    </>
  )
}
