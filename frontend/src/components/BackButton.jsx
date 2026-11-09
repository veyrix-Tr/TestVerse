import { Link } from 'react-router-dom'

/*
  The one back control used across the app: an arrow and a short label
  ("Back to tests"), placed top-left, directly above the page title.
  Pass `to` for a route or `onClick` for an in-page step. `tone="dark"` is
  for navy areas. Styles live in index.css (.tv-back) so every page shares them.
*/
export default function BackButton({ to, onClick, tone, children = 'Back' }) {
  const className = 'tv-back' + (tone === 'dark' ? ' tv-back-dark' : '')
  const body = (
    <>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M19 12H5" />
        <path d="M12 19l-7-7 7-7" />
      </svg>
      <span>{children}</span>
    </>
  )
  return to ? (
    <Link className={className} to={to}>
      {body}
    </Link>
  ) : (
    <button type="button" className={className} onClick={onClick}>
      {body}
    </button>
  )
}
