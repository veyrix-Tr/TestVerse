import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Login.css'
import LogoSprite from '../../components/LogoSprite.jsx'
import { api } from '../../lib/api.js'
import { usePageMeta } from '../../lib/hooks.js'
import { nextPath, saveSession } from '../../lib/session.js'
import { BrandAside, OtpInput, PasswordInput, Resend } from './AuthParts.jsx'
import { isEmail, useResendTimer } from './otp.js'

/* route "/login" — email + password, with "Forgot password?" resetting the
   password through a 6-digit code the backend emails via Brevo.
   Steps: 'login' -> 'forgot' (email) -> 'code' (OTP) -> 'reset' (new password). */
export default function Login() {
  usePageMeta({ title: 'Log in — Testverse by Studyverse' })
  const navigate = useNavigate()

  const [step, setStep] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState(null) // { field, msg }
  const [busy, setBusy] = useState(false)
  const [left, restartTimer] = useResendTimer()

  const invalid = (k) => !!(error && error.field === k)
  const errFor = (k) =>
    invalid(k) ? (
      <p className="err" id="login-err" role="alert">
        {error.msg}
      </p>
    ) : null
  const describe = (k, hint) => (invalid(k) ? 'login-err' : hint)

  /* Runs a request with the busy flag; errors land on `field`. */
  async function run(field, fn) {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError({ field, msg: e.message })
    } finally {
      setBusy(false)
    }
  }

  function finish(session) {
    saveSession(session)
    // Admins go to the admin console; students to their dashboard (or ?next=)
    navigate(nextPath(session.user.role === 'admin' ? '/admin' : '/student'), { replace: true, viewTransition: true })
  }

  function logIn(e) {
    e.preventDefault()
    if (!isEmail(email)) return setError({ field: 'email', msg: 'Enter a valid email address, like name@example.com.' })
    if (!password) return setError({ field: 'password', msg: 'Enter your password.' })
    run('password', async () => finish(await api('/auth/login', { body: { email, password } })))
  }

  function goTo(next) {
    setStep(next)
    setError(null)
  }

  function sendCode(e) {
    e?.preventDefault()
    if (!isEmail(email)) return setError({ field: 'email', msg: 'Enter a valid email address, like name@example.com.' })
    run(step === 'code' ? 'otp' : 'email', async () => {
      await api('/auth/forgot-password', { body: { email } })
      setOtp('')
      setStep('code')
      restartTimer()
    })
  }

  function verify(code) {
    if (!/^\d{6}$/.test(code)) return setError({ field: 'otp', msg: 'Enter the 6-digit code we emailed you.' })
    run('otp', async () => {
      await api('/auth/verify-otp', { body: { email, otp: code } })
      setNewPassword('')
      setStep('reset')
    })
  }

  function reset(e) {
    e.preventDefault()
    if (newPassword.length < 8) return setError({ field: 'newpass', msg: 'Use at least 8 characters.' })
    run('newpass', async () => finish(await api('/auth/reset-password', { body: { email, otp, password: newPassword } })))
  }

  const emailField = (autoFocus) => (
    <div className="field">
      <label htmlFor="login-email">Email</label>
      <input
        id="login-email"
        className="input"
        type="email"
        autoComplete="email"
        placeholder="name@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-invalid={invalid('email') ? 'true' : undefined}
        aria-describedby={describe('email')}
        autoFocus={autoFocus}
        disabled={busy}
      />
      {errFor('email')}
    </div>
  )

  return (
    <div className="tv-login">
      <LogoSprite />
      <div className="auth">
        <BrandAside
          eyebrow="Student login"
          title={
            <>
              Welcome back. <span className="hl">Your next test is waiting.</span>
            </>
          }
          lead="Your answers, ranks and chapter-wise analysis are saved to your account, so you can pick up exactly where you left off."
        >
          <div className="pv-card pv-result">
            <div className="pv-head">
              <span className="pv-kicker">Sample result</span>
              <span className="pv-tag">NEET Full Syllabus Live Test</span>
            </div>
            <div className="pv-main">
              <div>
                <span className="pv-label">All-India rank</span>
                <b className="pv-big">1,284</b>
              </div>
              <div>
                <span className="pv-label">Score</span>
                <b className="pv-mid">
                  612<span>/720</span>
                </b>
              </div>
              <div>
                <span className="pv-label">Percentile</span>
                <b className="pv-mid">97.4</b>
              </div>
            </div>
            <ul className="pv-bars">
              {[
                ['Physics', 142],
                ['Chemistry', 158],
                ['Botany', 160],
                ['Zoology', 152],
              ].map(([s, v]) => (
                <li key={s}>
                  <span>{s}</span>
                  <span className="pv-track">
                    <span style={{ width: (v / 180) * 100 + '%' }} />
                  </span>
                  <span className="tnum">{v}/180</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="pv-card pv-next">
            <span className="pv-label">Next live test</span>
            <b>NEET Half Syllabus</b>
            <span className="pv-meta">Sun 15 Nov, 2:00 PM</span>
          </div>
        </BrandAside>

        <main className="form-side">
          <div className="form-top">
            <span>New to Testverse?</span>
            <Link viewTransition className="btn btn-outline btn-sm" to={'/signup' + window.location.search}>
              Create an account
            </Link>
          </div>

          <div className="form-wrap">
            {step === 'login' && (
              <>
                <header className="form-head">
                  <h1>Log in to Testverse</h1>
                  <p className="sub">Use the email and password you signed up with.</p>
                </header>

                <form className="stack" onSubmit={logIn} noValidate>
                  {emailField(true)}
                  <div className="field">
                    <div className="label-row">
                      <label htmlFor="login-password">Password</label>
                      <button type="button" className="linkbtn" onClick={() => goTo('forgot')}>
                        Forgot password?
                      </button>
                    </div>
                    <PasswordInput
                      id="login-password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      aria-invalid={invalid('password') ? 'true' : undefined}
                      aria-describedby={describe('password')}
                      disabled={busy}
                    />
                    {errFor('password')}
                  </div>
                  <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy}>
                    {busy ? 'Logging in…' : 'Log in'}
                  </button>
                </form>
              </>
            )}

            {step === 'forgot' && (
              <>
                <header className="form-head">
                  <p className="step-kicker">Reset password</p>
                  <h1>Forgot your password?</h1>
                  <p className="sub">Enter your account email and we'll send you a 6-digit code to reset it.</p>
                </header>

                <form className="stack" onSubmit={sendCode} noValidate>
                  {emailField(true)}
                  <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy}>
                    {busy ? 'Sending code…' : 'Send code'}
                  </button>
                  <p className="resend">
                    <button type="button" className="linkbtn" onClick={() => goTo('login')}>
                      Back to log in
                    </button>
                  </p>
                </form>
              </>
            )}

            {step === 'code' && (
              <>
                <header className="form-head">
                  <p className="step-kicker">Step 2 of 3</p>
                  <h1>Check your email</h1>
                  <p className="sub" role="status">
                    We sent a 6-digit code to <b>{email.trim()}</b>.{' '}
                    <button type="button" className="linkbtn" onClick={() => goTo('forgot')}>
                      Change email
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
                    <label htmlFor="login-otp">Reset code</label>
                    <OtpInput id="login-otp" value={otp} onChange={setOtp} onComplete={verify} invalid={invalid('otp')} describedBy={describe('otp', 'login-otp-hint')} disabled={busy} />
                    {errFor('otp') || (
                      <p className="hint" id="login-otp-hint">
                        The code expires in 10 minutes. Check your spam folder if you can't find it.
                      </p>
                    )}
                  </div>
                  <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy}>
                    {busy ? 'Checking…' : 'Verify code'}
                  </button>
                  <p className="resend">
                    Didn't get it? <Resend left={left} onResend={() => sendCode()} disabled={busy} />
                  </p>
                </form>
              </>
            )}

            {step === 'reset' && (
              <>
                <header className="form-head">
                  <p className="step-kicker">Step 3 of 3</p>
                  <h1>Set a new password</h1>
                  <p className="sub">You'll be logged in as soon as it's saved.</p>
                </header>

                <form className="stack" onSubmit={reset} noValidate>
                  <input type="email" autoComplete="username" value={email} readOnly hidden />
                  <div className="field">
                    <label htmlFor="login-newpass">New password</label>
                    <PasswordInput
                      id="login-newpass"
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      aria-invalid={invalid('newpass') ? 'true' : undefined}
                      aria-describedby={describe('newpass', 'login-newpass-hint')}
                      autoFocus
                      disabled={busy}
                    />
                    {errFor('newpass') || (
                      <p className="hint" id="login-newpass-hint">
                        At least 8 characters.
                      </p>
                    )}
                  </div>
                  <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy}>
                    {busy ? 'Saving…' : 'Save and log in'}
                  </button>
                </form>
              </>
            )}

            <p className="switch">
              New to Testverse? <Link viewTransition to={'/signup' + window.location.search}>Create an account</Link>
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
