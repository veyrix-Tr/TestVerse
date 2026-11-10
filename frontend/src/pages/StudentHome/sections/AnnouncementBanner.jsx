import { useEffect, useState } from 'react'
import { markAnnouncementRead, myAnnouncements } from '../../../lib/content.js'

/*
  The banner at the top of the student dashboard: every announcement aimed at
  this student (GET /api/announcements/mine — by exam, paid/free or everyone),
  newest first, unread ones showing one after the other. Dismissing one marks
  it read on the server (the admin's "N of M read" moves up) and it never comes
  back; the list is re-read every minute, so a brand-new announcement appears
  without a reload. API unreachable: no banner, the dashboard still works.
*/
export default function AnnouncementBanner() {
  const [items, setItems] = useState(null) // null = loading, [] = nothing to show

  useEffect(() => {
    let live = true
    const load = () =>
      myAnnouncements().then(
        (rows) => live && setItems(rows),
        () => live && setItems((n) => n || []),
      )
    load()
    const t = setInterval(() => {
      if (!document.hidden) load()
    }, 60000)
    return () => {
      live = false
      clearInterval(t)
    }
  }, [])

  const next = (items || []).find((a) => !a.read)
  if (!next) return null

  function dismiss() {
    setItems((list) => (list || []).map((x) => (x.id === next.id ? { ...x, read: true } : x)))
    markAnnouncementRead(next.id).catch(() => {
      /* the next refresh will ask again */
    })
  }

  return (
    <div className="ann-banner" role="status">
      <span className="ann-banner-dot" aria-hidden="true" />
      <p className="ann-banner-text">
        {next.body}
        {next.link ? (
          <a href={next.link} target="_blank" rel="noreferrer">
            Learn more
          </a>
        ) : null}
      </p>
      <button className="ann-banner-x" type="button" aria-label="Dismiss announcement" onClick={dismiss}>
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  )
}
