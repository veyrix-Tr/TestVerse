import { loadJSON, removeKey, saveJSON } from './storage.js'

/*
  Demo session shared by /login, /signup, checkout and the student home, so
  signing in on one page is reflected on the others.

  REAL APP: replace this with the JWT the server returns from
  POST /api/auth/login and POST /api/auth/signup (same users table and
  JWT_SECRET as the Studyverse LMS). Store the token in an httpOnly cookie
  and let the server decide who is signed in — never trust this value for
  access to tests or results.
*/
const KEY = 'sv-session'

export function loadSession() {
  return loadJSON(KEY, null)
}

export function saveSession(user) {
  saveJSON(KEY, { at: Date.now(), ...user })
}

export function clearSession() {
  removeKey(KEY)
}
