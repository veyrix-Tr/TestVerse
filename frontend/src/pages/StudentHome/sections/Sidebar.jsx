import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import PendingLink from '../../../components/PendingLink.jsx'
import StudentBell from './StudentBell.jsx'

// The student pages (keyed by the URL segment after /student/) and pages that are coming soon.
const NAV = [
  { page: '', label: 'Overview' },
  { page: 'tests', label: 'Your tests', count: 'todo', countLabel: 'to do' },
  { page: 'test-series', label: 'Test series' },
  { page: 'results', label: 'Results', count: 'results', countLabel: 'attempts' },
  { page: 'leaderboard', label: 'Leaderboard' },
  { page: 'resources', label: 'Resources' },
  { page: 'notifications', label: 'Notifications' },
]
const SOON_NAV = [
  { page: 'solutions', label: 'Solutions' },
  { page: 'video-requests', label: 'Video requests' },
]

function Logo({ height }) {
  return (
    <svg className="tv-logo" style={{ height }} viewBox="0 0 1784 409" role="img" aria-label="Testverse by Studyverse">
      <use href="#tv-logo" />
    </svg>
  )
}

/*
  App shell navigation. At 1024px and up this is a fixed navy sidebar. Below
  that, a compact top bar shows the logo and a "Menu" button, and the same
  <aside> slides in as a sheet.
*/
/* Below the nav: the batch the student holds, or their free mocks and a way to buy one. */
function PlanPanel({ me, free }) {
  if (me.subscription) {
    return (
      <div className="plan-line">
        <span className="plan-text">
          <span className="plan-dot" aria-hidden="true"></span>
          <b>{me.subscription.batch.name}</b> · Active batch
        </span>
      </div>
    )
  }
  return (
    <div className="plan-line">
      <span className="plan-text">
        Free plan · {free.done} of {free.total} mocks
      </span>
      <PendingLink className="plan-link" to="/subscribe" viewTransition>
        Unlock your batch →
      </PendingLink>
    </div>
  )
}

export default function Sidebar({ me, active, sheetOpen, setSheetOpen, onLogout, loggingOut, counts, free }) {
  const closeRef = useRef(null)
  const menuBtnRef = useRef(null)
  const wasOpen = useRef(false)

  useEffect(() => {
    if (sheetOpen) {
      wasOpen.current = true
      closeRef.current?.focus()
      const onKey = (e) => {
        if (e.key === 'Escape') setSheetOpen(false)
      }
      document.addEventListener('keydown', onKey)
      return () => document.removeEventListener('keydown', onKey)
    }
    if (wasOpen.current) {
      wasOpen.current = false
      menuBtnRef.current?.focus()
    }
    return undefined
  }, [sheetOpen, setSheetOpen])

  return (
    <>
      <div className="topbar">
        <Link className="brand" to="/student" aria-label="Testverse overview">
          <Logo height="26px" />
        </Link>
        <div className="topbar-actions">
          <StudentBell />
          <button ref={menuBtnRef} className="topbar-menu" type="button" aria-expanded={sheetOpen ? 'true' : 'false'} aria-controls="sidebar" onClick={() => setSheetOpen(true)}>
            Menu
          </button>
        </div>
      </div>

      <div className="sheet-scrim" hidden={!sheetOpen} onClick={() => setSheetOpen(false)} aria-hidden="true"></div>

      <aside className={'sidebar' + (sheetOpen ? ' is-open' : '')} id="sidebar" aria-label="Sidebar">
        <div className="sidebar-top">
          <Link className="brand" to="/student" aria-label="Testverse overview">
            <Logo height="32px" />
          </Link>
          <div className="sidebar-actions">
            <StudentBell />
            <button ref={closeRef} className="sheet-close" type="button" onClick={() => setSheetOpen(false)}>
              Close
            </button>
          </div>
        </div>

        <nav className="sidenav" aria-label="Main">
          <ul>
            {NAV.map((n) => {
              const on = active === n.page
              return (
                <li key={n.page || 'overview'}>
                  <Link to={'/student' + (n.page ? '/' + n.page : '')} className={on ? 'is-active' : undefined} aria-current={on ? 'page' : undefined} onClick={() => setSheetOpen(false)}>
                    {n.label}
                    {n.count && counts[n.count] ? (
                      <span className="nav-count">
                        {counts[n.count]}
                        <span className="sr"> {n.countLabel}</span>
                      </span>
                    ) : null}
                  </Link>
                </li>
              )
            })}
          </ul>
          <p className="sidenav-label">Coming soon</p>
          <ul>
            {SOON_NAV.map((n) => (
              <li key={n.page}>
                <Link
                  to={'/student/' + n.page}
                  className={active === n.page ? 'is-active' : undefined}
                  aria-current={active === n.page ? 'page' : undefined}
                  onClick={() => setSheetOpen(false)}
                >
                  {n.label}
                  <span className="nav-soon">Soon</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-foot">
          <PlanPanel me={me} free={free} />
          <div className="me-id">
            <span className="avatar" aria-hidden="true">
              {me.first.charAt(0)}
            </span>
            <span className="me-text">
              <b>{me.name}</b>
              <span>{me.examText || me.email}</span>
            </span>
          </div>
          <nav className="sidenav foot-nav" aria-label="Your account">
            <ul>
              <li>
                <Link
                  to="/student/account"
                  className={active === 'account' ? 'is-active' : undefined}
                  aria-current={active === 'account' ? 'page' : undefined}
                  onClick={() => setSheetOpen(false)}
                >
                  Account
                </Link>
              </li>
              <li>
                <button type="button" className="nav-btn" disabled={loggingOut} onClick={onLogout}>
                  {loggingOut ? 'Logging out…' : 'Log out'}
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </aside>
    </>
  )
}
