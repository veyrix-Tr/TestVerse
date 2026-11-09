/*
  In-memory cache for admin screens, so switching sections shows the last data
  straight away (then refreshes in the background) instead of loading again.
  Cleared on log out.
*/
const store = new Map()

/* { data, at } or undefined */
export const cached = (key) => (key ? store.get(key) : undefined)

export const remember = (key, data) => {
  if (key) store.set(key, { data, at: Date.now() })
}

export const forgetAll = () => store.clear()

