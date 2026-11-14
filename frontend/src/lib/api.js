/*
  Thin fetch wrapper for the Testverse backend (TestVerse/backend).
  In dev, Vite proxies /api to the backend (see vite.config.js); in production
  set VITE_API_URL to the deployed backend's origin.
*/
const BASE = import.meta.env.VITE_API_URL || ''

// A request that hangs (busy server, bad network) gives up after this, so the
// caller can retry — otherwise one stuck autosave would block every later one.
const TIMEOUT_MS = 30000

export class ApiError extends Error {
  constructor(message, status, field, data) {
    super(message)
    this.status = status
    this.field = field // form field the server blamed, when it names one
    this.data = data || {} // the whole error reply (e.g. a paper's `errors` list)
  }
}

/* GET without a body, POST with one; pass `method` for PUT / DELETE. */
export async function api(path, { body, token, method } = {}) {
  let res
  try {
    res = await fetch(BASE + '/api' + path, {
      method: method || (body ? 'POST' : 'GET'),
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(TIMEOUT_MS) : undefined,
    })
  } catch {
    throw new ApiError("Can't reach Testverse right now. Check your connection and try again.", 0)
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(data.error || 'Something went wrong. Please try again.', res.status, data.field, data)
  return data
}
