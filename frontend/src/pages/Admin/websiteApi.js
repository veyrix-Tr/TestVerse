import { api } from '../../lib/api.js'
import { getToken } from '../../lib/session.js'

/*
  Website settings (backend/controllers/adminWebsiteController.js,
  /api/admin/website): the YouTube channel + per-exam playlists and the
  homepage announcement strip. Same call style as testsApi.js — the session
  stores the token under 'tv-session', so it always goes through getToken().
*/
const call = (path, opts = {}) => api(path, { ...opts, token: getToken() })

/* GET /api/admin/website — resolves to the defaults if the call fails, so the
   Website info screen still renders (saving will then report the real error). */
export async function getWebsiteSettings() {
  try {
    return await call('/admin/website')
  } catch (error) {
    console.error('Error fetching website settings:', error)
    return { announcement: '', showAnnouncement: false, channel: '', playlists: {} }
  }
}

/* PUT /api/admin/website — only the fields you pass are written. */
export async function updateWebsiteSettings(data) {
  return call('/admin/website', { body: data, method: 'PUT' })
}
