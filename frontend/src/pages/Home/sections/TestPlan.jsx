import { EXAMS } from '../../../data/exams.js'

/* design/testverse-home.html <section id="plan"> — test plan track */
export default function TestPlan({ exam, onChoose, signupHref }) {
  const ex = exam ? EXAMS[exam] : null

  return (
    <section id="plan" className="section on-light" aria-labelledby="plan-title">
      <div className="wrap">
        <div className="section-head-row">
          <div className="section-head">
            <h2 id="plan-title">
              Your test plan<span data-exam-suffix>{ex ? ' for ' + ex.label : ''}</span>
            </h2>
            <p>What you get when you buy the test series: 11 tests that take you step by step from part syllabus to the full exam.</p>
          </div>
          <div className="exam-switch" role="group" aria-label="Choose exam" data-switch>
            {Object.keys(EXAMS).map((id) => (
              <button key={id} type="button" data-exam={id} aria-pressed={exam === id ? 'true' : 'false'} onClick={() => onChoose(id, true)}>
                {EXAMS[id].label}
              </button>
            ))}
          </div>
        </div>

        <div className="plan-empty" data-when="none" hidden={!!ex}>
          <h3>Choose your exam to see its test plan</h3>
          <p>NEET, JEE Main and JEE Advanced each have their own tests and pattern.</p>
        </div>

        <div className="plan" data-when="some" hidden={!ex}>
          <div className="track">
            <div className="stage stage-part">
              <div className="stage-head">
                <h3>Part tests</h3>
                <span>6 tests</span>
              </div>
              <div className="dots" aria-hidden="true">
                <span>P1</span>
                <span>P2</span>
                <span>P3</span>
                <span>P4</span>
                <span>P5</span>
                <span>P6</span>
              </div>
              <p>Each covers a part of the syllabus, in the order most students study it. Take one as soon as you finish those chapters.</p>
              <span className="spec" data-spec="part">
                {ex ? ex.specs.part : ''}
              </span>
            </div>
            <div className="stage stage-half">
              <div className="stage-head">
                <h3>Half-syllabus tests</h3>
                <span>3 tests</span>
              </div>
              <div className="dots" aria-hidden="true">
                <span>H1</span>
                <span>H2</span>
                <span>H3</span>
              </div>
              <p>Half the syllabus in one paper, in the full exam pattern.</p>
              <span className="spec" data-spec="half">
                {ex ? ex.specs.half : ''}
              </span>
            </div>
            <div className="stage stage-full">
              <div className="stage-head">
                <h3>Full-syllabus tests</h3>
                <span>2 tests</span>
              </div>
              <div className="dots" aria-hidden="true">
                <span>F1</span>
                <span>F2</span>
              </div>
              <p>The complete syllabus, exactly like the real exam.</p>
              <span className="spec" data-spec="full">
                {ex ? ex.specs.full : ''}
              </span>
            </div>
          </div>
          <div className="plan-foot">
            <p>Take any test whenever you're ready. Every test has the same CBT screen, real marking, and full analysis with solutions. Coupon and referral codes are accepted at checkout.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--display)', fontSize: '22px', fontWeight: 700 }}>[PRICE]</span>
              <a className="btn btn-dark" href={signupHref} data-signup>
                Get the test series
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
