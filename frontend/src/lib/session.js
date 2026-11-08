import { api } from './api.js'
import { loadJSON, removeKey, saveJSON } from './storage.js'

/*
  Signed-in session shared by /login, /signup, checkout and the student home.
  Holds the JWT returned by POST /api/auth/login, /signup or /reset-password
  plus the public user it was issued for. The server checks the token on every
  protected request, so this copy only decides what the UI shows.
*/
const KEY = 'tv-session'

/* JWT `exp` claim in ms, or 0 if the token can't be read. */
function expiry(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload.exp * 1000
  } catch {
    return 0
  }
}

function load() {
  const s = loadJSON(KEY, null)
  if (!s || !s.token || !s.user) return null
  if (expiry(s.token) <= Date.now()) {
    removeKey(KEY)
    return null
  }
  return s
}

/* The signed-in user ({ id, name, email, role, exam }) or null. */
export function loadSession() {
  return load()?.user || null
}

export function getToken() {
  return load()?.token || null
}

/* Pass the { token, user } body the auth endpoints return. */
export function saveSession({ token, user }) {
  saveJSON(KEY, { token, user })
}

export function clearSession() {
  removeKey(KEY)
}

/* Confirms the stored token with the server and refreshes the user.
   Returns the user, or null when there is no valid session. A network
   failure keeps the local session so the page still works offline. */
export async function checkSession() {
  const token = getToken()
  if (!token) return null
  try {
    const { user } = await api('/auth/me', { token })
    saveSession({ token, user })
    return user
  } catch (e) {
    if (e.status === 401) {
      clearSession()
      return null
    }
    return loadSession()
  }
}

/* Where to go after signing in: a same-site ?next= path, else the dashboard. */
export function nextPath(fallback = '/student') {
  const next = new URLSearchParams(window.location.search).get('next')
  return next && next.startsWith('/') && !next.startsWith('//') ? next : fallback
}
