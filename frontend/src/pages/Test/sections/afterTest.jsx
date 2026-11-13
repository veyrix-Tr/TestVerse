import { fmt } from '../../../lib/format.js'

/* Shared by the result page and the "Test submitted" pop-up. */

/* When the question paper unlocks, e.g. "14 Nov, 6:30 pm". */
export const unlockText = (iso) => fmt(iso, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

/* Where the printable question paper opens (Paper/Paper.jsx). */
export const paperHref = (testId) => '/paper?test=' + encodeURIComponent(testId)

export const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3v12" />
    <path d="m7 10 5 5 5-5" />
    <path d="M5 21h14" />
  </svg>
)

export const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
)
