import { useEffect, useState } from 'react'
import { siteAnnouncement } from '../../../lib/content.js'

const KEY = 'tv-ann-dismissed'

/*
  The strip above the homepage header — the newest announcement an admin has
  switched on (GET /api/announcements). Dismissing it hides it for this tab
  only (sessionStorage), so it comes back in a new tab but not on every
  reload. No announcement, or the API unreachable: nothing renders.
*/
export default function AnnouncementBar() {
  const [a, setA] = useState(null)

  useEffect(() => {
    let live = true
    siteAnnouncement()
      .then((row) => {
        if (!live || !row) return
        let gone = null
        try {
          gone = sessionStorage.getItem(KEY)
        } catch {
          /* ignore */
        }
        if (gone !== row.id) setA(row)
      })
      .catch(() => {})
    return () => {
      live = false
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
