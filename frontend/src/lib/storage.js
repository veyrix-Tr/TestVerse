import { useEffect, useState } from 'react'

/* localStorage helpers — the demos save their state in the browser exactly like
   the design scripts do. */
export function loadJSON(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function removeKey(key) {
  try {
    localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

export function loadString(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function saveString(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* ignore */
  }
}

/* useState backed by localStorage. */
export function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => loadJSON(key, initial))
  useEffect(() => {
    saveJSON(key, value)
  }, [key, value])
  return [value, setValue]
}
