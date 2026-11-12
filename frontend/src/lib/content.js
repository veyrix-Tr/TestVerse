import { api } from './api.js'
import { getToken } from './session.js'

/*
  Resources, announcements and the admin's own notification inbox
  (backend/controllers/siteController.js and adminContentController.js).

  `site` = anyone (homepage); `mine`/`read` = the signed-in student;
  everything else sends the admin's token.
*/
const admin = (path, opts = {}) => api('/admin' + path, { ...opts, token: getToken() })

/* ---- public site ---- */
/* The header (to show/hide its "Resources" link) and the Resources section
   both ask for this on the same page load; share one request for a minute
   rather than hitting the API twice. A failed request isn't kept. */
let resCache = null
export const siteResources = () => {
  if (resCache && Date.now() - resCache.at < 60_000) return resCache.p
  const p = api('/resources').then((r) => r.resources || [])
  resCache = { p, at: Date.now() }
  p.catch(() => {
    if (resCache && resCache.p === p) resCache = null
  })
  return p
}
export const siteAnnouncement = () => api('/announcements').then((r) => r.announcement)
export const siteAnnouncements = () => api('/announcements').then((r) => r.announcements || [])

/* ---- the signed-in student ---- */
export const myResources = () => api('/resources/mine', { token: getToken() }).then((r) => r.resources || [])
// Signed-in: this student's audience-filtered list with read flags. Signed
// out (the homepage bell is for everyone): the public list, treated as read
// so anonymous visitors don't carry a permanent badge.
export const myAnnouncements = () =>
  getToken()
    ? api('/announcements/mine', { token: getToken() }).then((r) => r.announcements)
    : siteAnnouncements().then((rows) => rows.map((a) => ({ ...a, read: true })))
export const markAnnouncementRead = (id) => api('/announcements/' + encodeURIComponent(id) + '/read', { method: 'POST', body: {}, token: getToken() })
export const readAllAnnouncements = () => api('/announcements/read', { method: 'POST', body: {}, token: getToken() })

/* ---- the student's own bell ---- */
export const myNotifications = () => api('/notifications/mine', { token: getToken() })
export const readNotification = (id) => api('/notifications/' + encodeURIComponent(id) + '/read', { method: 'POST', body: {}, token: getToken() })
export const readAllNotifications = () => api('/notifications/read', { method: 'POST', body: {}, token: getToken() })

/* ---- admin: video resources ---- */
export const listResources = () => admin('/resources').then((r) => r.resources)
export const createResource = (body) => admin('/resources', { body }).then((r) => r.resource)
export const updateResource = (id, body) => admin('/resources/' + encodeURIComponent(id), { body, method: 'PUT' }).then((r) => r.resource)
export const deleteResource = (id) => admin('/resources/' + encodeURIComponent(id), { method: 'DELETE' })

/* ---- admin: announcements (list also says how many students read it) ---- */
export const listAnnouncements = () => admin('/announcements')
export const createAnnouncement = (body) => admin('/announcements', { body }).then((r) => r.announcement)
export const updateAnnouncement = (id, body) => admin('/announcements/' + encodeURIComponent(id), { body, method: 'PUT' }).then((r) => r.announcement)
export const deleteAnnouncement = (id) => admin('/announcements/' + encodeURIComponent(id), { method: 'DELETE' })

/* ---- admin: the bell ---- */
export const listNotifications = () => admin('/notifications')
export const markAllNotificationsRead = () => admin('/notifications/read', { body: {} })
export const markNotificationRead = (id) => admin('/notifications/' + encodeURIComponent(id) + '/read', { body: {} })

/* Who sees an announcement — the same list the server checks (lib/announce.js). */
export const AUDIENCES = [
  { value: 'all', label: 'Everyone on the website' },
  { value: 'students', label: 'All signed-in students' },
  { value: 'paid', label: 'Paid students only' },
  { value: 'exam:neet', label: 'NEET students' },
  { value: 'exam:jee-main', label: 'JEE Main students' },
  { value: 'exam:jee-advanced', label: 'JEE Advanced students' },
]
export const audienceLabel = (v) => (AUDIENCES.find((a) => a.value === v) || AUDIENCES[0]).label

/* "https://youtu.be/dQw4…" -> "dQw4…", or null when it isn't a YouTube link. */
export function videoIdOf(input) {
  const s = String(input || '').trim()
  if (/^[\w-]{11}$/.test(s)) return s
  const m = s.match(/(?:youtube\.com\/(?:watch\?(?:[^&]*&)*v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/)
  return m ? m[1] : null
}
