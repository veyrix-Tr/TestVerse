import { EXAMS } from '../../../data/exams.js'

function barColor(v) {
  return v >= 75 ? 'var(--green)' : v >= 65 ? 'var(--blue)' : 'var(--orange)'
}

/* design/testverse-home.html <section id="analysis"> — sample report */
export default function Analysis({ exam }) {
  const ex = exam ? EXAMS[exam] : EXAMS.neet

  return (
    <section id="analysis" className="section" aria-labelledby="analysis-title">
      <div className="wrap">
        <div className="analysis split">
          <div>
            <h2 id="analysis-title">Know exactly where your marks went</h2>
            <p className="lead">After every test you get:</p>
            <ul className="checks">
              <li>
                <span>Score, accuracy and, for live tests, your all-India rank</span>
              </li>
              <li>
                <span>Subject-wise and chapter-wise performance</span>
              </li>
              <li>
                <span>Time spent per question, and marks lost to negative marking</span>
              </li>
              <li>
                <span>Every question with your answer, the correct answer and the full solution</span>
              </li>
              <li>
                <span>Your progress across all 11 tests in the plan</span>
              </li>
              <li>
                <span>Stuck on a question? Request a video solution from our faculty, even for a photo of a question from your book</span>
              </li>
            </ul>
          </div>
          <figure className="report" aria-label="Example result summary">
            <div className="report-top">
              <div>
                <b data-r="score">{ex.sample.score}</b>
                <span>Score</span>
              </div>
              <div>
                <b>1,284</b>
                <span>All-India rank</span>
              </div>
              <div>
                <b data-r="acc">{ex.sample.acc}</b>
                <span>Accuracy</span>
              </div>
            </div>
            <div className="bars" data-bars>
              {ex.sample.bars.map(([label, pct]) => (
                <div className="bar" key={label}>
                  <span>{label}</span>
                  <div>
                    <i style={{ width: pct + '%', background: barColor(pct) }}></i>
                  </div>
                  <b>{pct}%</b>
                </div>
              ))}
            </div>
            <small>Example result for illustration.</small>
          </figure>
        </div>
      </div>
    </section>
  )
}
