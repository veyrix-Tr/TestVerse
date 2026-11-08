import { useEffect, useRef } from 'react'
import { EXAM, NOTES } from '../../../data/studentDemo.js'
import { rupee } from '../../../lib/format.js'
import { Link } from 'react-router-dom'

/*
  design/student-home.html <header class="top"> — credits chip, notifications
  popup, account popup (open/close on outside click and Escape, like the
  design's toggle() + document listeners).
*/
export default function StudentHeader({ me, dot, notesOpen, menuOpen, setNotesOpen, setMenuOpen, onLogout }) {
  const notesRef = useRef(null)
  const menuRef = useRef(null)
  const unread = NOTES.filter((n) => n.unread).length

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
        <Link className="brand" to="/student" aria-label="Testverse home">
          <svg className="tv-logo" style={{ height: '34px' }} viewBox="0 0 1784 409" role="img" aria-label="Testverse by Studyverse">
            <use href="#tv-logo" />
          </svg>
        </Link>
        <nav className="mainnav" aria-label="Main">
          <Link to="/student" aria-current="page">
            Home
          </Link>
          <a href="#series">My test series</a>
          <a href="#live">Live tests</a>
          <a href="#results">Results</a>
          <a href="#videos">Video solutions</a>
        </nav>
        <div className="top-right">
          <a className="credit-chip" href="#refer" title="Your credits">
            <span id="credits">{rupee(me.credits)}</span>
            <span className="label">credits</span>
          </a>
          <button
            className="icon-btn"
            type="button"
            id="bell"
            aria-label={dot ? 'Notifications, ' + unread + ' unread' : 'Notifications'}
            aria-expanded={notesOpen ? 'true' : 'false'}
            onClick={(e) => {
              e.stopPropagation()
              toggle('notes')
            }}
          >
            Alerts
            <span className="dot" id="bell-dot" hidden={!dot} aria-label={unread + ' unread'}>
              {unread}
            </span>
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
