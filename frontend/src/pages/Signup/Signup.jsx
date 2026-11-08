import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Signup.css'
import LogoSprite from '../../components/LogoSprite.jsx'
import { EXAMS } from '../../data/exams.js'
import { api } from '../../lib/api.js'
import { usePageMeta } from '../../lib/hooks.js'
import { saveSession } from '../../lib/session.js'
import { BrandAside, OtpInput, PasswordInput, PhoneField, Resend } from '../Login/AuthParts.jsx'
import { isEmail, isPhone, useResendTimer } from '../Login/otp.js'

/* route "/signup" — two steps:
     1. name + email  POST /api/auth/signup/send-otp   (rejected if already registered),
                      then the code box opens below:
                      POST /api/auth/signup/verify-otp -> signupToken
     2. details       POST /api/auth/signup            { signupToken, name, ...details } -> session
   The code is emailed by the backend via Brevo. The account is created only in
   step 2, with the email proven by the signupToken, so every account is verified. */

const EXAM_NOTES = { neet: 'Medical', 'jee-main': 'Engineering', 'jee-advanced': 'For the IITs' }
const GRADES = ['Class 11', 'Class 12', 'Dropper / repeater']
const THIS_YEAR = new Date().getFullYear()
const YEARS = [THIS_YEAR, THIS_YEAR + 1, THIS_YEAR + 2]

