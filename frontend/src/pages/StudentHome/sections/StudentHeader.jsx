import { useEffect, useRef } from 'react'
import { EXAM, NOTES } from '../../../data/studentDemo.js'
import { rupee } from '../../../lib/format.js'

/*
  design/student-home.html <header class="top"> — credits chip, notifications
  popup, account popup (open/close on outside click and Escape, like the
  design's toggle() + document listeners).
*/
export default function StudentHeader({ me, dot, notesOpen, menuOpen, setNotesOpen, setMenuOpen, onLogout }) {
  const notesRef = useRef(null)
  const menuRef = useRef(null)

  useEffect(() => {
    function onDocClick(e) {
      if (e.target.closest && (e.target.closest('.menu') || e.target.closest('#bell') || e.target.closest('#me'))) return
      setNotesOpen(false)
      setMenuOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') {
        setNotesOpen(false)
        setMenuOpen(false)
      }
    }
    document.addEventListener('click', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [setNotesOpen, setMenuOpen])

  function toggle(panel) {
    const willOpen = panel === 'notes' ? !notesOpen : !menuOpen
    setNotesOpen(panel === 'notes' ? willOpen : false)
    setMenuOpen(panel === 'menu' ? willOpen : false)
  }

  return (
    <header className="top">
      <div className="in">
        <a className="brand" href="/student" aria-label="Testverse home">
          <svg className="tv-logo" style={{ height: '38px' }} viewBox="0 0 1784 409" role="img" aria-label="Testverse by Studyverse">
            <use href="#tv-logo" />
          </svg>
        </a>
        <nav className="mainnav" aria-label="Main">
          <a href="/student" aria-current="page">
            Home
          </a>
          <a href="#series">My test series</a>
          <a href="#live">Live tests</a>
          <a href="#results">Results</a>
          <a href="#videos">Video solutions</a>
        </nav>
        <div className="top-right">
          <a className="credit-chip" href="#refer" title="Your credits">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M9 9h6M9 13h6M12 9v8" />
            </svg>
            <span id="credits">{rupee(me.credits)}</span>
            <span className="label">credits</span>
          </a>
          <button
            className="icon-btn"
            type="button"
            id="bell"
            aria-label="Notifications"
            aria-expanded={notesOpen ? 'true' : 'false'}
            onClick={(e) => {
              e.stopPropagation()
              toggle('notes')
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
            <span className="dot" id="bell-dot" hidden={!dot} />
          </button>
          <button
            className="avatar"
            type="button"
            id="me"
            aria-label="Your account"
            aria-expanded={menuOpen ? 'true' : 'false'}
            onClick={(e) => {
              e.stopPropagation()
              toggle('menu')
            }}
          >
            {me.first.charAt(0)}
          </button>
        </div>
      </div>
      <div className="menu notes" id="notes" ref={notesRef} hidden={!notesOpen} role="region" aria-label="Notifications">
        <div className="head">
          <b>Notifications</b>
        </div>
        {NOTES.map((n, i) => (
          <div className={'n' + (n.unread ? ' unread' : '')} key={i}>
            {n.text}
            <span>{n.when}</span>
          </div>
        ))}
      </div>
      <div className="menu" id="menu" ref={menuRef} hidden={!menuOpen}>
        <div className="head">
          <b>{me.name}</b>
          <span id="menu-sub">
            {EXAM.label} {EXAM.year}
            {me.course ? ' · Studyverse course' : ''}
          </span>
        </div>
        <a href="#">My profile</a>
        <a href="#refer">Credits &amp; referrals</a>
        <a href="#">Orders &amp; invoices</a>
        <a href="#parent">Share progress with parent</a>
        <a href="#">Help &amp; contact</a>
        <button type="button" id="logout" onClick={onLogout}>
          Log out
        </button>
      </div>
    </header>
  )
}
