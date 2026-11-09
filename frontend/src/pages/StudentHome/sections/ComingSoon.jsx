import { Link } from 'react-router-dom'
import BackButton from '../../../components/BackButton.jsx'

/* The main column for a feature that's coming soon: a navy panel with what's planned. */
export default function ComingSoon({ page }) {
  return (
    <section className="soon" aria-labelledby="soon-title">
      <BackButton to="/student">Back to overview</BackButton>

      <div className="soon-panel">
        <span className="soon-orbit o1" aria-hidden="true"></span>
        <span className="soon-orbit o2" aria-hidden="true"></span>
        <div className="soon-in">
          <span className="soon-name">
            <i aria-hidden="true"></i>
            {page.eyebrow} · In the works
          </span>
          <h1 id="soon-title">
            Coming <em>soon</em>
          </h1>
          <p className="soon-lead">
            <b>{page.title}.</b> {page.text}
          </p>
          <ul className="soon-chips" aria-label="What’s coming">
            {page.points.map(([title, text]) => (
              <li key={title} title={text}>
                {title}
              </li>
            ))}
          </ul>
          <Link className="btn btn-gold" to="/student/tests">
            Take a test meanwhile
          </Link>
        </div>
      </div>
    </section>
  )
}
