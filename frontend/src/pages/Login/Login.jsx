import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Login.css'
import LogoSprite from '../../components/LogoSprite.jsx'
import { usePageMeta } from '../../lib/hooks.js'
import { saveSession } from '../../lib/session.js'
import { BrandAside, OtpInput, PhoneField, Resend } from './AuthParts.jsx'
import { isPhone, prettyPhone, useResendTimer } from './phone.js'

/* route "/login" — mobile number + OTP, or Google. No passwords.
   DEMO ONLY: no SMS is sent and any 6 digits sign in.
   REAL APP: send and verify the OTP on the server and let it set the session (see lib/session.js). */
export default function Login() {
  usePageMeta({ title: 'Log in — Testverse by Studyverse' })
  const navigate = useNavigate()

  const [step, setStep] = useState('phone') // 'phone' | 'otp'
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState(null) // { field, msg }
  const [busy, setBusy] = useState(false)
  const [left, restartTimer] = useResendTimer()

  const invalid = (k) => !!(error && error.field === k)

  function finish(user) {
    setBusy(true)
    setTimeout(() => {
      saveSession(user)
      navigate('/student', { viewTransition: true })
    }, 350)
  }

  function sendOtp(e) {
    e.preventDefault()
    if (!isPhone(phone)) return setError({ field: 'phone', msg: 'Enter a valid 10-digit mobile number.' })
    setError(null)
    setOtp('')
    setStep('otp')
    restartTimer()
  }

  function verify(code) {
    if (!/^\d{6}$/.test(code)) return setError({ field: 'otp', msg: 'Enter the 6-digit code we sent to your phone.' })
    setError(null)
    finish({ phone, provider: 'otp' })
  }

  function changeNumber() {
    setStep('phone')
    setOtp('')
    setError(null)
  }

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
            <Link viewTransition className="btn btn-outline btn-sm" to="/signup">
              Create an account
            </Link>
          </div>

          <div className="form-wrap">
            {step === 'phone' ? (
              <>
                <header className="form-head">
                  <h1>Log in to Testverse</h1>
                  <p className="sub">Use the Google account or mobile number you use for Studyverse.</p>
                </header>

                <button className="btn btn-outline btn-lg btn-block" type="button" disabled={busy} onClick={() => finish({ name: 'Riya', provider: 'google' })}>
                  Continue with Google
                </button>

                <div className="or">
                  <span>or use your mobile number</span>
                </div>

                <form className="stack" onSubmit={sendOtp} noValidate>
                  <div className="field">
                    <label htmlFor="login-phone">Mobile number</label>
                    <PhoneField id="login-phone" value={phone} onChange={setPhone} invalid={invalid('phone')} describedBy={invalid('phone') ? 'login-err' : 'login-phone-hint'} />
                    {invalid('phone') ? (
                      <p className="err" id="login-err" role="alert">
                        {error.msg}
                      </p>
                    ) : (
                      <p className="hint" id="login-phone-hint">
                        We'll text you a 6-digit code. No password needed.
                      </p>
                    )}
                  </div>
                  <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy}>
                    Send OTP
                  </button>
                </form>
              </>
            ) : (
              <>
                <header className="form-head">
                  <p className="step-kicker">Step 2 of 2</p>
                  <h1>Enter the code</h1>
                  <p className="sub" role="status">
                    We sent a 6-digit code to <b className="tnum">+91 {prettyPhone(phone)}</b>.{' '}
                    <button type="button" className="linkbtn" onClick={changeNumber}>
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
                    <label htmlFor="login-otp">One-time code</label>
                    <OtpInput id="login-otp" value={otp} onChange={setOtp} onComplete={verify} invalid={invalid('otp')} describedBy={invalid('otp') ? 'login-err' : 'login-otp-hint'} disabled={busy} />
                    {invalid('otp') ? (
                      <p className="err" id="login-err" role="alert">
                        {error.msg}
                      </p>
                    ) : (
                      <p className="hint" id="login-otp-hint">
                        Demo: any 6 digits will work.
                      </p>
                    )}
                  </div>
                  <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy}>
                    {busy ? 'Logging in…' : 'Verify and log in'}
                  </button>
                  <p className="resend">
                    Didn't get it? <Resend left={left} onResend={restartTimer} />
                  </p>
                </form>
              </>
            )}

            <p className="switch">
              New to Testverse? <Link viewTransition to="/signup">Create an account</Link>
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
