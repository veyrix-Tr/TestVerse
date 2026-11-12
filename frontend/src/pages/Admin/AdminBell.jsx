import { useCallback, useEffect, useState } from 'react'
import { listNotifications } from '../../lib/content.js'

/*
  The admin bell: just the unread badge. Clicking it opens the Notifications
  section — the same destination as the sidebar's "Notifications" link
  (Admin.jsx passes goTo as onOpen). Refreshes every minute and when the tab
  regains focus.
*/
export default function AdminBell({ onOpen }) {
  const [unread, setUnread] = useState(0)

  const load = useCallback(() => {
    listNotifications().then((r) => setUnread(r.unread || 0), () => {})
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

  return (
    <div className="bell">
      <button
        className="bell-btn"
        type="button"
        title="Notifications"
        aria-label={unread ? 'Notifications, ' + unread + ' unread' : 'Notifications'}
        onClick={() => onOpen && onOpen('notifications')}
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
