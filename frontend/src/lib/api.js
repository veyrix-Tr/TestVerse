/*
  Thin fetch wrapper for the Testverse backend (TestVerse/backend).
  In dev, Vite proxies /api to the backend (see vite.config.js); in production
  set VITE_API_URL to the deployed backend's origin.
*/
const BASE = import.meta.env.VITE_API_URL || ''

export class ApiError extends Error {
  constructor(message, status, field) {
    super(message)
    this.status = status
    this.field = field // form field the server blamed, when it names one
  }
}

export async function api(path, { body, token } = {}) {
  let res
  try {
    res = await fetch(BASE + '/api' + path, {
      method: body ? 'POST' : 'GET',
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError("Can't reach Testverse right now. Check your connection and try again.", 0)
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(data.error || 'Something went wrong. Please try again.', res.status, data.field)
  return data
}
