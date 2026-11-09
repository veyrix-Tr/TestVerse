import { Link } from 'react-router-dom'
import { fmt } from '../../../lib/format.js'
import SectionHead from '../SectionHead.jsx'
import { accuracyOf, pctOf } from '../useTests.js'

const day = (iso) => fmt(iso, { day: 'numeric', month: 'short', year: 'numeric' })

/* +48 / −12 next to a retake's score */
function Delta({ v }) {
  if (v == null) return null
  if (v === 0) return <span className="delta">same as before</span>
  return <span className={'delta ' + (v > 0 ? 'up' : 'down')}>{(v > 0 ? '+' : '−') + Math.abs(v)} vs last try</span>
}

/* Every submitted attempt, newest first: score, accuracy, the answer split,
   and links to the full analysis or a retake. */
export default function ResultsSection({ status, rows }) {
  return (
    <section className="section" id="results" aria-labelledby="results-title">
      <SectionHead id="results-title" title="Your results" desc="Every attempt you’ve submitted. Open one to go through the solutions." />

      {status !== 'ready' ? null : !rows.length ? (
        <div className="card state-card is-empty">
          <div>
            <h3>No results yet</h3>
            <p className="meta">Submit your first test and your score, accuracy and solutions will show up here.</p>
          </div>
          <a className="btn btn-outline" href="#tests">
            See your tests
          </a>
        </div>
      ) : (
        <ul className="card res-list">
          {rows.map(({ test: t, a, latest, delta }) => {
            const href = '/test?test=' + encodeURIComponent(t.id)
            const acc = accuracyOf(a)
            return (
              <li className="res-row" key={t.id + '-' + a.attemptNo}>
                <div className="rr-test">
                  <b>{t.title}</b>
                  <span className="meta">
                    {day(a.submittedAt)}
                    {a.attemptNo > 1 ? <span className="chip chip-blue">Retake {a.attemptNo - 1}</span> : null}
                  </span>
                </div>
                <dl className="rr-stats">
                  <div>
                    <dt>Score</dt>
                    <dd>
                      <b>{a.score}</b>
                      <span className="muted"> / {a.maxScore}</span>
                      <span className="rr-sub">
                        {pctOf(a)}%
                        <Delta v={delta} />
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt>Accuracy</dt>
                    <dd>
                      <b>{acc == null ? '—' : acc + '%'}</b>
                    </dd>
                  </div>
                  <div>
                    <dt>Answers</dt>
                    <dd className="split">
                      <span className="s-c">{a.correct || 0} correct</span>
                      <span className="s-w">{(a.wrong || 0) + (a.partial || 0)} wrong</span>
                      <span className="s-s">{a.skipped || 0} skipped</span>
                    </dd>
                  </div>
                </dl>
                <div className="rr-actions">
                  <Link className="btn btn-outline btn-sm" to={href + '&view=result&attempt=' + a.attemptNo}>
                    View result
                  </Link>
                  {latest && t.canRetake ? (
                    <Link className="btn btn-primary btn-sm" to={href + '&retake=1'}>
                      Retake
                    </Link>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
