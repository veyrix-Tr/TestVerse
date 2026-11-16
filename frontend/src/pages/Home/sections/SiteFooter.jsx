import { STUDYVERSE_SITE, STUDYVERSE_URL } from '../../../lib/links.js'

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap footer-grid">
        <div className="about">
          <svg className="tv-logo" viewBox="0 0 1784 409" role="img" aria-label="Testverse by Studyverse">
            <use href="#tv-logo" />
          </svg>
          <p>Test plans and all-India live tests for NEET and JEE, made by Studyverse faculty. Built Entirely Around You.</p>
        </div>
        <div className="col">
          <strong>Exams</strong>
          <a href="#neet">NEET</a>
          <a href="#jee-main">JEE Main</a>
          <a href="#jee-advanced">JEE Advanced</a>
        </div>
        <div className="col">
          <strong>Tests</strong>
          <a href="#plan">Test plan</a>
          <a href="/live-tests">Live tests</a>
        </div>
        <div className="col">
          <strong>Studyverse</strong>
          <a href={STUDYVERSE_SITE} target="_blank" rel="noopener">
            studyverse.in <span aria-hidden="true">↗</span>
            <span className="sr"> (opens in a new tab)</span>
          </a>
          <a href={STUDYVERSE_URL} target="_blank" rel="noopener">
            Studyverse courses <span aria-hidden="true">↗</span>
            <span className="sr"> (opens in a new tab)</span>
          </a>
          <a href="/contact">Contact</a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/refunds">Refund policy</a>
        </div>
      </div>
      <div className="wrap copyright">© 2026 Studyverse. All rights reserved.</div>
    </footer>
  )
}
