import { useEffect, useRef, useState } from 'react'
import { Link, useNavigation } from 'react-router-dom'

/*
  A <Link> that locks itself from the click until the navigation it started
  has loaded (the route's loader checks the session with the server first).
  While locked it gets `is-pending` + aria-disabled and ignores further
  clicks. Style `.is-pending` in the page's stylesheet.
*/
export default function PendingLink({ className, onClick, children, ...props }) {
  const navigation = useNavigation()
  const [pending, setPending] = useState(false)
  const sawLoading = useRef(false)

  useEffect(() => {
    if (!pending) return undefined
    if (navigation.state !== 'idle') {
      sawLoading.current = true
      return undefined
    }
    // Back to idle after loading (e.g. the loader redirected or failed): unlock.
    // If the router never left idle, unlock after a moment anyway.
    const id = setTimeout(() => setPending(false), sawLoading.current ? 0 : 1500)
    return () => clearTimeout(id)
  }, [pending, navigation.state])

  return (
    <Link
      {...props}
      className={[className, pending ? 'is-pending' : ''].filter(Boolean).join(' ') || undefined}
      aria-disabled={pending ? 'true' : undefined}
      onClick={(e) => {
        if (pending) {
          e.preventDefault()
          return
        }
        sawLoading.current = false
        setPending(true)
        onClick?.(e)
      }}
    >
      {children}
    </Link>
  )
}
