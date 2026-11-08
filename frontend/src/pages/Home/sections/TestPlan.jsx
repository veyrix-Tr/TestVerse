import { Link } from 'react-router-dom'
import { EXAMS } from '../../../data/exams.js'
import ExamSwitch from './ExamSwitch.jsx'

const STAGES = [
  { key: 'part', cls: 'stage-part', title: 'Part tests', count: '6 tests', ids: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'], body: 'Each covers a part of the syllabus, in the order most students study it. Take one as soon as you finish those chapters.' },
  { key: 'half', cls: 'stage-half', title: 'Half-syllabus tests', count: '3 tests', ids: ['H1', 'H2', 'H3'], body: 'Half the syllabus in one paper, in the full exam pattern.' },
  { key: 'full', cls: 'stage-full', title: 'Full-syllabus tests', count: '2 tests', ids: ['F1', 'F2'], body: 'The complete syllabus, exactly like the real exam.' },
]

export default function TestPlan({ exam, onChoose, signupHref }) {
  const ex = exam ? EXAMS[exam] : null

  return (
    <section id="plan" className="section s-soft" aria-labelledby="plan-title">
      <div className="wrap">
        <div className="head-row">
          <div className="section-head">
            <p className="eyebrow">The test plan</p>
            <h2 id="plan-title">
              Your test plan<span data-exam-suffix>{ex ? ' for ' + ex.label : ''}</span>
            </h2>
            <p className="intro">11 tests that take you step by step from part syllabus to the full exam. This is what you get when you buy the test series.</p>
          </div>
          <ExamSwitch exam={exam} onChoose={onChoose} label="Choose exam" />
        </div>

        <ol className="track">
          {STAGES.map((s) => (
            <li className={'stage ' + s.cls} key={s.key}>
              <div className="nodes" aria-hidden="true">
                {s.ids.map((id) => (
                  <span key={id}>{id}</span>
                ))}
              </div>
              <div className="stage-head">
                <h3>{s.title}</h3>
                <span>{s.count}</span>
              </div>
              <p>{s.body}</p>
              <span className="spec" data-spec={s.key} hidden={!ex}>
                {ex ? ex.specs[s.key] : ''}
              </span>
            </li>
          ))}
        </ol>

        <div className="plan-foot">
          <p>Take any test whenever you're ready. Every test has the same CBT screen, real marking, and full analysis with solutions. Coupon and referral codes are accepted at checkout.</p>
          <div className="plan-buy">
            <div>
              <small>{ex ? ex.label + ' test series' : 'Test series, per exam'}</small>
              <span className="plan-price">[PRICE]</span>
            </div>
            <Link className="btn btn-primary btn-lg" to={signupHref} data-signup>
              Get the test series
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