/* Shape of the series, drawn in the brand preview. */
const PLAN = [
  { label: 'Part tests', items: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'] },
  { label: 'Half syllabus', items: ['H1', 'H2', 'H3'] },
  { label: 'Full syllabus', items: ['F1', 'F2'] },
]

function validateDetails(f) {
  if (!isPhone(f.phone)) return { field: 'phone', msg: 'Enter a valid 10-digit mobile number.' }
  if (!f.exam) return { field: 'exam', msg: 'Choose the exam you are preparing for.' }
  if (!f.grade) return { field: 'grade', msg: 'Choose your class.' }
  if (!f.targetYear) return { field: 'targetYear', msg: 'Choose the year you are taking the exam.' }
  if (f.state.trim().length < 2) return { field: 'state', msg: 'Enter your state.' }
  if (f.city.trim().length < 2) return { field: 'city', msg: 'Enter your city.' }
  if (f.password.length < 8) return { field: 'password', msg: 'Use at least 8 characters.' }
  return null
}

export default function Signup() {
  usePageMeta({ title: 'Sign up — Testverse by Studyverse' })
  const navigate = useNavigate()

  const preExam = new URLSearchParams(window.location.search).get('exam')
  const [step, setStep] = useState('account') // 'account' | 'details'
  const [codeSent, setCodeSent] = useState(false) // opens the code box under the email
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [signupToken, setSignupToken] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '', exam: EXAMS[preExam] ? preExam : '', grade: '', targetYear: '', state: '', city: '', password: '' })
  const [error, setError] = useState(null) // { field, msg }
  const [busy, setBusy] = useState(false)
  const [left, restartTimer] = useResendTimer()

  const set = (k) => (v) => {
    setForm((f) => ({ ...f, [k]: v }))
    setError((e) => (e && e.field === k ? null : e)) // clear a field's error once it's edited
  }
  const invalid = (k) => !!(error && error.field === k)
  const errFor = (k) =>
    invalid(k) ? (
      <p className="err" id="su-err" role="alert">
        {error.msg}
      </p>
    ) : null
  /* Props shared by the plain inputs/selects of the details step. */
  const bind = (k) => ({
    id: 'su-' + k,
    className: 'input',
    value: form[k],
    onChange: (e) => set(k)(e.target.value),
    'aria-invalid': invalid(k) ? 'true' : undefined,
    'aria-describedby': invalid(k) ? 'su-err' : undefined,
    disabled: busy,
  })

  /* Runs a request with the busy flag; errors land on `field` (or the field the server names). */
  async function run(field, fn) {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError({ field: e.field || field, msg: e.message })
    } finally {
      setBusy(false)
    }
  }

  function changeEmail() {
    setCodeSent(false)
    setOtp('')
    setError(null)
  }

  function sendOtp(e) {
    e?.preventDefault()
    if (form.name.trim().length < 2) return setError({ field: 'name', msg: 'Enter your full name.' })
    if (!isEmail(email)) return setError({ field: 'email', msg: 'Enter a valid email address, like name@example.com.' })
    run(codeSent ? 'otp' : 'email', async () => {
      await api('/auth/signup/send-otp', { body: { email } })
      setOtp('')
      setCodeSent(true)
      restartTimer()
    })
  }

  function verify(code) {
    if (!/^\d{6}$/.test(code)) return setError({ field: 'otp', msg: 'Enter the 6-digit code we emailed you.' })
    run('otp', async () => {
      const res = await api('/auth/signup/verify-otp', { body: { email, otp: code } })
      setSignupToken(res.signupToken)
      setStep('details')
    })
  }

  function createAccount(e) {
    e.preventDefault()
    const err = validateDetails(form)
    setError(err)
    if (err) return
    run('password', async () => {
      try {
        const session = await api('/auth/signup', { body: { signupToken, ...form, name: form.name.trim(), targetYear: Number(form.targetYear) } })
        saveSession(session)
        // New accounts pick and buy their batch next
        navigate('/subscribe', { replace: true, viewTransition: true })
      } catch (err) {
        // Verification expired or the email got registered meanwhile: back to step 1
        if (err.field === 'email') {
          setSignupToken(null)
          setCodeSent(false)
          setStep('account')
        }
        throw err
      }
    })
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
            <Link viewTransition className="btn btn-outline btn-sm" to={'/login' + window.location.search}>
              Log in
            </Link>
          </div>

          <div className="form-wrap">
            {step === 'account' && (
              <>
                <header className="form-head">
                  <p className="step-kicker">Step 1 of 2</p>
                  <h1>Create your account</h1>
                  <p className="sub">Free to join. It takes less than a minute.</p>
                </header>

                <form
                  className="stack"
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (codeSent) verify(otp)
                    else sendOtp()
                  }}
                  noValidate
                >
                  <div className="field">
                    <label htmlFor="su-name">Full name</label>
                    <input {...bind('name')} autoComplete="name" placeholder="As on your exam admit card" autoFocus />
                    {errFor('name')}
                  </div>

                  <div className="field">
                    <div className="label-row">
                      <label htmlFor="su-email">Email</label>
                      {codeSent && (
                        <button type="button" className="linkbtn" onClick={changeEmail}>
                          Change email
                        </button>
                      )}
                    </div>
                    <input
                      id="su-email"
                      className="input"
                      type="email"
                      autoComplete="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        setError((er) => (er && er.field === 'email' ? null : er))
                      }}
                      aria-invalid={invalid('email') ? 'true' : undefined}
                      aria-describedby={invalid('email') ? 'su-err' : 'su-email-hint'}
                      readOnly={codeSent}
                      disabled={busy}
                    />
                    {errFor('email') || (
                      <p className="hint" id="su-email-hint">
                        {codeSent ? 'Code sent. Check your inbox (and spam folder).' : "We'll email you a 6-digit code to verify it."}
                      </p>
                    )}
                  </div>

                  {codeSent ? (
                    <div className="code-box" role="region" aria-label="Verify your email">
                      <div className="field">
                        <label htmlFor="su-otp">Enter the 6-digit code</label>
                        <OtpInput id="su-otp" value={otp} onChange={setOtp} onComplete={verify} invalid={invalid('otp')} describedBy={invalid('otp') ? 'su-err' : 'su-otp-hint'} disabled={busy} />
                        {errFor('otp') || (
                          <p className="hint" id="su-otp-hint">
                            The code expires in 10 minutes.
                          </p>
                        )}
                      </div>
                      <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy}>
                        {busy ? 'Checking…' : 'Verify email'}
                      </button>
                      <p className="resend">
                        Didn't get it? <Resend left={left} onResend={() => sendOtp()} disabled={busy} />
                      </p>
                    </div>
                  ) : (
                    <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy}>
                      {busy ? 'Sending code…' : 'Send code'}
                    </button>
                  )}

                  <p className="fine">
                    By continuing, you agree to the <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>.
                  </p>
                </form>
              </>
            )}

            {step === 'details' && (
              <>
                <header className="form-head">
                  <p className="step-kicker">Step 2 of 2</p>
                  <h1>Hi {form.name.trim().split(' ')[0]}, tell us about you</h1>
                  <p className="sub">We use this to set up your tests and compare you with students like you.</p>
                </header>

                <form className="stack" onSubmit={createAccount} noValidate>
                  <p className="verified">
                    <span>
                      Email verified: <b>{email.trim()}</b>
                    </span>
                  </p>
                  <input type="email" autoComplete="username" value={email} readOnly hidden />

                  <div className="field">
                    <label htmlFor="su-phone">Mobile number</label>
                    <PhoneField id="su-phone" value={form.phone} onChange={set('phone')} invalid={invalid('phone')} describedBy={invalid('phone') ? 'su-err' : undefined} disabled={busy} autoFocus />
                    {errFor('phone')}
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

                  <div className="pair">
                    <div className="field">
                      <label htmlFor="su-grade">Class</label>
                      <select {...bind('grade')}>
                        <option value="">Select</option>
                        {GRADES.map((g) => (
                          <option key={g}>{g}</option>
                        ))}
                      </select>
                      {errFor('grade')}
                    </div>
                    <div className="field">
                      <label htmlFor="su-targetYear">Exam year</label>
                      <select {...bind('targetYear')}>
                        <option value="">Select</option>
                        {YEARS.map((y) => (
                          <option key={y}>{y}</option>
                        ))}
                      </select>
                      {errFor('targetYear')}
                    </div>
                  </div>

                  <div className="pair">
                    <div className="field">
                      <label htmlFor="su-state">State</label>
                      <input {...bind('state')} autoComplete="address-level1" />
                      {errFor('state')}
                    </div>
                    <div className="field">
                      <label htmlFor="su-city">City</label>
                      <input {...bind('city')} autoComplete="address-level2" />
                      {errFor('city')}
                    </div>
                  </div>

                  <div className="field">
                    <label htmlFor="su-password">Create a password</label>
                    <PasswordInput {...bind('password')} autoComplete="new-password" aria-describedby={invalid('password') ? 'su-err' : 'su-password-hint'} />
                    {errFor('password') || (
                      <p className="hint" id="su-password-hint">
                        At least 8 characters. You'll use it with your email to log in.
                      </p>
                    )}
                  </div>

                  <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy}>
                    {busy ? 'Creating your account…' : 'Create account'}
                  </button>
                </form>
              </>
            )}

            <p className="switch">
              Already have an account? <Link viewTransition to={'/login' + window.location.search}>Log in</Link>
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
