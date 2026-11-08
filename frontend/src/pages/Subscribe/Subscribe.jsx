import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Subscribe.css'
import LogoSprite from '../../components/LogoSprite.jsx'
import { api } from '../../lib/api.js'
import { usePageMeta } from '../../lib/hooks.js'
import { clearSession, getToken, loadSession, saveSession } from '../../lib/session.js'

/*
  route "/subscribe" — after sign-up a student buys their batch. The batch
  isn't chosen here: it follows from the exam and class they gave at sign-up
  (JEE + Class 11 -> "11th JEE"), and the server works it out the same way.
  Payment isn't wired in yet: the server activates the batch at once when
  MOCK_PAYMENTS=true (see backend subscriptionController).
*/

const EXAM_NAME = { jee: 'JEE', neet: 'NEET' }
const SUBJECTS = { jee: 'Physics, Chemistry, Maths', neet: 'Physics, Chemistry, Biology' }

const INCLUDED = [
  ['Every test for your batch', 'Tests published by your teachers appear on your dashboard.'],
  ['The real CBT screen', 'Timer, question palette and auto-submit, like exam day.'],
  ['Your score straight away', 'Total, correct and wrong as soon as you submit.'],
  ['Full question review', 'Your answer next to the correct one, for every question.'],
  ['Video solutions', 'Ask for a video on any question you get stuck on.'],
]

const price = (b) => (b && b.price != null ? '₹' + b.price.toLocaleString('en-IN') : null)

export default function Subscribe() {
  usePageMeta({ title: 'Your batch — Testverse' })
  const navigate = useNavigate()
  const user = loadSession()

  const [batch, setBatch] = useState(undefined) // undefined: loading, null: none for this profile
  const [loadErr, setLoadErr] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let live = true
    api('/subscription', { token: getToken() })
      .then((r) => live && setBatch(r.batch))
      .catch((e) => live && setLoadErr(e.message))
    return () => {
      live = false
    }
  }, [])

  async function subscribe() {
    setBusy(true)
    setError(null)
    try {
      const { subscription } = await api('/subscription', { body: {}, token: getToken() })
      saveSession({ token: getToken(), user: { ...user, subscription } })
      navigate('/student', { replace: true, viewTransition: true })
    } catch (e) {
      // 409: already has an active batch, so the dashboard is the right place
      if (e.status === 409) return navigate('/student', { replace: true })
      if (e.status === 401) {
        clearSession()
        return navigate('/login?next=/subscribe', { replace: true })
      }
      setError(e.message)
      setBusy(false)
    }
  }

  function logOut() {
    clearSession()
    navigate('/login', { replace: true })
  }

  const first = user?.name ? user.name.split(' ')[0] : null

  return (
    <div className="tv-subscribe">
      <LogoSprite />
      <header className="top">
        <div className="wrap top-row">
          <Link className="brand" to="/" aria-label="Testverse by Studyverse, home">
            <svg className="tv-logo" viewBox="0 0 1784 409" role="img" aria-label="Testverse by Studyverse">
              <use href="#tv-logo" />
            </svg>
          </Link>
          <div className="who">
            {user && (
              <span>
                Signed in as <b>{user.name}</b>
              </span>
            )}
            <button type="button" className="btn btn-ghost btn-sm" onClick={logOut}>
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="wrap page">
        <div className="layout">
          <section className="intro" aria-labelledby="sub-title">
            <p className="eyebrow">One last step</p>
            <h1 id="sub-title">{first ? first + ', unlock your batch' : 'Unlock your batch'}</h1>
            <p className="lead">
              {batch
                ? `Based on the exam and class you chose, you're in ${batch.name}. It's a one-time payment, and your batch's tests show up on your dashboard as soon as they're published.`
                : "It's a one-time payment, and your batch's tests show up on your dashboard as soon as they're published."}
            </p>

            <ul className="included">
              {INCLUDED.map(([title, text], i) => (
                <li key={title}>
                  <span className="inc-num tnum">{String(i + 1).padStart(2, '0')}</span>
                  <span>
                    <b>{title}</b>
                    <span>{text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <aside className="summary" aria-labelledby="sum-title">
            <div className="sum-card" aria-busy={batch === undefined && !loadErr}>
              <p className="eyebrow">Your batch</p>
              {loadErr ? (
                <p className="err" role="alert">
                  {loadErr}
                </p>
              ) : batch === undefined ? (
                <p className="sum-loading">Loading your batch…</p>
              ) : batch === null ? (
                <>
                  <h2 id="sum-title">No batch yet</h2>
                  <p className="sum-text">There's no batch on sale for your exam and class yet. Please contact us and we'll sort it out.</p>
                </>
              ) : (
                <>
                  <h2 id="sum-title">{batch.name}</h2>
                  <p className="sum-meta">
                    {EXAM_NAME[batch.exam]} · {batch.grade}
                    <span>{SUBJECTS[batch.exam]}</span>
                  </p>
                  <div className="sum-price">
                    <span>One-time payment</span>
                    {price(batch) ? <b className="tnum">{price(batch)}</b> : <b className="tbd">Price to be announced</b>}
                  </div>
                  {error && (
                    <p className="err" role="alert">
                      {error}
                    </p>
                  )}
                  <button type="button" className="btn btn-gold btn-lg btn-block" disabled={busy} onClick={subscribe}>
                    {busy ? 'Activating…' : price(batch) ? 'Pay ' + price(batch) : 'Subscribe to ' + batch.name}
                  </button>
                  <p className="sum-note">Wrong exam or class? Contact us before you pay and we'll change it.</p>
                </>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}
