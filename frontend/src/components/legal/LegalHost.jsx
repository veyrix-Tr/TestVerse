import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import './legal.css'
import { LEGAL, LEGAL_PATHS } from './legalText.js'

/*
  Wraps every route. Links to /terms, /privacy, /refunds and /contact anywhere
  on the site open their text in a card on top of the current page instead of
  leaving it. Visiting one of those URLs directly (e.g. from the payment
  gateway) shows the homepage with the card open; closing it goes to "/".
*/
export default function LegalHost() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const direct = LEGAL_PATHS[pathname] || null
  const [clicked, setClicked] = useState(null)
  const open = clicked || direct
  const ref = useRef(null)

  // Catch plain clicks on legal links wherever they are
  useEffect(() => {
    function onClick(e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = e.target.closest && e.target.closest('a[href]')
      if (!a || a.target === '_blank') return
      const url = new URL(a.href, window.location.href)
      const key = url.origin === window.location.origin && LEGAL_PATHS[url.pathname]
      if (!key) return
      e.preventDefault()
      setClicked(key)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
    if (open) d.querySelector('.legal-body')?.scrollTo(0, 0)
  }, [open])

  function close() {
    setClicked(null)
    if (direct) navigate('/', { replace: true })
  }

  const doc = open ? LEGAL[open] : null

  return (
    <>
      <Outlet />
      <dialog
        ref={ref}
        className="legal-dialog"
        aria-labelledby="legal-title"
        onCancel={(e) => {
          e.preventDefault()
          close()
        }}
        onClick={(e) => e.target === e.currentTarget && close()}
      >
        {doc ? (
          <div className="legal-card">
            <header className="legal-head">
              <h2 id="legal-title">{doc.title}</h2>
              <button className="legal-close" type="button" onClick={close} aria-label="Close">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </header>
            <div className="legal-body">
              <p className="legal-intro">{doc.intro}</p>
              {doc.sections.map(([h, t]) => (
                <section key={h}>
                  <h3>{h}</h3>
                  <p>{t}</p>
                </section>
              ))}
              {doc.link ? (
                <a className="legal-link" href={doc.link.href} target="_blank" rel="noreferrer">
                  {doc.link.label} →
                </a>
              ) : null}
            </div>
            <nav className="legal-tabs" aria-label="More policies">
              {Object.keys(LEGAL).map((k) => (
                <button key={k} type="button" aria-current={k === open ? 'true' : undefined} onClick={() => setClicked(k)}>
                  {LEGAL[k].title.replace(' of use', '').replace(' policy', '').replace('Contact us', 'Contact')}
                </button>
              ))}
            </nav>
          </div>
        ) : null}
      </dialog>
    </>
  )
}
