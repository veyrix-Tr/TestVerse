import { STUDYVERSE_URL } from '../../../lib/links.js'

/* Gold line icons for "What you get". */
const ICONS = {
  video: (
    <>
      <rect x="2.5" y="6" width="13" height="12" rx="2" />
      <path d="m15.5 10.5 6-3.5v10l-6-3.5" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  chat: <path d="M4 5h16v11H9.5L4 20V5Z" />,
  chart: <path d="M6 20v-7M12 20V5M18 20v-10" />,
}

const PERKS = [
  ['video', 'Live classes', 'Concepts taught by Studyverse faculty'],
  ['target', 'Teaching from your results', 'Your teacher sees your Testverse tests'],
  ['chat', 'Doubt solving', 'Ask the people who teach you'],
  ['chart', 'Weekly parent report', 'Progress your family can follow'],
]

/* After the free videos: learn with the teachers behind them. One button, opening Studyverse in a new tab. */
export default function LearnStudyverse() {
  return (
    <section id="studyverse" className="section s-navy on-navy learn" aria-labelledby="learn-title">
      <div className="wrap learn-grid">
        <div className="section-head">
          <p className="eyebrow">Learn with Studyverse</p>
          <h2 id="learn-title">
            Want to learn <span>personally?</span>
          </h2>
          <p className="intro">
            Studyverse courses add live classes and faculty who teach from your own Testverse results. Same account, so all your tests and ranks come with you.
          </p>
          <div className="learn-cta">
            <a className="btn btn-gold btn-lg" href={STUDYVERSE_URL} target="_blank" rel="noopener">
              Explore Studyverse <span aria-hidden="true">↗</span>
              <span className="sr"> (opens in a new tab)</span>
            </a>
            <small>Opens studyverse.in</small>
          </div>
        </div>
        <div className="learn-card">
          <p className="learn-card-title">What you get</p>
          <ul>
            {PERKS.map(([icon, title, text]) => (
              <li key={title}>
                <span className="learn-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    {ICONS[icon]}
                  </svg>
                </span>
                <span className="learn-text">
                  <b>{title}</b>
                  <span>{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
