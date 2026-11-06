import { useEffect, useRef } from 'react'
import './Admin.css'
import LogoSprite from '../../components/LogoSprite.jsx'
import { usePageMeta } from '../../lib/hooks.js'
import mountAdmin from './adminApp.js'

/*
  design/admin.html -> route "/admin"

  This component renders only the static shell exactly as the design marks it
  up (sidebar, empty <main id="view">, the two dialogs). All content, routing
  (#dashboard, #tests, …) and every interaction are the design's own script,
  mounted by mountAdmin() below — see adminApp.js.
*/
export default function Admin() {
  usePageMeta({ title: 'Admin — Testverse by Studyverse' })
  const rootRef = useRef(null)

  useEffect(() => {
    mountAdmin(rootRef.current)
  }, [])

  return (
    <div className="tv-admin" ref={rootRef}>
      <LogoSprite />

      <div className="app">
        <nav className="side" aria-label="Admin sections">
          <div className="brand">
            <svg className="tv-logo" style={{ height: '32px' }} viewBox="0 0 1784 409" role="img" aria-label="Testverse by Studyverse">
              <use href="#tv-logo" />
            </svg>
            <small>ADMIN</small>
          </div>
          <button type="button" data-view="dashboard">
            Dashboard
          </button>
          <button type="button" data-view="tests">
            Tests <span className="count" data-count="tests"></span>
          </button>
          <button type="button" data-view="live">
            Live tests
          </button>
          <button type="button" data-view="series">
            Test series
          </button>
          <button type="button" data-view="exams">
            Exams &amp; patterns
          </button>
          <button type="button" data-view="offers">
            Coupons &amp; referrals
          </button>
          <button type="button" data-view="requests">
            Video requests <span className="count" data-count="requests"></span>
          </button>
          <button type="button" data-view="students">
            Students &amp; groups
          </button>
          <button type="button" data-view="website">
            Website info
          </button>
          <div className="side-foot">
            <span>Demo: changes are saved in this browser only.</span>
            <button type="button" id="reset">
              Reset demo data
            </button>
          </div>
        </nav>
        <main className="main" id="view" tabIndex={-1}></main>
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
          <button className="close" type="button" data-close aria-label="Close">
            ×
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
          <button className="close" type="button" data-close aria-label="Close">
            ×
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
