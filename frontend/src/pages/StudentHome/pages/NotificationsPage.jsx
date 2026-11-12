import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  markAnnouncementRead,
  myAnnouncements,
  myNotifications,
  readAllAnnouncements,
  readAllNotifications,
  readNotification,
} from '../../../lib/content.js'

/*
  /student/notifications — the bell's inbox as its own page. Personal
  updates (welcome, batch, new test) and announcements in one list, unread
  rows on a golden background so the section reads as "notifications" instead
  of blending into the dashboard. Clicking marks read: updates jump to their
  `view`, announcements open their link. Refreshes on mount and on focus.
*/
const KIND = { welcome: 'Welcome', purchase: 'Batch', test: 'New test', announcement: 'Announcement' }

export default function NotificationsPage() {
  const navigate = useNavigate()
  const [notes, setNotes] = useState(null) // { notifications, unread } | null
  const [anns, setAnns] = useState(null) // announcement[] | null

  const load = useCallback(() => {
    myNotifications().then(
      (r) => setNotes(r),
      () => setNotes((n) => n || { notifications: [], unread: 0 }),
    )
    myAnnouncements().then(
      (rows) => setAnns(rows),
      () => setAnns((a) => a || []),
    )
  }, [])

  useEffect(load, [load])
  useEffect(() => {
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [load])

  const list = (notes && notes.notifications) || []
  const announcements = anns || []
  const unreadNotes = (notes && notes.unread) || 0
  const unreadAnns = announcements.filter((a) => !a.read).length
  const unread = unreadNotes + unreadAnns
  const loaded = notes !== null && anns !== null

  async function openNotification(n) {
    if (!n.read) {
      try {
        await readNotification(n.id)
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
    if (n.view) navigate(n.view)
  }

  async function openAnnouncement(a) {
    if (!a.read) {
      try {
        await markAnnouncementRead(a.id)
      } catch {
        /* ignore */
      }
      setAnns((rows) => rows.map((x) => (x.id === a.id ? { ...x, read: true } : x)))
    }
    if (a.link) window.open(a.link, '_blank', 'noopener,noreferrer')
  }

  async function markAll() {
    try {
      await Promise.all([readAllNotifications(), readAllAnnouncements()])
    } catch {
      /* one failed; the refresh shows the truth */
    }
    setNotes((s) => s && { ...s, unread: 0, notifications: s.notifications.map((x) => ({ ...x, read: true })) })
    setAnns((rows) => rows.map((x) => ({ ...x, read: true })))
  }

  return (
    <div className="npage">
      <div className="npage-head">
        <div>
          <h1>Notifications</h1>
          <p className="meta">{loaded ? (unread ? unread + ' unread' : "You're all caught up") : 'Loading…'}</p>
        </div>
        <button className="btn btn-outline btn-sm" type="button" onClick={markAll} disabled={!unread}>
          Mark all read
        </button>
      </div>

      {list.length > 0 ? (
        <section>
          <p className="npage-label">Updates</p>
          <ul className="bell-list npage-list">
            {list.map((n) => (
              <li key={n.id}>
                <button className={'bell-item' + (n.read ? '' : ' is-new')} type="button" onClick={() => openNotification(n)}>
                  <span className="bell-text">
                    <span className="bell-kind">{KIND[n.type] || 'Update'}</span>
                    <b>{n.text}</b>
                    <span className="meta">{n.createdAt ? new Date(n.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {announcements.length > 0 ? (
        <section>
          <p className="npage-label">Announcements</p>
          <ul className="bell-list npage-list">
            {announcements.map((a) => (
              <li key={a.id}>
                <button className={'bell-item' + (a.read ? '' : ' is-new')} type="button" onClick={() => openAnnouncement(a)}>
                  <span className="bell-text">
                    <b>{a.body}</b>
                    <span className="meta">{a.startsAt ? new Date(a.startsAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {loaded && list.length === 0 && announcements.length === 0 ? <div className="bell-empty">Nothing yet — new tests and announcements show up here.</div> : null}
    </div>
  )
}
