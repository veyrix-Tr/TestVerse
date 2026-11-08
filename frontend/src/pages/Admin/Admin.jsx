import { useEffect, useRef, useState } from 'react'
import './Admin.css'
import LogoSprite from '../../components/LogoSprite.jsx'
import { useNavigate } from 'react-router-dom'
import { usePageMeta } from '../../lib/hooks.js'
import { clearSession, loadSession } from '../../lib/session.js'
import mountAdmin from './adminApp.js'
import TestsAdmin from './TestsAdmin.jsx'
import { loadTestCount } from './testsApi.js'

/*
  design/admin.html -> route "/admin"

  This component renders only the static shell exactly as the design marks it
  up (sidebar, empty <main id="view">, the two dialogs). All content, routing
  (#dashboard, #tests, …) and every interaction are the design's own script,
  mounted by mountAdmin() below — see adminApp.js.

  Exception: the "Tests" view is real and API-backed. adminApp reports the
  current view through onView; while it is "tests", #view is hidden and the
  React <TestsAdmin/> screen renders in its place.
*/
export default function Admin() {
  usePageMeta({ title: 'Admin — Testverse by Studyverse' })
  const rootRef = useRef(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const [view, setView] = useState(null)
  const [testCount, setTestCount] = useState(null)
  const me = loadSession() // the route loader only lets admins in
  const initials = (me?.name || 'Admin')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  function logOut() {
    clearSession()
    navigate('/login', { replace: true })
  }

  useEffect(() => {
    mountAdmin(rootRef.current, { onView: setView })
  }, [])

  useEffect(() => {
    let live = true
    loadTestCount().then((n) => live && n != null && setTestCount(n))
    return () => {
      live = false
    }
  }, [])

  const showTests = view === 'tests'

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
            if (e.target.closest('[data-view]')) {
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
            <button type="button" data-view="tests">
              Tests <span className="count" data-count="tests">{testCount ?? ''}</span>
            </button>
            <button type="button" data-view="live">
              Live tests
            </button>
            <button type="button" data-view="series">
              Test series
            </button>
            <span className="nav-label">Students</span>
            <button type="button" data-view="students">
              Students &amp; groups
            </button>
            <button type="button" data-view="requests">
              Video requests <span className="count" data-count="requests"></span>
            </button>
            <span className="nav-label">Growth</span>
            <button type="button" data-view="website">
              Website info
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
        <main className="main" id="view" tabIndex={-1} hidden={showTests}></main>
        {showTests && (
          <main className="main" id="tests-view">
            <TestsAdmin onCount={setTestCount} />
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
