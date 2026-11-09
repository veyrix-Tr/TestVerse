import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { usePopover } from '../usePopover.js'

// Sections of the dashboard (scrolled to by id) and pages that are coming soon.
const NAV = [
  { id: 'top', label: 'Dashboard' },
  { id: 'tests', label: 'Your tests', count: 'todo' },
  { id: 'results', label: 'Results', count: 'results' },
  { id: 'videos', label: 'Solutions' },
]
const SOON_NAV = [
  { page: 'analysis', label: 'Analysis' },
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
      <div className="plan">
        <span className="plan-label">Your batch</span>
        <b>{me.subscription.batch.name}</b>
        <span className="plan-sub">Active · {me.examText || me.subscription.batch.grade}</span>
      </div>
    )
  }
  const pct = free.total ? Math.round((free.done / free.total) * 100) : 0
  return (
    <div className="plan is-free">
      <span className="plan-label">Free access</span>
      <b>
        {free.done} of {free.total} free mocks done
      </b>
      <span className="plan-bar" aria-hidden="true">
        <i style={{ width: pct + '%' }}></i>
      </span>
      <Link className="btn btn-gold btn-sm btn-block" to="/subscribe" viewTransition>
        Unlock your batch
      </Link>
    </div>
  )
}

export default function Sidebar({ me, active, page, onNavigate, sheetOpen, setSheetOpen, onLogout, counts, free }) {
  const { open: accountOpen, setOpen: setAccountOpen, ref: accountRef } = usePopover()
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
        <Link className="brand" to="/student" aria-label="Testverse dashboard">
          <Logo height="26px" />
        </Link>
        <button ref={menuBtnRef} className="topbar-menu" type="button" aria-expanded={sheetOpen ? 'true' : 'false'} aria-controls="sidebar" onClick={() => setSheetOpen(true)}>
          Menu
        </button>
      </div>

      <div className="sheet-scrim" hidden={!sheetOpen} onClick={() => setSheetOpen(false)} aria-hidden="true"></div>

      <aside className={'sidebar' + (sheetOpen ? ' is-open' : '')} id="sidebar" aria-label="Sidebar">
        <div className="sidebar-top">
          <Link className="brand" to="/student" aria-label="Testverse dashboard">
            <Logo height="32px" />
          </Link>
          <button ref={closeRef} className="sheet-close" type="button" onClick={() => setSheetOpen(false)}>
            Close
          </button>
        </div>

        <nav className="sidenav" aria-label="Main">
          <ul>
            {NAV.map((n) => {
              const isActive = !page && active === n.id
              const inner = (
                <>
                  {n.label}
                  {n.count && counts[n.count] ? <span className="nav-count">{counts[n.count]}</span> : null}
                </>
              )
              return (
                <li key={n.id}>
                  {page ? (
                    // On a coming-soon page: go back to the dashboard at that section
                    <Link to={'/student#' + n.id} onClick={() => onNavigate(n.id)}>
                      {inner}
                    </Link>
                  ) : (
                    <a
                      href={'#' + n.id}
                      className={isActive ? 'is-active' : undefined}
                      aria-current={n.id === 'top' ? 'page' : isActive ? 'location' : undefined}
                      onClick={() => onNavigate(n.id)}
                    >
                      {inner}
                    </a>
                  )}
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
                  className={page === n.page ? 'is-active' : undefined}
                  aria-current={page === n.page ? 'page' : undefined}
                  onClick={() => onNavigate(null)}
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
          <div className="account" ref={accountRef}>
            <div className="account-menu" id="account-menu" hidden={!accountOpen}>
              <button
                type="button"
                onClick={() => {
                  setAccountOpen(false)
                  onLogout()
                }}
              >
                Log out
              </button>
            </div>
            <button
              className="account-btn"
              type="button"
              aria-expanded={accountOpen ? 'true' : 'false'}
              aria-controls="account-menu"
              aria-label={'Account: ' + me.name}
              onClick={() => setAccountOpen(!accountOpen)}
            >
              <span className="avatar" aria-hidden="true">
                {me.first.charAt(0)}
              </span>
              <span className="account-text">
                <b>{me.name}</b>
                <span>{[me.examText, me.batch].filter(Boolean).join(' · ') || me.email}</span>
              </span>
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
