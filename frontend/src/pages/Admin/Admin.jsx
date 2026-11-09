import { useCallback, useEffect, useRef, useState } from 'react'
import './Admin.css'
import LogoSprite from '../../components/LogoSprite.jsx'
import { useNavigate } from 'react-router-dom'
import { usePageMeta } from '../../lib/hooks.js'
import { clearSession, loadSession } from '../../lib/session.js'
import mountAdmin from './adminApp.js'
import AdminComingSoon from './AdminComingSoon.jsx'
import AdminDashboard from './AdminDashboard.jsx'
import SeriesAdmin from './SeriesAdmin.jsx'
import StudentsAdmin from './StudentsAdmin.jsx'
import TestsAdmin from './TestsAdmin.jsx'
import WebsiteAdmin from './WebsiteAdmin.jsx'
import { loadCounts } from './testsApi.js'
import { forgetAll } from './cache.js'

/*
  design/admin.html -> route "/admin"

  This component renders only the static shell exactly as the design marks it
  up (sidebar, empty <main id="view">, the two dialogs). All content, routing
  (#dashboard, #tests, …) and every interaction are the design's own script,
  mounted by mountAdmin() below — see adminApp.js.

  Exceptions: "Free tests", "Live tests", "Test series", "Students &
  groups" and "Website info" are React screens. adminApp reports the current
  view through onView; while it is "free", "live", "series", "students" or
  "website", #view is hidden and the matching screen renders in its place.
  "Analysis" and "Video requests" show <AdminComingSoon/> the same way.
  Clicking a sidebar item again goes back to that section's first screen (its
  `navKey` remounts it).
*/
export default function Admin() {
  usePageMeta({ title: 'Admin — Testverse by Studyverse' })
  const rootRef = useRef(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const [view, setView] = useState(null)
  const [counts, setCounts] = useState({ free: null, live: null, series: null })
  const [navKey, setNavKey] = useState(0) // bumped on every sidebar click, so clicking a section again goes back to its list
  const setFree = useCallback((n) => setCounts((c) => ({ ...c, free: n })), [])
  const setLive = useCallback((n) => setCounts((c) => ({ ...c, live: n })), [])
  const setSeries = useCallback((n) => setCounts((c) => ({ ...c, series: n })), [])
  const me = loadSession() // the route loader only lets admins in
  const initials = (me?.name || 'Admin')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  function logOut() {
    forgetAll()
    clearSession()
    navigate('/login', { replace: true })
  }

  useEffect(() => {
    mountAdmin(rootRef.current, { onView: setView })
  }, [])

  useEffect(() => {
    let live = true
    loadCounts().then((c) => live && setCounts(c))
    return () => {
      live = false
    }
  }, [])

  const showTests = view === 'free' || view === 'live'
  const showSeries = view === 'series'
  const showStudents = view === 'students'
  const showWebsite = view === 'website'
  const showSoon = view === 'analysis' || view === 'requests'
  const showDash = view === 'dashboard'
  // Open another section the way its sidebar button does (adminApp owns the routing)
  const goTo = (v) => rootRef.current?.querySelector('.side [data-view="' + v + '"]')?.click()

  return (
    <div className="tv-admin" ref={rootRef}>
      <LogoSprite />

      <div className={'app' + (menuOpen ? ' menu-open' : '')}>
        <header className="topbar">
          <svg className="tv-logo" style={{ height: '28px' }} viewBox="0 0 1784 409" role="img" aria-label="Testverse by Studyverse">
            <use href="#tv-logo" />
          </svg>
          <small className="admin-tag">Admin</small>
          <button className="menu-toggle" type="button" aria-controls="admin-nav" aria-expanded={menuOpen ? 'true' : 'false'} onClick={() => setMenuOpen((v) => !v)}>
            {menuOpen ? 'Close' : 'Menu'}
          </button>
        </header>
        <div className="scrim" aria-hidden="true" onClick={() => setMenuOpen(false)}></div>
        <nav
          className="side"
          id="admin-nav"
          aria-label="Admin sections"
          onClick={(e) => {
            const item = e.target.closest('[data-view]')
            if (item) {
              setNavKey((k) => k + 1)
              setMenuOpen(false)
              window.scrollTo(0, 0)
            }
          }}
        >
          <div className="brand">
            <svg className="tv-logo" style={{ height: '30px' }} viewBox="0 0 1784 409" role="img" aria-label="Testverse by Studyverse">
              <use href="#tv-logo" />
            </svg>
            <small className="admin-tag">Admin</small>
          </div>
          <div className="nav">
            <button type="button" data-view="dashboard">
              Dashboard
            </button>
            <span className="nav-label">Content</span>
            <button type="button" data-view="free">
              Free tests <span className="count">{counts.free ?? ''}</span>
            </button>
            <button type="button" data-view="live">
              Live tests <span className="count">{counts.live ?? ''}</span>
            </button>
            <button type="button" data-view="series">
              Test series <span className="count">{counts.series ?? ''}</span>
            </button>
            <span className="nav-label">Students</span>
            <button type="button" data-view="students">
              Students &amp; groups
            </button>
            <span className="nav-label">Growth</span>
            <button type="button" data-view="website">
              Website info
            </button>
            <span className="nav-label">Coming soon</span>
            <button type="button" data-view="analysis">
              Analysis <span className="nav-soon">Soon</span>
            </button>
            <button type="button" data-view="requests">
              Video requests <span className="nav-soon">Soon</span>
            </button>
          </div>
          <div className="side-foot">
            <div className="account">
              <span className="avatar" aria-hidden="true">
                {initials}
              </span>
              <div>
                <b>{me?.name || 'Admin'}</b>
                <span>{me?.email || 'Administrator'}</span>
              </div>
            </div>
            <button type="button" className="logout" onClick={logOut}>
              Log out
            </button>
            <p>Demo: changes are saved in this browser only.</p>
            <button type="button" id="reset">
              Reset demo data
            </button>
          </div>
        </nav>
        <main className="main" id="view" tabIndex={-1} hidden={showDash || showTests || showSeries || showStudents || showSoon || showWebsite}></main>
        {showDash && (
          <main className="main" id="dash-view">
            <AdminDashboard onGo={goTo} />
          </main>
        )}
        {showTests && (
          <main className="main" id="tests-view">
            <TestsAdmin key={view + navKey} kind={view} onCount={view === 'free' ? setFree : setLive} />
          </main>
        )}
        {showSeries && (
          <main className="main" id="series-view">
            <SeriesAdmin key={navKey} onCount={setSeries} />
          </main>
        )}
        {showStudents && (
          <main className="main" id="students-view">
            <StudentsAdmin key={navKey} />
          </main>
        )}
        {showSoon && (
          <main className="main" id="soon-view">
            <AdminComingSoon view={view} />
          </main>
        )}
        {showWebsite && (
          <main className="main" id="website-view">
            <WebsiteAdmin key={navKey} />
          </main>
        )}
      </div>

      {/* Upload / edit test */}
      <dialog id="dlg-test" aria-labelledby="dt-title">
        <div className="dlg-head">
          <h2 id="dt-title">Upload a test</h2>
          <div className="steps" aria-hidden="true">
            <span data-st="1">1 Details</span>
            <span data-st="2">2 Files</span>
            <span data-st="3">3 Review</span>
          </div>
          <button className="close" type="button" data-close aria-label="Close dialog">
            Close
          </button>
        </div>
        <div className="dlg-body" id="dt-body"></div>
        <div className="dlg-foot">
          <button className="btn btn-outline" type="button" id="dt-back">
            Back
          </button>
          <div className="actions" id="dt-next-wrap"></div>
        </div>
      </dialog>

      {/* Generic form dialog */}
      <dialog id="dlg-form" aria-labelledby="df-title">
        <div className="dlg-head">
          <h2 id="df-title"></h2>
          <button className="close" type="button" data-close aria-label="Close dialog">
            Close
          </button>
        </div>
        <div className="dlg-body" id="df-body"></div>
        <div className="dlg-foot">
          <button className="btn btn-outline" type="button" data-close>
            Cancel
          </button>
          <button className="btn btn-primary" type="button" id="df-save">
            Save
          </button>
        </div>
      </dialog>
    </div>
  )
}
