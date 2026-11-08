import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Signup.css'
import LogoSprite from '../../components/LogoSprite.jsx'
import { EXAMS } from '../../data/exams.js'
import { usePageMeta } from '../../lib/hooks.js'
import { saveSession } from '../../lib/session.js'

/* route "/signup" — demo only: a valid form creates a local session.
   REAL APP: POST /api/auth/signup and let the server set the session (see lib/session.js). */
function validate(f) {
  if (f.name.trim().length < 2) return { field: 'name', msg: 'Enter your full name.' }
  if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) return { field: 'email', msg: 'Enter a valid email address.' }
  if (f.phone.replace(/\D/g, '').length < 10) return { field: 'phone', msg: 'Enter a 10-digit mobile number.' }
  if (!f.exam) return { field: 'exam', msg: 'Choose the exam you are preparing for.' }
  if (f.password.length < 6) return { field: 'password', msg: 'Use at least 6 characters for your password.' }
  if (!f.terms) return { field: 'terms', msg: 'Please accept the Terms and Privacy Policy.' }
  return null
}

export default function Signup() {
  usePageMeta({ title: 'Sign up — Testverse by Studyverse' })
  const navigate = useNavigate()

  const preExam = new URLSearchParams(window.location.search).get('exam')
  const [form, setForm] = useState({ name: '', email: '', phone: '', exam: EXAMS[preExam] ? preExam : '', password: '', terms: false })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const invalid = (k) => (error && error.field === k ? 'true' : undefined)

  function finish(user) {
    setBusy(true)
    saveSession(user)
    navigate('/student')
  }

  function onSubmit(e) {
    e.preventDefault()
    const err = validate(form)
    setError(err)
    if (err) return
    finish({ name: form.name.trim(), email: form.email.trim(), phone: form.phone.replace(/\D/g, ''), exam: form.exam })
  }

  return (
    <div className="tv-signup">
      <LogoSprite />
      <div className="split">
        <aside className="brand-panel">
          <Link className="brand" to="/" aria-label="Testverse by Studyverse, home">
            <svg className="tv-logo" style={{ height: '40px' }} viewBox="0 0 1784 409" role="img" aria-label="Testverse by Studyverse">
              <use href="#tv-logo" />
            </svg>
          </Link>
          <div className="pitch">
            <p className="eyebrow">Join Testverse</p>
            <h2>
              11 tests. <em>One clear path to exam day.</em>
            </h2>
            <p className="lead">6 part tests, 3 half-syllabus tests and 2 full-syllabus tests, plus all-India live tests for NEET, JEE Main and JEE Advanced.</p>
            <ul className="points">
              <li>
                <span>
                  <b>Free live tests</b> every month with an all-India rank.
                </span>
              </li>
              <li>
                <span>
                  <b>Video solutions</b> and chapter-wise analysis.
                </span>
              </li>
              <li>
                <span>
                  <b>Parent reports</b> so your family sees your progress.
                </span>
              </li>
            </ul>
          </div>
          <p className="foot">Already in a Studyverse course? Log in with the same account.</p>
        </aside>

        <main className="form-side">
          <div className="card">
            <div>
              <h1>Create your account</h1>
              <p className="sub">It takes less than a minute.</p>
            </div>

            <button className="btn btn-outline" type="button" disabled={busy} onClick={() => finish({ name: 'Riya', provider: 'google', exam: form.exam || undefined })}>
              Sign up with Google
            </button>

            <div className="or">or</div>

            <form onSubmit={onSubmit} noValidate>
              <div className="field">
                <label htmlFor="su-name">Full name</label>
                <input id="su-name" className="input" autoComplete="name" value={form.name} onChange={set('name')} aria-invalid={invalid('name')} />
              </div>
              <div className="grid2">
                <div className="field">
                  <label htmlFor="su-email">Email</label>
                  <input id="su-email" className="input" type="email" autoComplete="email" value={form.email} onChange={set('email')} aria-invalid={invalid('email')} />
                </div>
                <div className="field">
                  <label htmlFor="su-phone">Mobile number</label>
                  <input id="su-phone" className="input" type="tel" inputMode="numeric" autoComplete="tel" value={form.phone} onChange={set('phone')} aria-invalid={invalid('phone')} />
                </div>
              </div>
              <fieldset className="exam-pick">
                <legend>Preparing for</legend>
                {Object.entries(EXAMS).map(([key, ex]) => (
                  <label key={key}>
                    <input type="radio" name="exam" value={key} checked={form.exam === key} onChange={set('exam')} />
                    <span>{ex.label}</span>
                  </label>
                ))}
              </fieldset>
              <div className="field">
                <label htmlFor="su-pass">Password</label>
                <input id="su-pass" className="input" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} aria-invalid={invalid('password')} />
              </div>
              <label className="check">
                <input type="checkbox" checked={form.terms} onChange={set('terms')} aria-invalid={invalid('terms')} />
                <span>
                  I agree to the <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>.
                </span>
              </label>
              {error && (
                <p className="err" role="alert">
                  {error.msg}
                </p>
              )}
              <button className="btn btn-primary" type="submit" disabled={busy}>
                {busy ? 'Creating account…' : 'Create account'}
              </button>
            </form>

            <p className="switch">
              Already have an account? <Link to="/login">Log in</Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}
