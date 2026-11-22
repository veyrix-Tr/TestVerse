/*
  After a new deploy every page file gets a new name. A tab that was open
  before the deploy still asks for the old names, which no longer exist, so
  opening another page fails ("Failed to fetch dynamically imported module").
  Reloading picks up the new version. reloadOnce() does that at most once per
  15 seconds, so a page that really is broken can't reload forever.
*/
const KEY = 'tv-reloaded-at'

export const isStaleBuild = (err) =>
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS|ChunkLoadError/i.test(
    String((err && (err.message || err)) || ''),
  )

/* Reloads the page and returns true, or returns false if it already did so moments ago. */
export function reloadOnce() {
  let last = 0
  try {
    last = Number(sessionStorage.getItem(KEY) || 0)
  } catch {
    /* storage blocked: still reload */
  }
  if (Date.now() - last < 15000) return false
  try {
    sessionStorage.setItem(KEY, String(Date.now()))
  } catch {
    /* ignore */
  }
  window.location.reload()
  return true
}
