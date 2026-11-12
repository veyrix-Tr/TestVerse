import { useCallback } from 'react'
import { toast as hot } from 'react-hot-toast'

/*
  Toasts come from react-hot-toast: one <Toaster position="top-right"> in
  App.jsx renders them (navy card with a gold edge, so they're visible on the
  light pages too). This hook only keeps the old call shape —
  `const { toast, node } = useToast()` with `toast(msg)` / `toast(msg, ms)` —
  so callers don't change; `node` is null now because the Toaster renders
  globally.
*/
export function useToast() {
  // Stable identity: Test.jsx keeps `toast` in an effect's dependency array.
  const toast = useCallback((text, ms = 2600) => hot(text, { duration: ms }), [])
  return { toast, node: null }
}

/*
  A toast when a new announcement arrives while a tab is open (the homepage
  strip and the bell both poll). One toast per announcement per tab — the
  pollers share sessionStorage through this helper, so the same row never
  toasts twice.
*/
export function toastAnnouncementOnce(row) {
  try {
    const KEY = 'tv-ann-toasted'
    const seen = JSON.parse(sessionStorage.getItem(KEY) || '[]')
    if (seen.includes(row.id)) return
    sessionStorage.setItem(KEY, JSON.stringify([...seen, row.id].slice(-20)))
  } catch {
    /* private mode: just toast */
  }
  hot('New announcement: ' + row.body, { duration: 5000, icon: '📣' })
}
