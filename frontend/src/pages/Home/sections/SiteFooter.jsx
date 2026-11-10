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
          <a href="https://www.youtube.com/@[your-channel]" target="_blank" rel="noopener">
            Video library on YouTube
          </a>
        </div>
        <div className="col">
          <strong>Studyverse</strong>
          <a href="/courses">Courses</a>
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
