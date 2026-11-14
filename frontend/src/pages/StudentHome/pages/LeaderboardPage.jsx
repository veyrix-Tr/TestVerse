import { useSearchParams } from 'react-router-dom'
import { fmt } from '../../../lib/format.js'
import Leaderboard from '../../Test/sections/Leaderboard.jsx'
import PageHeader from '../sections/PageHeader.jsx'
import { Empty, LoadError, SkeletonRows } from '../sections/States.jsx'

const KIND = { free: 'Free mock', live: 'Live test', series: 'Test series' }

/*
  "/student/leaderboard[?test=<id>]": the full leaderboard of any test the
  student has submitted. A list of their tests (newest first) picks the
  board; the board itself is Test/sections/Leaderboard.jsx inside a .tv-test
  wrapper, the same one the result page shows.
*/
export default function LeaderboardPage({ data }) {
  const { status, error, tests, reload } = data
  const [params, setParams] = useSearchParams()

  // Tests the student has submitted, most recently taken first
  const taken = tests
    .filter((t) => (t.history || []).length)
    .map((t) => ({ t, last: t.history[0] }))
    .sort((a, b) => Date.parse(b.last.submittedAt) - Date.parse(a.last.submittedAt))
  const picked = taken.find((x) => x.t.id === params.get('test')) || taken[0]

  function pick(id) {
    setParams(
      (p) => {
        const next = new URLSearchParams(p)
        next.set('test', id)
        return next
      },
      { replace: true, preventScrollReset: true },
    )
  }

  return (
    <>
      <PageHeader title="Leaderboard" desc="Where you stand in every test you’ve taken. Ranks use everyone’s first attempt, so retakes are pure practice." />

      {status === 'error' ? (
        <LoadError error={error} onRetry={() => reload()} what="your tests" />
      ) : status === 'loading' ? (
        <SkeletonRows n={3} />
      ) : !taken.length ? (
        <Empty title="No leaderboards yet" text="Submit a test and you’ll see where you rank among everyone who took it." to="/student/tests" action="See your tests" />
      ) : (
        <div className="lbp">
          <nav className="lbp-tests" aria-label="Choose a test">
            <p className="lbp-label">Your tests</p>
            <ul>
              {taken.map(({ t, last }) => (
                <li key={t.id}>
                  <button type="button" className="lbp-test" aria-pressed={picked && picked.t.id === t.id ? 'true' : 'false'} onClick={() => pick(t.id)}>
                    <b>{t.title}</b>
                    <span>
                      {KIND[t.kind] || 'Test'} · {fmt(last.submittedAt, { day: 'numeric', month: 'short' })}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          <section className="lbp-board" aria-labelledby="lbp-title">
            <div className="lbp-board-head">
              <h2 id="lbp-title">{picked.t.title}</h2>
              <p>
                {picked.t.questionCount} questions · {picked.t.totalMarks} marks · {picked.t.durationMin} min
              </p>
            </div>
            <div className="tv-test lb-embed">
              <Leaderboard key={picked.t.id} testId={picked.t.id} />
            </div>
          </section>
        </div>
      )}
    </>
  )
}
