import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Login.css'
import LogoSprite from '../../components/LogoSprite.jsx'
import { usePageMeta } from '../../lib/hooks.js'
import { saveSession } from '../../lib/session.js'

/* route "/login" — demo only: any email/mobile + password signs in.
   REAL APP: POST /api/auth/login and let the server set the session (see lib/session.js). */
export default function Login() {
  usePageMeta({ title: 'Log in — Testverse by Studyverse' })
  const navigate = useNavigate()

  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  function finish(user) {
    setBusy(true)
    saveSession(user)
    navigate('/student')
  }

  function onSubmit(e) {
    e.preventDefault()
    const v = id.trim()
    const isEmail = /^\S+@\S+\.\S+$/.test(v)
    const isPhone = v.replace(/\D/g, '').length >= 10
    if (!isEmail && !isPhone) return setError('Enter the email or 10-digit mobile number on your account.')
    if (password.length < 6) return setError('Your password has at least 6 characters.')
    setError(null)
    finish(isEmail ? { email: v, name: v.split('@')[0] } : { phone: v.replace(/\D/g, '') })
  }

  return (
    <div className="tv-login">
      <LogoSprite />
      <div className="split">
        <aside className="brand-panel">
          <Link className="brand" to="/" aria-label="Testverse by Studyverse, home">
            <svg className="tv-logo" style={{ height: '40px' }} viewBox="0 0 1784 409" role="img" aria-label="Testverse by Studyverse">
              <use href="#tv-logo" />
            </svg>
          </Link>
          <div className="pitch">
            <p className="eyebrow">Student login</p>
            <h2>
              Welcome back. <em>Your next test is waiting.</em>
            </h2>
            <p className="lead">Pick up where you left off — your answers, ranks and analysis are saved to your account.</p>
            <ul className="points">
              <li>
                <span>
                  <b>Real CBT screen</b> — the same layout you'll see on exam day.
                </span>
              </li>
              <li>
                <span>
                  <b>All-India rank</b> after every live test.
                </span>
              </li>
              <li>
                <span>
                  <b>Chapter-wise analysis</b> so you know what to revise next.
                </span>
              </li>
            </ul>
          </div>
          <p className="foot">One account for Testverse and Studyverse courses.</p>
        </aside>

        <main className="form-side">
          <div className="card">
            <div>
              <h1>Log in</h1>
              <p className="sub">Use your Studyverse account.</p>
            </div>

            <button className="btn btn-outline" type="button" disabled={busy} onClick={() => finish({ name: 'Riya', provider: 'google' })}>
              Continue with Google
            </button>

            <div className="or">or</div>

            <form onSubmit={onSubmit} noValidate>
              <div className="field">
                <label htmlFor="login-id">Email or mobile number</label>
                <input
                  id="login-id"
                  className="input"
                  autoComplete="username"
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  aria-invalid={error && error.startsWith('Enter') ? 'true' : undefined}
                />
              </div>
              <div className="field">
                <label htmlFor="login-pass">Password</label>
                <input
                  id="login-pass"
                  className="input"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={error && error.startsWith('Your password') ? 'true' : undefined}
                />
              </div>
              {error && (
                <p className="err" role="alert">
                  {error}
                </p>
              )}
              <button className="btn btn-primary" type="submit" disabled={busy}>
                {busy ? 'Logging in…' : 'Log in'}
              </button>
            </form>

            <p className="switch">
              New to Testverse? <Link to="/signup">Create an account</Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}
