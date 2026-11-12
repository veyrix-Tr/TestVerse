import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { myAnnouncements, myNotifications } from '../../../lib/content.js'
import { toastAnnouncementOnce } from '../../../lib/useToast.jsx'

/*
  The bell (sidebar + top bar + homepage header): just the unread badge.
  Clicking it opens the notifications page (/student/notifications) — the same
  destination as the sidebar's "Notifications" link. Counts refresh every
  minute and when the tab regains focus. Signed out (homepage), both calls
  fall back quietly to zero and the click leads to /login via the route loader.
*/
export default function StudentBell() {
  const navigate = useNavigate()
  const [noteUnread, setNoteUnread] = useState(0)
  const [annUnread, setAnnUnread] = useState(0)
  const seenAnn = useRef(null) // ids from the first fetch; later ones toast

  const load = useCallback(() => {
    myNotifications().then((r) => setNoteUnread(r.unread || 0), () => {})
    myAnnouncements().then(
      (rows) => {
        const list = rows || []
        setAnnUnread(list.filter((a) => !a.read).length)
        const ids = new Set(list.map((a) => a.id))
        if (seenAnn.current === null) seenAnn.current = ids
        else {
          list.forEach((a) => {
            if (!seenAnn.current.has(a.id)) toastAnnouncementOnce(a)
          })
          seenAnn.current = ids
        }
      },
      () => {},
    )
  }, [])

  useEffect(load, [load])
  useEffect(() => {
    const t = setInterval(() => {
      if (!document.hidden) load()
    }, 60000)
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    return () => {
      clearInterval(t)
      window.removeEventListener('focus', onFocus)
    }
  }, [load])

  const unread = noteUnread + annUnread

  return (
    <div className="bell">
      <button
        className="bell-btn"
        type="button"
        title="Notifications"
        aria-label={unread ? 'Notifications, ' + unread + ' unread' : 'Notifications'}
        onClick={() => navigate('/student/notifications')}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {unread > 0 && <span className="bell-badge">{unread > 99 ? '99+' : unread}</span>}
      </button>
    </div>
  )
}
