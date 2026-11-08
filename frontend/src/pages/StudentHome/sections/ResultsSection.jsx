import { Link } from 'react-router-dom'
import { RESULTS } from '../../../data/studentDemo.js'
import { fmt } from '../../../lib/format.js'
import SectionHead from '../SectionHead.jsx'

/* Recent results as a roomy table (stacks into rows on phones). */
export default function ResultsSection() {
  return (
    <section className="section" id="results" aria-labelledby="results-title">
      <SectionHead id="results-title" title="Recent results" desc="Scores, accuracy and rank from your last few tests.">
        <a className="text-link" href="#results">
          All results
        </a>
      </SectionHead>
      <div className="card table-card">
        <table className="results">
          <thead>
            <tr>
              <th scope="col">Test</th>
              <th scope="col" className="num">
                Score
              </th>
              <th scope="col" className="num">
                Accuracy
              </th>
              <th scope="col">All-India rank</th>
              <th scope="col">
                <span className="sr">Action</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {RESULTS.slice(0, 4).map((r) => {
              const p = Math.round((r.score / r.max) * 100)
              return (
                <tr key={r.test}>
                  <td className="r-test">
                    <b>{r.test}</b>
                    <span className="meta">
                      {fmt(r.when, { day: 'numeric', month: 'short', year: 'numeric' })}
                      {r.live ? <span className="status status-blue">Live</span> : null}
                    </span>
                  </td>
                  <td className="num r-score" data-label="Score">
                    <b>{r.score}</b>
                    <span className="muted"> / {r.max}</span>
                    <span className="r-pct">{p}%</span>
                  </td>
                  <td className="num" data-label="Accuracy">
                    {r.acc}%
                  </td>
                  <td className="r-rank" data-label="Rank">
                    {r.rank ? (
                      <>
                        <b>{r.rank.split(' of ')[0]}</b>
                        <span className="muted">of {r.rank.split(' of ')[1]}</span>
                      </>
                    ) : (
                      <span className="muted">Not ranked</span>
                    )}
                  </td>
                  <td className="r-action">
                    <Link className="btn btn-outline btn-sm" to="/test?test=P4&view=result">
                      View analysis
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
