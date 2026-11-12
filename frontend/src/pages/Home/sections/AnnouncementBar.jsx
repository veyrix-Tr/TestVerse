import { useEffect, useRef, useState } from 'react'
import { siteAnnouncement } from '../../../lib/content.js'
import { toastAnnouncementOnce } from '../../../lib/useToast.jsx'

const KEY = 'tv-ann-dismissed'
const POLL_MS = 45000

/*
  The strip above the homepage header — the newest announcement an admin has
  switched on (GET /api/announcements). It keeps itself fresh: refetches every
  45s and whenever the tab regains focus, so a newly published announcement
  shows up without a reload — and if one appears while this tab is open, a
  toast announces it too. A failed request (the remote DB blips now and then)
  keeps whatever is already on screen and retries on the next tick.
  Dismissing hides it for this tab only (sessionStorage).
*/
export default function AnnouncementBar() {
  const [a, setA] = useState(null)
  const seen = useRef({ done: false, id: null }) // first fetch only records; later changes toast
  const alive = useRef(true) // false once unmounted, so late polls bail out

  useEffect(() => {
    alive.current = true
    const load = () => {
      siteAnnouncement()
        .then((row) => {
          if (!alive.current) return
          const id = row ? row.id : null
          if (!seen.current.done) seen.current = { done: true, id }
          else {
            if (id && id !== seen.current.id) toastAnnouncementOnce(row)
            seen.current.id = id
          }
          if (!row) return setA(null) // no live announcement anymore (deleted or expired)
          let gone = null
          try {
            gone = sessionStorage.getItem(KEY)
          } catch {
            /* ignore */
          }
          if (gone !== row.id) setA(row)
        })
        .catch(() => {}) // keep the last good state; the next tick retries
    }
    load()
    const t = setInterval(() => {
      if (!document.hidden) load()
    }, POLL_MS)
    const onFocus = () => load()
    document.addEventListener('visibilitychange', onFocus)
    window.addEventListener('focus', onFocus)
    return () => {
      alive.current = false
      clearInterval(t)
      document.removeEventListener('visibilitychange', onFocus)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  if (!a) return null

  return (
    <div className="ann-bar" role="region" aria-label="Announcement">
      <div className="wrap ann-row">
        <p className="ann-text">
          {a.body}
          {a.link ? (
            <a className="ann-link" href={a.link}>
              Learn more
            </a>
          ) : null}
        </p>
        <button
          className="ann-x"
          type="button"
          aria-label="Dismiss announcement"
          onClick={() => {
            setA(null)
            try {
              sessionStorage.setItem(KEY, a.id)
            } catch {
              /* ignore */
            }
          }}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </div>
  )
}
