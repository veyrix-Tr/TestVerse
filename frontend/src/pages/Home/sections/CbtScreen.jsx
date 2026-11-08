import { EXAMS } from '../../../data/exams.js'

const PALETTE = 'aamannaamaaca' // first 13 states, the rest not visited
const FEATURES = [
  ['Countdown timer', 'Subject-wise sections and a clock that runs exactly like the real paper.'],
  ['Question palette', 'Answered, not answered, not visited and marked for review, at a glance.'],
  ['Real controls', 'Mark for review, clear response, save and next. No surprises on the day.'],
  ['Real marking', 'The actual marking scheme, including negative marking.'],
]

export default function CbtScreen({ exam }) {
  const ex = exam ? EXAMS[exam] : EXAMS.neet
  const title = exam ? ex.label + ' Full Syllabus Test 1' : 'Full Syllabus Test 1'
  const cells = Array.from({ length: 30 }, (_, i) => PALETTE[i] || '')

  return (
    <section id="cbt" className="section s-navy on-navy" aria-labelledby="cbt-title">
      <div className="wrap">
        <div className="section-head center">
          <p className="eyebrow">Exam-day practice</p>
          <h2 id="cbt-title">The same screen you'll see on exam day</h2>
          <p className="intro">Practising on paper doesn't prepare you for a computer-based test under time pressure. Every test here runs on an NTA-style CBT screen.</p>
        </div>

        <figure className="cbt" aria-label="Illustration of the CBT screen">
          <div className="cbt-bar">
            <span data-screen-title>{title}</span>
            <span className="cbt-time">
              <small>Time left</small>
              <b>02:41:18</b>
            </span>
          </div>
          <div className="cbt-tabs" data-screen-tabs>
            {ex.subjects.map((s, i) => (
              <span key={s} className={i === 0 ? 'on' : ''}>
                {s}
              </span>
            ))}
          </div>
          <div className="cbt-body">
            <div className="cbt-q">
              <div className="cbt-qhead">
                <b>Question 12</b>
                <span>+4 correct, −1 wrong</span>
              </div>
              <p>A 2 kg ball moving at 4 m/s hits a 6 kg block at rest and sticks to it. What is the speed of the combined body just after the collision?</p>
              <ol className="cbt-opts">
                <li>0.5 m/s</li>
                <li className="sel">1 m/s</li>
                <li>1.33 m/s</li>
                <li>2 m/s</li>
              </ol>
              <div className="cbt-actions" aria-hidden="true">
                <span>Mark for review and next</span>
                <span>Clear response</span>
                <span className="go">Save and next</span>
              </div>
            </div>
            <div className="cbt-side">
              <div className="palette" aria-hidden="true">
                {cells.map((c, i) => (
                  <span key={i} className={c}>
                    {i + 1}
                  </span>
                ))}
              </div>
              <div className="legend">
                <span>
                  <i className="lg-a"></i>Answered
                </span>
                <span>
                  <i className="lg-n"></i>Not answered
                </span>
                <span>
                  <i className="lg-v"></i>Not visited
                </span>
                <span>
                  <i className="lg-m"></i>Marked for review
                </span>
              </div>
            </div>
          </div>
        </figure>

        <div className="cbt-features">
          {FEATURES.map(([t, b]) => (
            <div key={t}>
              <h3>{t}</h3>
              <p>{b}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
