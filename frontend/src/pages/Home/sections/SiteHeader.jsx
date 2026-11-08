import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AuthLink from '../../../components/AuthLink.jsx'

const LINKS = [
  ['#plan', 'Test plan'],
  ['#cbt', 'CBT screen'],
  ['#analysis', 'Analysis'],
  ['#parents', 'For parents'],
  ['#faq', 'FAQ'],
]

/* Sticky navy header with a text "Menu" sheet on small screens. Nav links
   scroll in place instead of changing the hash, so a chosen exam (#neet …)
   stays in the URL; the section in view is marked as current. */
export default function SiteHeader() {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const first = document.querySelector(LINKS[0][0])
    const onScroll = () => {
      setScrolled(window.scrollY > 8)
      // Above the first linked section (hero, "why"), nothing is current
      if (first && first.getBoundingClientRect().top > window.innerHeight * 0.5) setActive(null)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive('#' + e.target.id)),
      { rootMargin: '-45% 0px -50% 0px' },
    )
    LINKS.forEach(([href]) => {
      const el = document.querySelector(href)
      if (el) io.observe(el)
    })
    return () => {
      window.removeEventListener('scroll', onScroll)
      io.disconnect()
    }
  }, [])

  function go(e, href) {
    const el = document.querySelector(href)
    if (!el) return
    e.preventDefault()
    setOpen(false)
    el.scrollIntoView()
  }

  const navLinks = LINKS.map(([href, label]) => (
    <a key={href} href={href} onClick={(e) => go(e, href)} aria-current={active === href ? 'true' : undefined}>
      {label}
    </a>
  ))

  return (
    <header className={'site-header' + (scrolled ? ' scrolled' : '')}>
      <div className="wrap header-row">
        <Link className="brand" to="/" aria-label="Testverse by Studyverse, home">
          <svg className="tv-logo" viewBox="0 0 1784 409" role="img" aria-label="Testverse by Studyverse">
            <use href="#tv-logo" />
          </svg>
        </Link>
        <nav className="nav" aria-label="Main">
          {navLinks}
        </nav>
        <div className="header-actions">
          <AuthLink className="btn btn-quiet login" to="/login">
            Log in
          </AuthLink>
          <AuthLink className="btn btn-gold" to="/signup">
            Sign up
          </AuthLink>
          <button className="menu-btn" type="button" aria-expanded={open ? 'true' : 'false'} aria-controls="mobile-nav" onClick={() => setOpen((v) => !v)}>
            {open ? 'Close' : 'Menu'}
          </button>
        </div>
      </div>
      <nav
        id="mobile-nav"
        className={'mobile-nav' + (open ? ' open' : '')}
        aria-label="Mobile"
        onClick={(e) => e.target.tagName === 'A' && setOpen(false)}
      >
        <div className="wrap">
          {navLinks}
          <AuthLink to="/login">Log in</AuthLink>
        </div>
      </nav>
    </header>
  )
}
