import { useEffect, useRef } from 'react'
import { DownloadIcon, LockIcon, unlockText, paperHref } from './afterTest.jsx'

const MailIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </svg>
)

/*
  The "Test submitted" pop-up, shown over the result right after the student
  submits (and after the automatic submit when time runs out). Closing it
  reveals the result.
  - auto: time ran out, so the title says it was submitted automatically
  - paperAt: a live test still open for others; the download waits until then
  - reportNotice: the admin's switch for the "sent to your email" line
*/
export default function SubmittedDialog({ open, onClose, first, email, auto, testId, paperAt, reportNotice }) {
  const ref = useRef(null)
  const primaryRef = useRef(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      d.showModal()
      // showModal focuses the first button; the main action should have it
      if (primaryRef.current) primaryRef.current.focus()
    }
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className="submitted-dlg"
      aria-labelledby="sd-t"
      aria-describedby="sd-d"
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
    >
      <div className="sd-body">
        <span className={'sd-badge' + (auto ? ' is-auto' : '')} aria-hidden="true">
          {auto ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="13" r="8" />
              <path d="M12 9v4l2.5 2.5" />
              <path d="M9 2h6" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="m5 12.5 4.5 4.5L19 7.5" />
            </svg>
          )}
        </span>
        <span className="sd-eyebrow">{auto ? 'Time’s up' : 'Test submitted'}</span>
        <h2 id="sd-t">{auto ? 'Your test was submitted automatically' : first ? 'Well done, ' + first + '!' : 'Well done!'}</h2>
        <p id="sd-d" className="sd-lead">
          {auto && first ? first + ', your' : 'Your'} answers are saved and your score is ready.
        </p>

        {reportNotice || paperAt ? (
          <ul className="sd-notes">
            {reportNotice ? (
              <li>
                <span className="sd-ic">
                  <MailIcon />
                </span>
                <span>
                  Your <b>solutions and detailed analysis</b> will be sent to your email
                  {email ? (
                    <>
                      {' '}
                      <b className="sd-email">{email}</b>
                    </>
                  ) : null}
                  .
                </span>
              </li>
            ) : null}
            {paperAt ? (
              <li>
                <span className="sd-ic">
                  <LockIcon />
                </span>
                <span>
                  The question paper unlocks at <b>{unlockText(paperAt)}</b>, once the test closes for everyone.
                </span>
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>
      <div className="sd-actions">
        <button ref={primaryRef} className="btn btn-gold" type="button" onClick={onClose}>
          View my result
        </button>
        {paperAt ? null : (
          <a className="btn btn-outline" href={paperHref(testId)} target="_blank" rel="noopener">
            <DownloadIcon />
            Download question paper
            <span className="sr"> (opens in a new tab)</span>
          </a>
        )}
      </div>
    </dialog>
  )
}
