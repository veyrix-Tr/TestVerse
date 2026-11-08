import { useState } from 'react'
import { Link } from 'react-router-dom'
import { cleanPhone, prettyPhone } from './phone.js'

/*
  Pieces shared by /login, /signup and the account step of /checkout:
  the +91 mobile field, the 6-digit OTP field, the resend countdown and the
  navy brand column. Styling lives in each page's own stylesheet (the class
  names are the same in Login.css, Signup.css and Checkout.css).

  DEMO ONLY: no SMS is sent and any 6 digits are accepted.
  REAL APP: POST /api/auth/otp/send { phone } and POST /api/auth/otp/verify
  { phone, code }, rate-limit both on the server, and let the server set the
  session (see lib/session.js).
*/

export function PhoneField({ id, value, onChange, invalid, describedBy, autoFocus, disabled }) {
  return (
    <div className={'phone' + (invalid ? ' is-invalid' : '')}>
      <span className="phone-cc" aria-hidden="true">
        +91
      </span>
      <input
        id={id}
        className="phone-input"
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder="98765 43210"
        value={prettyPhone(value)}
        onChange={(e) => onChange(cleanPhone(e.target.value))}
        aria-invalid={invalid ? 'true' : undefined}
        aria-describedby={describedBy}
        autoFocus={autoFocus}
        disabled={disabled}
      />
    </div>
  )
}

/* One real input (so paste, SMS autofill and screen readers work) drawn as six cells. */
export function OtpInput({ id, value, onChange, onComplete, invalid, describedBy, disabled }) {
  const [focused, setFocused] = useState(false)
  const active = Math.min(value.length, 5)
  return (
    <div className={'otp' + (invalid ? ' is-invalid' : '') + (focused ? ' is-focused' : '')}>
      <input
        id={id}
        className="otp-input"
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="one-time-code"
        maxLength={6}
        value={value}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, '').slice(0, 6)
          onChange(v)
          if (v.length === 6 && onComplete) onComplete(v)
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        aria-invalid={invalid ? 'true' : undefined}
        aria-describedby={describedBy}
        autoFocus
        disabled={disabled}
      />
      <div className="otp-cells" aria-hidden="true">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={'otp-cell' + (value[i] ? ' filled' : '') + (focused && i === active ? ' active' : '')}>
            {value[i] || ''}
          </span>
        ))}
      </div>
    </div>
  )
}

/* "Resend code in 0:24" / "Resend code" */
export function Resend({ left, onResend }) {
  if (left > 0)
    return (
      <span className="resend-wait">
        Resend code in <span className="tnum">0:{String(left).padStart(2, '0')}</span>
      </span>
    )
  return (
    <button type="button" className="linkbtn" onClick={onResend}>
      Resend code
    </button>
  )
}

export function BrandLogo({ height = 40 }) {
  return (
    <Link className="brand-logo" to="/" aria-label="Testverse by Studyverse, home">
      <svg className="tv-logo" style={{ height: height + 'px' }} viewBox="0 0 1784 409" role="img" aria-label="Testverse by Studyverse">
        <use href="#tv-logo" />
      </svg>
    </Link>
  )
}

const STATS = [
  ['11', 'tests per series, from part syllabus to the full exam'],
  ['3', 'exams: NEET, JEE Main and JEE Advanced'],
  ['1', 'account for Testverse and Studyverse courses'],
]

/* Navy brand column of the auth screens. */
export function BrandAside({ eyebrow, title, lead, children }) {
  return (
    <aside className="brand">
      <div className="brand-top">
        <BrandLogo />
      </div>
      <div className="brand-body">
        <p className="brand-eyebrow">{eyebrow}</p>
        <h2 className="brand-title">{title}</h2>
        <p className="brand-lead">{lead}</p>
        <div className="preview">{children}</div>
      </div>
      <dl className="stats">
        {STATS.map(([n, label]) => (
          <div key={n + label}>
            <dt>{n}</dt>
            <dd>{label}</dd>
          </div>
        ))}
      </dl>
    </aside>
  )
}
