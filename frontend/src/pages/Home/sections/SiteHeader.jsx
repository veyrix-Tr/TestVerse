import { useState } from 'react'
import { Link } from 'react-router-dom'

/* design/testverse-home.html <header class="site-header"> + mobile menu script */
export default function SiteHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="site-header">
      <div className="wrap">
        <Link className="brand" to="/" aria-label="Testverse by Studyverse, home">
          <svg className="tv-logo" style={{ height: '44px' }} viewBox="0 0 1784 409" role="img" aria-label="Testverse by Studyverse">
            <use href="#tv-logo" />
          </svg>
        </Link>
        <nav className="nav" aria-label="Main">
          <a href="#plan">Test plan</a>
          <a href="#why">Why Testverse</a>
          <a href="#analysis">Analysis</a>
          <a href="#refer">Refer &amp; earn</a>
        </nav>
        <div className="header-actions">
          <Link className="btn btn-ghost login" to="/login">
            Log in
          </Link>
          <Link className="btn btn-gold" to="/signup">
            Sign up
          </Link>
          <button
            className="menu-btn"
            type="button"
            aria-expanded={open ? 'true' : 'false'}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? 'Close' : 'Menu'}
          </button>
        </div>
      </div>
      <nav id="mobile-nav" className={'mobile-nav' + (open ? ' open' : '')} aria-label="Mobile" onClick={(e) => e.target.tagName === 'A' && setOpen(false)}>
        <a href="#plan">Test plan</a>
        <a href="#why">Why Testverse</a>
        <a href="#analysis">Analysis</a>
        <a href="#refer">Refer &amp; earn</a>
        <Link to="/login">Log in</Link>
      </nav>
    </header>
  )
}
