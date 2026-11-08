import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { EXAM } from '../../../data/studentDemo.js'
import { usePopover } from '../usePopover.js'

const NAV = [
  { id: 'top', label: 'Dashboard' },
  { id: 'series', label: 'My test series' },
  { id: 'live', label: 'Live tests' },
  { id: 'results', label: 'Results' },
  { id: 'videos', label: 'Video solutions' },
]

function planLabel(me) {
  if (me.course) return 'Studyverse course'
  if (me.bought) return 'Test series'
  return 'Free account'
}

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
export default function Sidebar({ me, active, onNavigate, sheetOpen, setSheetOpen, onLogout }) {
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

  const visible = NAV.filter((n) => n.id !== 'results' || me.bought)

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
            {visible.map((n) => {
              const isActive = active === n.id
              return (
                <li key={n.id}>
                  <a
                    href={'#' + n.id}
                    className={isActive ? 'is-active' : undefined}
                    aria-current={n.id === 'top' ? 'page' : isActive ? 'location' : undefined}
                    onClick={() => onNavigate(n.id)}
                  >
                    {n.label}
                  </a>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="sidebar-foot">
          <div className="account" ref={accountRef}>
            <div className="account-menu" id="account-menu" hidden={!accountOpen}>
              <a href="#">My profile</a>
              <a href="#">Orders &amp; invoices</a>
              {me.bought ? (
                <a href="#parent" onClick={() => setAccountOpen(false)}>
                  Share progress with parent
                </a>
              ) : null}
              <a href="#">Help &amp; contact</a>
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
                <span>
                  {EXAM.label} {EXAM.year} · {planLabel(me)}
                </span>
              </span>
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
