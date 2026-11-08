import { EXAMS } from '../../../data/exams.js'

function barTone(v) {
  return v >= 75 ? 'good' : v >= 65 ? 'mid' : 'low'
}

const GETS = [
  ['Score, accuracy and rank', 'For live tests, your all-India rank too.'],
  ['Subject and chapter performance', 'See exactly which chapters cost you marks.'],
  ['Time and negative marking', 'Time spent per question, and marks lost to guessing.'],
  ['Every solution', 'Your answer, the correct answer and the full solution.'],
  ['Progress across all 11 tests', 'Watch the plan come together, test by test.'],
  ['Video solutions on request', 'Stuck? Ask our faculty, even for a photo of a question from your book.'],
]

export default function Analysis({ exam }) {
  const ex = exam ? EXAMS[exam] : EXAMS.neet

  return (
    <section id="analysis" className="section s-light" aria-labelledby="analysis-title">
      <div className="wrap analysis">
        <div className="analysis-copy">
          <div className="section-head">
            <p className="eyebrow">After every test</p>
            <h2 id="analysis-title">Know exactly where your marks went</h2>
          </div>
          <dl className="gets">
            {GETS.map(([t, d]) => (
              <div key={t}>
                <dt>{t}</dt>
                <dd>{d}</dd>
              </div>
            ))}
          </dl>
        </div>

        <figure className="report" aria-label="Example result summary">
          <div className="report-head">
            <span>{ex.label} Full Syllabus Live Test</span>
            <em>Result</em>
          </div>
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
          <div className="report-block">
            <div className="report-label">Subject-wise accuracy</div>
            <div className="bars" data-bars>
              {ex.sample.bars.map(([label, pct]) => (
                <div className="bar" key={label}>
                  <span>{label}</span>
                  <div>
                    <i className={barTone(pct)} style={{ width: pct + '%' }}></i>
                  </div>
                  <b>{pct}%</b>
                </div>
              ))}
            </div>
          </div>
          <div className="report-block">
            <div className="report-label">Where the marks went</div>
            <div className="split-bar" aria-hidden="true">
              <i className="sb-c" style={{ flex: 64 }}></i>
              <i className="sb-w" style={{ flex: 14 }}></i>
              <i className="sb-u" style={{ flex: 22 }}></i>
            </div>
            <div className="split-legend">
              <span>
                <i className="sb-c"></i>Correct 64%
              </span>
              <span>
                <i className="sb-w"></i>Wrong 14%
              </span>
              <span>
                <i className="sb-u"></i>Skipped 22%
              </span>
            </div>
          </div>
          <small className="report-note">Example result for illustration.</small>
        </figure>
      </div>
    </section>
  )
}
