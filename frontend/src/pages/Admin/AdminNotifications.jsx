import { useCallback, useEffect, useState } from 'react'
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '../../lib/content.js'
import { ago } from './studentsApi.js'

/*
  Admin › Notifications — the bell's inbox as its own section (sidebar →
  Notifications). Newest 30, unread rows on a golden background so they don't
  blend into the page, "Mark all read", and clicking one marks it read and
  jumps to the sidebar section it points at (the same `view` the bell uses).
*/
const KIND = {
  signup: 'Student joined',
  purchase: 'Payment',
}

export default function AdminNotifications({ onOpen }) {
  const [notes, setNotes] = useState(null) // { notifications, unread } | null
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    listNotifications().then(
      (r) => setNotes(r),
      () => setNotes((n) => n || { notifications: [], unread: 0 }),
    )
  }, [])

  useEffect(load, [load])

  const rows = (notes && notes.notifications) || []
  const unread = (notes && notes.unread) || 0

  async function open(n) {
    if (!n.read) {
      try {
        await markNotificationRead(n.id)
      } catch {
        /* the next refresh catches up */
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

  async function markAll() {
    setBusy(true)
    try {
      await markAllNotificationsRead()
      setNotes((s) => s && { ...s, unread: 0, notifications: s.notifications.map((x) => ({ ...x, read: true })) })
    } catch {
      /* ignore; the refresh shows the truth */
    }
    setBusy(false)
  }

  return (
    <div className="npage">
      <div className="npage-head">
        <div>
          <h1>Notifications</h1>
          <p className="meta">{notes === null ? 'Loading…' : unread ? unread + ' unread' : "You're all caught up"}</p>
        </div>
        <button className="btn btn-outline btn-sm" type="button" onClick={markAll} disabled={!unread || busy}>
          Mark all read
        </button>
      </div>

      <ul className="bell-list npage-list">
        {notes !== null && rows.length === 0 ? <li className="bell-empty">No notifications yet — signups, payments and new tests show up here.</li> : null}
        {rows.map((n) => (
          <li key={n.id}>
            <button className={'bell-item' + (n.read ? '' : ' is-new')} type="button" onClick={() => open(n)}>
              <span className="bell-text">
                <span className="bell-kind">{KIND[n.type] || 'Update'}</span>
                <b>{n.text}</b>
                <span className="meta">{ago(n.createdAt)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
