import { Link } from 'react-router-dom'

/* Features in the sidebar that aren't built yet. Keyed by the URL segment after /student/. */
export const SOON = {
  analysis: {
    eyebrow: 'Analysis',
    title: 'Your performance analysis',
    text: 'One place to see how you’re improving across every test you take.',
    points: [
      ['Score trend', 'Your marks test by test, so you can see the direction you’re heading.'],
      ['Subject-wise accuracy', 'Which of your subjects are strongest, and which need more practice.'],
      ['Chapters losing you marks', 'The exact chapters where your marks slip, ranked.'],
      ['Time per question', 'Where you spend too long, and where you rush.'],
    ],
  },
  'video-requests': {
    eyebrow: 'Video requests',
    title: 'Ask for a video solution',
    text: 'Stuck on a question? Ask your teachers to explain it on video.',
    points: [
      ['Snap the question', 'Take a photo of any question from a test or your own practice.'],
      ['Say what’s confusing', 'Add a short note so the explanation hits the right spot.'],
      ['Get a video back', 'Your teacher records a step-by-step solution for you.'],
    ],
  },
}

/* The main column for a feature that's coming soon. */
export default function ComingSoon({ page }) {
  return (
    <section className="soon" aria-labelledby="soon-title">
      <div className="soon-hero">
        <span className="chip chip-gold">Coming soon</span>
        <p className="eyebrow">{page.eyebrow}</p>
        <h1 id="soon-title">{page.title}</h1>
        <p className="soon-text">{page.text} We’re building it now and it will appear here when it’s ready.</p>
        <div className="soon-actions">
          <Link className="btn btn-primary" to="/student#tests">
            Take a test meanwhile
          </Link>
          <Link className="btn btn-outline" to="/student">
            Back to dashboard
          </Link>
        </div>
      </div>

      <div>
        <h2 className="soon-sub">What’s coming</h2>
        <ul className="soon-points">
          {page.points.map(([title, text]) => (
            <li key={title} className="card">
              <b>{title}</b>
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
