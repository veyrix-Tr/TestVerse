import { EXAMS } from '../../../data/exams.js'
import { useCountdown } from '../../../lib/hooks.js'
import { pad } from '../../../lib/format.js'
import { Link } from 'react-router-dom'

function Countdown({ iso }) {
  const { d, h, m, s, done } = useCountdown(iso)
  return (
    <div className="countdown" aria-label="Time until the live test starts">
      <div>
        <b>{done ? '00' : String(d)}</b>
        <span>days</span>
      </div>
      <div>
        <b>{pad(h)}</b>
        <span>hours</span>
      </div>
      <div>
        <b>{pad(m)}</b>
        <span>min</span>
      </div>
      <div>
        <b>{pad(s)}</b>
        <span>sec</span>
      </div>
    </div>
  )
}

/* design/testverse-home.html <section class="hero on-navy"> */
export default function Hero({ exam, onChoose, signupHref }) {
  const ex = exam ? EXAMS[exam] : null
  const next = ex ? ex.live[0] : null

  return (
    <section className="hero on-navy">
      <div className="wrap">
        <div>
          <div className="hero-switch-label" id="hero-switch-label">
            I'm preparing for
          </div>
          <div className="exam-switch" role="group" aria-labelledby="hero-switch-label" data-switch>
            {Object.keys(EXAMS).map((id) => (
              <button key={id} type="button" data-exam={id} aria-pressed={exam === id ? 'true' : 'false'} onClick={() => onChoose(id, true)}>
                {EXAMS[id].label}
              </button>
            ))}
          </div>
          <h1>A complete test plan, from your first chapter to the final exam.</h1>
          <p className="hero-lede">
            6 part tests, 3 half-syllabus tests and 2 full-syllabus tests, set by experienced faculty and run on a real CBT screen. Plus all-India live tests, so you know exactly where you stand.
          </p>
          <div className="hero-ctas">
            <Link className="btn btn-gold btn-lg" to={signupHref} data-signup>
              Get the test series
            </Link>
            <a className="btn btn-ghost btn-lg" href="#plan">
              See what's included
            </a>
          </div>
          <p className="hero-note">
            In a Studyverse course? <Link to="/login">Log in with the same account.</Link>
          </p>
        </div>

        <aside className="live-card">
          <div className="pick" data-when="none" hidden={!!ex}>
            <h2>Which exam are you preparing for?</h2>
            <p>Choose one to see its live tests and test plan.</p>
            <div className="pick-buttons">
              <button type="button" data-pick="neet" onClick={() => onChoose('neet', true)}>
                NEET <span>Physics, Chemistry, Biology</span>
              </button>
              <button type="button" data-pick="jee-main" onClick={() => onChoose('jee-main', true)}>
                JEE Main <span>Physics, Chemistry, Maths</span>
              </button>
              <button type="button" data-pick="jee-advanced" onClick={() => onChoose('jee-advanced', true)}>
                JEE Advanced <span>Paper 1 and Paper 2</span>
              </button>
            </div>
          </div>
          <div data-when="some" hidden={!ex}>
            <div className="live-top">
              <small>Next all-India live test</small>
              <strong data-live-title>{next ? next.name : ''}</strong>
              {next ? <Countdown key={next.start} iso={next.start} /> : null}
            </div>
            <ul data-live-list>
              {ex
                ? ex.live.map((t) => (
                    <li key={t.start}>
                      <div className="date">
                        <b>{t.day}</b>
                        <span>{t.when}</span>
                      </div>
                      <div>
                        <strong>{t.name}</strong>
                        <em>{t.meta}</em>
                      </div>
                    </li>
                  ))
                : null}
            </ul>
            <div className="live-foot">
              <a className="btn btn-dark" href={exam ? '/live-tests?exam=' + exam : '/live-tests'} data-live-link>
                See the full live test calendar
              </a>
            </div>
          </div>
        </aside>
      </div>
    </section>
  )
}
