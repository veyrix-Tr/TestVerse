import { useState } from 'react'

/* design/testverse-home.html <header class="site-header"> + mobile menu script */
export default function SiteHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="site-header">
      <div className="wrap">
        <a className="brand" href="/" aria-label="Testverse by Studyverse, home">
          <svg className="tv-logo" style={{ height: '44px' }} viewBox="0 0 1784 409" role="img" aria-label="Testverse by Studyverse">
            <use href="#tv-logo" />
          </svg>
        </a>
        <nav className="nav" aria-label="Main">
          <a href="#plan">Test plan</a>
          <a href="#why">Why Testverse</a>
          <a href="#analysis">Analysis</a>
          <a href="#refer">Refer &amp; earn</a>
        </nav>
        <div className="header-actions">
          <a className="btn btn-ghost login" href="/login">
            Log in
          </a>
          <a className="btn btn-gold" href="/signup">
            Sign up
          </a>
          <button
            className="menu-btn"
            type="button"
            aria-expanded={open ? 'true' : 'false'}
            aria-controls="mobile-nav"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((v) => !v)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </div>
      </div>
      <nav id="mobile-nav" className={'mobile-nav' + (open ? ' open' : '')} aria-label="Mobile" onClick={(e) => e.target.tagName === 'A' && setOpen(false)}>
        <a href="#plan">Test plan</a>
        <a href="#why">Why Testverse</a>
        <a href="#analysis">Analysis</a>
        <a href="#refer">Refer &amp; earn</a>
        <a href="/login">Log in</a>
      </nav>
    </header>
  )
}
