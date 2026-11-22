import { useCallback, useEffect, useRef, useState } from 'react'
import { quietly } from '../../lib/api.js'
import { cached, remember } from './cache.js'

export const LIVE_MS = 20000

/* True while the admin is typing in a form field (not a search box), so an
   automatic refresh never pulls the page out from under them. */
function typing() {
  const el = document.activeElement
  if (!el || !el.closest || !el.closest('.tv-admin')) return false
  if (el.closest('[data-live-ok]')) return false
  if (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true
  return el.tagName === 'INPUT' && !/^(checkbox|radio|button|submit|reset|file)$/.test(el.type)
}

/*
  Loads data and keeps it fresh: every 20 s and when the tab regains focus or
  becomes visible. Old data stays on screen while a refresh runs (no flashing,
  scroll and selection kept). `key` reloads straight away when it changes.
  `cacheKey` remembers the last data across screens (cache.js), so coming back
  to a section shows it at once and refreshes quietly.
  Returns { data, error, at, loading, refresh, setData }.
*/
export function useLive(fetcher, key, cacheKey) {
  const [data, setData] = useState(() => (cached(cacheKey) ? cached(cacheKey).data : null))
  const [error, setError] = useState(null)
  const [at, setAt] = useState(() => (cached(cacheKey) ? cached(cacheKey).at : null))
  const cacheRef = useRef(cacheKey)
  const [loading, setLoading] = useState(false)
  const fetchRef = useRef(fetcher)
  const seq = useRef(0)
  const lastRun = useRef(0)

  useEffect(() => {
    fetchRef.current = fetcher
    cacheRef.current = cacheKey
  })

  // `quiet`: the automatic refreshes don't pop the "can't reach" toast (lib/api.js)
  const load = useCallback((quiet) => {
    const n = ++seq.current
    lastRun.current = Date.now()
    setLoading(true)
    return Promise.resolve()
      .then(() => (quiet ? quietly(fetchRef.current) : fetchRef.current()))
      .then(
        (d) => {
          if (n !== seq.current) return
          setData(d)
          setError(null)
          setAt(Date.now())
          remember(cacheRef.current, d)
        },
        (e) => {
          if (n !== seq.current) return
          setError(e.message || 'Something went wrong.')
        },
      )
      .finally(() => {
        if (n === seq.current) setLoading(false)
      })
  }, [])
  const refresh = useCallback(() => load(false), [load])

  useEffect(() => {
    const t = setTimeout(refresh, 0)
    return () => clearTimeout(t)
  }, [key, refresh])

  useEffect(() => {
    const auto = () => {
      if (document.hidden || typing()) return
      load(true)
    }
    const timer = setInterval(auto, LIVE_MS)
    const soon = () => {
      if (!document.hidden && Date.now() - lastRun.current > 3000) auto()
    }
    window.addEventListener('focus', soon)
    document.addEventListener('visibilitychange', soon)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', soon)
      document.removeEventListener('visibilitychange', soon)
    }
  }, [load])

  return { data, error, at, loading, refresh, setData }
}

/* Re-renders every few seconds so relative times stay true. */
export function useNow(ms = 5000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(t)
  }, [ms])
  return now
}

