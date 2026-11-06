import { useCallback, useRef, useState } from 'react'

/*
  Toast — the design scripts create a fixed bottom toast element and append it
  to <body>. Here it is rendered inside the page root (position: fixed works the
  same) so it stays inside the page's scoped CSS.
*/
export function useToast() {
  const [msg, setMsg] = useState(null)
  const timer = useRef(null)

  const toast = useCallback((text, ms = 2600) => {
    setMsg(text)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setMsg(null), ms)
  }, [])

  const node = msg ? (
    <div className="toast" role="status">
      {msg}
    </div>
  ) : null

  return { toast, node }
}
