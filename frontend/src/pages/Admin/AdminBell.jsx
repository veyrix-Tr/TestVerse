import { useCallback, useEffect, useRef, useState } from 'react'
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '../../lib/content.js'
import { ago } from './studentsApi.js'

/*
  The bell: the admin's own inbox. Every event the backend records
  (backend/lib/notify.js — new signups, new purchases) lands here, unread until
  the admin opens it. Clicking one marks it read and jumps to the sidebar
  section it names; `onOpen` is Admin.jsx's goTo(). Rendered twice — in the
  sidebar's brand row (desktop) and in the top bar (small screens) — each copy
  keeps its own state, they both read the same three endpoints.
*/
const KIND = {
  signup: 'Student joined',
  purchase: 'Payment',
}

export default function AdminBell({ onOpen }) {
  const [notes, setNotes] = useState(null) // { notifications, unread } | null
  const [open, setOpen] = useState(false)
  const box = useRef(null)

  const load = useCallback(() => {
    listNotifications().then(
      (r) => setNotes(r),
      () => setNotes((n) => n || { notifications: [], unread: 0 }),
    )
  }, [])

  useEffect(load, [load])
  useEffect(() => {
    const t = setInterval(() => {
      if (!document.hidden) load()
    }, 60000)
    return () => clearInterval(t)
  }, [load])

  // Click away or Escape closes the menu
  useEffect(() => {
    if (!open) return
    const down = (e) => {
      if (box.current && !box.current.contains(e.target)) setOpen(false)
    }
    const key = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', down)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('mousedown', down)
      document.removeEventListener('keydown', key)
    }
  }, [open])

  const unread = (notes && notes.unread) || 0
  const list = (notes && notes.notifications) || []

  async function openItem(n) {
    setOpen(false)
    if (!n.read) {
      try {
        await markNotificationRead(n.id)
      } catch {
        /* the row stays unread until the next refresh */
      }
      setNotes((s) =>
        s && {
          ...s,
          unread: Math.max(0, s.unread - 1),
          notifications: s.notifications.map((x) => (x.id === n.id ? { ...x, read: true } : x)),
        },
      )
    }
    if (n.view && onOpen) onOpen(n.view)
  }

  async function readAll() {
    try {
      await markAllNotificationsRead()
      setNotes((s) => s && { ...s, unread: 0, notifications: s.notifications.map((x) => ({ ...x, read: true })) })
    } catch {
      /* keep the list as it is */
    }
  }

  return (
    <div className="bell" ref={box}>
      <button
        className="bell-btn"
        type="button"
        aria-label={unread ? 'Notifications, ' + unread + ' unread' : 'Notifications'}
        aria-expanded={open ? 'true' : 'false'}
        onClick={() => setOpen((v) => !v)}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {unread > 0 && <span className="bell-badge">{unread > 99 ? '99+' : unread}</span>}
      </button>

      {open && (
        <div className="bell-menu">
          <div className="bell-head">
            <b>Notifications</b>
            <button className="btn btn-outline btn-sm" type="button" onClick={readAll} disabled={!unread}>
              Mark all read
            </button>
          </div>
          <ul className="bell-list">
            {list.length ? (
              list.map((n) => (
                <li key={n.id}>
                  <button className={'bell-item' + (n.read ? '' : ' is-new')} type="button" onClick={() => openItem(n)}>
                    <span className={'bell-dot is-' + n.type} aria-hidden="true" />
                    <span className="bell-text">
                      <span className="bell-kind">{KIND[n.type] || 'Update'}</span>
                      <b>{n.text}</b>
                      <span className="meta">{ago(n.createdAt)}</span>
                    </span>
                  </button>
                </li>
              ))
            ) : (
              <li className="bell-empty">{notes ? 'Nothing yet. New signups and purchases show up here.' : 'Loading…'}</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
