import { useEffect, useState } from 'react'

/* Ticking countdown to an ISO date — used by the home and student pages.
   Returns { d, h, m, s, left, done } and updates every second. */
export function useCountdown(iso) {
  const [left, setLeft] = useState(() => (iso ? new Date(iso).getTime() - Date.now() : 0))

  useEffect(() => {
    if (!iso) return undefined
    const tick = () => setLeft(new Date(iso).getTime() - Date.now())
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [iso])

  const clamped = Math.max(0, left)
  const s = Math.floor(clamped / 1000)
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
    left: clamped,
    done: clamped === 0,
  }
}

/* Sets <title> (and description) for the route, like each design page's <head>. */
export function usePageMeta({ title, description }) {
  useEffect(() => {
    const prev = document.title
    if (title) document.title = title
    if (description) {
      let tag = document.querySelector('meta[name="description"]')
      const prevDesc = tag ? tag.content : null
      if (!tag) {
        tag = document.createElement('meta')
        tag.setAttribute('name', 'description')
        document.head.appendChild(tag)
      }
      tag.setAttribute('content', description)
      return () => {
        document.title = prev
        if (prevDesc === null) tag.remove()
        else tag.setAttribute('content', prevDesc)
      }
    }
    return () => {
      document.title = prev
    }
  }, [title, description])
}
