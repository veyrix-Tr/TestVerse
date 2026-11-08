import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Signup.css'
import LogoSprite from '../../components/LogoSprite.jsx'
import { EXAMS } from '../../data/exams.js'
import { usePageMeta } from '../../lib/hooks.js'
import { saveSession } from '../../lib/session.js'
import { BrandAside, OtpInput, PhoneField, Resend } from '../Login/AuthParts.jsx'
import { isPhone, prettyPhone, useResendTimer } from '../Login/phone.js'

/* route "/signup" — name, exam and mobile number verified by OTP, or Google. No passwords.
   DEMO ONLY: no SMS is sent and any 6 digits create a local session.
   REAL APP: send and verify the OTP on the server, create the user there and
   let it set the session (see lib/session.js). */

const EXAM_NOTES = { neet: 'Medical', 'jee-main': 'Engineering', 'jee-advanced': 'For the IITs' }

/* Shape of the series, drawn in the brand preview. */
const PLAN = [
  { label: 'Part tests', items: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'] },
  { label: 'Half syllabus', items: ['H1', 'H2', 'H3'] },
  { label: 'Full syllabus', items: ['F1', 'F2'] },
]

function validate(f) {
  if (f.name.trim().length < 2) return { field: 'name', msg: 'Enter your full name.' }
  if (!isPhone(f.phone)) return { field: 'phone', msg: 'Enter a valid 10-digit mobile number.' }
  if (!f.exam) return { field: 'exam', msg: 'Choose the exam you are preparing for.' }
  return null
}

export default function Signup() {
  usePageMeta({ title: 'Sign up — Testverse by Studyverse' })
  const navigate = useNavigate()

  const preExam = new URLSearchParams(window.location.search).get('exam')
  const [form, setForm] = useState({ name: '', phone: '', exam: EXAMS[preExam] ? preExam : '' })
  const [step, setStep] = useState('details') // 'details' | 'otp'
  const [otp, setOtp] = useState('')
  const [error, setError] = useState(null) // { field, msg }
  const [busy, setBusy] = useState(false)
  const [left, restartTimer] = useResendTimer()

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))
  const invalid = (k) => !!(error && error.field === k)
  const errFor = (k) =>
    invalid(k) ? (
      <p className="err" id="su-err" role="alert">
        {error.msg}
      </p>
    ) : null

  function finish(user) {
    setBusy(true)
    setTimeout(() => {
      saveSession(user)
      navigate('/student', { viewTransition: true })
    }, 350)
  }

  function sendOtp(e) {
    e.preventDefault()
    const err = validate(form)
    setError(err)
    if (err) return
    setOtp('')
    setStep('otp')
    restartTimer()
  }

  function verify(code) {
    if (!/^\d{6}$/.test(code)) return setError({ field: 'otp', msg: 'Enter the 6-digit code we sent to your phone.' })
    setError(null)
    finish({ name: form.name.trim(), phone: form.phone, exam: form.exam, provider: 'otp' })
  }

  return (
    <div className="tv-signup">
      <LogoSprite />
      <div className="auth">
        <BrandAside
          eyebrow="Join Testverse"
          title={
            <>
              11 tests. <span className="hl">One clear path to exam day.</span>
            </>
          }
          lead="Six part tests, three half-syllabus tests and two full-syllabus tests, plus free all-India live tests every month for NEET, JEE Main and JEE Advanced."
        >
          <div className="pv-card pv-plan">
            <div className="pv-head">
              <span className="pv-kicker">Your test plan</span>
              <span className="pv-tag">2 of 11 done</span>
            </div>
            <ol className="plan">
              {PLAN.map((g, gi) => (
                <li key={g.label}>
                  <span className="plan-label">{g.label}</span>
                  <span className="plan-row">
                    {g.items.map((it, i) => {
                      const state = gi === 0 && i < 2 ? ' done' : gi === 0 && i === 2 ? ' next' : ''
                      return (
                        <span key={it} className={'plan-dot' + state}>
                          {it}
                        </span>
                      )
                    })}
                  </span>
                </li>
              ))}
            </ol>
            <div className="plan-foot">
              <span>
                Up next: <b>Part Test 3</b>
              </span>
              <span className="pv-meta">Rank and analysis after each test</span>
            </div>
          </div>
        </BrandAside>

        <main className="form-side">
          <div className="form-top">
            <span>Already have an account?</span>
            <Link viewTransition className="btn btn-outline btn-sm" to="/login">
              Log in
            </Link>
          </div>

          <div className="form-wrap">
            {step === 'details' ? (
              <>
                <header className="form-head">
                  <h1>Create your account</h1>
                  <p className="sub">Free to join. It takes less than a minute.</p>
                </header>

                <button className="btn btn-outline btn-lg btn-block" type="button" disabled={busy} onClick={() => finish({ name: 'Riya', provider: 'google', exam: form.exam || undefined })}>
                  Sign up with Google
                </button>

                <div className="or">
                  <span>or sign up with your mobile number</span>
                </div>

                <form className="stack" onSubmit={sendOtp} noValidate>
                  <div className="field">
                    <label htmlFor="su-name">Full name</label>
                    <input
                      id="su-name"
                      className="input"
                      autoComplete="name"
                      placeholder="As on your exam admit card"
                      value={form.name}
                      onChange={(e) => set('name')(e.target.value)}
                      aria-invalid={invalid('name') ? 'true' : undefined}
                      aria-describedby={invalid('name') ? 'su-err' : undefined}
                    />
                    {errFor('name')}
                  </div>

                  <div className="field">
                    <label htmlFor="su-phone">Mobile number</label>
                    <PhoneField id="su-phone" value={form.phone} onChange={set('phone')} invalid={invalid('phone')} describedBy={invalid('phone') ? 'su-err' : 'su-phone-hint'} />
                    {errFor('phone') || (
                      <p className="hint" id="su-phone-hint">
                        We'll text a 6-digit code to verify it. No password needed.
                      </p>
                    )}
                  </div>

                  <fieldset className="exam-pick" aria-describedby={invalid('exam') ? 'su-err' : undefined}>
                    <legend className="legend">Preparing for</legend>
                    <div className="exam-opts">
                      {Object.entries(EXAMS).map(([key, ex]) => (
                        <label key={key} className={'exam-opt' + (form.exam === key ? ' on' : '')}>
                          <input type="radio" name="exam" value={key} checked={form.exam === key} onChange={() => set('exam')(key)} aria-invalid={invalid('exam') ? 'true' : undefined} />
                          <b>{ex.label}</b>
                          <span>{EXAM_NOTES[key]}</span>
                        </label>
                      ))}
                    </div>
                    {errFor('exam')}
                  </fieldset>

                  <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy}>
                    Send OTP
                  </button>
                  <p className="fine">
                    By continuing, you agree to the <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>.
                  </p>
                </form>
              </>
            ) : (
              <>
                <header className="form-head">
                  <p className="step-kicker">Step 2 of 2</p>
                  <h1>Verify your number</h1>
                  <p className="sub" role="status">
                    We sent a 6-digit code to <b className="tnum">+91 {prettyPhone(form.phone)}</b>.{' '}
                    <button
                      type="button"
                      className="linkbtn"
                      onClick={() => {
                        setStep('details')
                        setError(null)
                      }}
                    >
                      Change number
                    </button>
                  </p>
                </header>

                <form
                  className="stack"
                  onSubmit={(e) => {
                    e.preventDefault()
                    verify(otp)
                  }}
                  noValidate
                >
                  <div className="field">
                    <label htmlFor="su-otp">One-time code</label>
                    <OtpInput id="su-otp" value={otp} onChange={setOtp} onComplete={verify} invalid={invalid('otp')} describedBy={invalid('otp') ? 'su-err' : 'su-otp-hint'} disabled={busy} />
                    {errFor('otp') || (
                      <p className="hint" id="su-otp-hint">
                        Demo: any 6 digits will work.
                      </p>
                    )}
                  </div>
                  <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy}>
                    {busy ? 'Creating your account…' : 'Verify and create account'}
                  </button>
                  <p className="resend">
                    Didn't get it? <Resend left={left} onResend={restartTimer} />
                  </p>
                </form>
              </>
            )}

            <p className="switch">
              Already have an account? <Link viewTransition to="/login">Log in</Link>
            </p>
          </div>

          <p className="form-foot">
            <a href="/terms">Terms</a>
            <a href="/privacy">Privacy</a>
            <span>© Studyverse</span>
          </p>
        </main>
      </div>
    </div>
  )
}
