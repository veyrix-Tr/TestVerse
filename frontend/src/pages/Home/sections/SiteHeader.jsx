import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AuthLink from '../../../components/AuthLink.jsx'
import { siteResources } from '../../../lib/content.js'
import StudentBell from '../../StudentHome/sections/StudentBell.jsx'

const LINKS = [
  ['#plan', 'Test plan'],
  ['#cbt', 'CBT screen'],
  ['#analysis', 'Analysis'],
  ['#parents', 'For parents'],
  ['#resources', 'Resources'],
  ['#faq', 'FAQ'],
]

/* Sticky navy header with a text "Menu" sheet on small screens. Nav links
   scroll in place instead of changing the hash, so a chosen exam (#neet …)
   stays in the URL; the section in view is marked as current. The
   "Resources" link only shows once there are published videos, since that
   section isn't rendered otherwise. */
export default function SiteHeader() {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(null)
  const [scrolled, setScrolled] = useState(false)
  const [hasRes, setHasRes] = useState(false)

  useEffect(() => {
    let live = true
    siteResources()
      .then((rows) => live && setHasRes(rows.length > 0))
      .catch(() => {})
    return () => {
      live = false
    }
  }, [])

  const links = hasRes ? LINKS : LINKS.filter(([href]) => href !== '#resources')

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
    // Sections that load late (Resources) may not be in the DOM yet on this
    // commit; wait a frame so they're observed once they appear.
    const raf = requestAnimationFrame(() =>
      LINKS.forEach(([href]) => {
        const el = document.querySelector(href)
        if (el) io.observe(el)
      }),
    )
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      io.disconnect()
    }
  }, [hasRes])

  // Always handled here: letting the browser follow the link would replace
  // the exam kept in the hash (#neet …), even when the section is missing.
  function go(e, href) {
    e.preventDefault()
    setOpen(false)
    document.querySelector(href)?.scrollIntoView()
  }

  const navLinks = links.map(([href, label]) => (
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
          <StudentBell />
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
