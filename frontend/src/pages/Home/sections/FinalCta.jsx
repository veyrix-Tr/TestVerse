import { Link } from 'react-router-dom'
import AuthLink from '../../../components/AuthLink.jsx'

export default function FinalCta({ signupHref }) {
  return (
    <section className="final on-navy" aria-labelledby="final-title">
      <div className="wrap">
        <div className="final-main">
          <h2 id="final-title">
            Find out where you stand <span>before the exam does.</span>
          </h2>
          <p>Get the 11-test series for your exam today. Live tests stay free.</p>
          <div className="final-ctas">
            <Link className="btn btn-gold btn-lg" to={signupHref} data-signup>
              Get the test series
            </Link>
            <AuthLink className="btn btn-ghost btn-lg" to="/login">
              Log in
            </AuthLink>
          </div>
        </div>
        <div className="courses">
          <div>
            <h3>Want a teacher too?</h3>
            <p>Studyverse courses add live classes and faculty who teach from your own test results.</p>
          </div>
          <a className="btn btn-ghost" href="/courses">
            Explore Studyverse courses
          </a>
        </div>
      </div>
    </section>
  )
}
