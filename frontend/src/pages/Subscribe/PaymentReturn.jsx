import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import './Subscribe.css'
import LogoSprite from '../../components/LogoSprite.jsx'
import { api } from '../../lib/api.js'
import { usePageMeta } from '../../lib/hooks.js'
import { checkSession, clearSession, getToken } from '../../lib/session.js'

/*
  route "/payment/return?order_id=…" — where Cashfree sends the student after
  the checkout (paid, failed or cancelled). The server asks Cashfree for the
  order's real status and only then activates the batch / series; the webhook
  does the same in the background, so a slow gateway still ends up right.
  Shares the /subscribe page's look (Subscribe.css, scoped to .tv-subscribe).
*/

const TRIES = 5 // Cashfree can take a moment to mark an order PAID
const GAP_MS = 2500

export default function PaymentReturn() {
  usePageMeta({ title: 'Payment — Testverse' })
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const orderId = params.get('order_id')

  // checking | paid | unpaid | error
  const [state, setState] = useState(orderId ? 'checking' : 'error')
  const [info, setInfo] = useState(null) // the verify answer
  const [error, setError] = useState(orderId ? null : 'This link has no order in it.')
  const [round, setRound] = useState(0) // bump to check again

  useEffect(() => {
    if (!orderId) return
    const run = { live: true }
    const timer = { id: null }

    const check = async (n) => {
      try {
        const r = await api('/payments/verify', { body: { orderId }, token: getToken() })
        if (!run.live) return
        if (r.paid) {
          if (r.kind === 'batch') await checkSession() // the stored user picks up the active batch
          if (!run.live) return
          setInfo(r)
          setState('paid')
          return
        }
        // Not paid yet. ACTIVE = still open (maybe still processing); anything
        // else (EXPIRED / TERMINATED) won't change, so stop asking.
        if (r.orderStatus === 'ACTIVE' && n + 1 < TRIES) {
          timer.id = setTimeout(() => check(n + 1), GAP_MS)
          return
        }
        setInfo(r)
        setState('unpaid')
      } catch (e) {
        if (!run.live) return
        if (e.status === 401) {
          clearSession()
          navigate('/login?next=' + encodeURIComponent('/payment/return?order_id=' + orderId), { replace: true })
          return
        }
        // Only a network failure (0) or a server/gateway hiccup (5xx) is worth retrying
        if ((e.status === 0 || e.status >= 500) && n + 1 < TRIES) {
          timer.id = setTimeout(() => check(n + 1), GAP_MS)
          return
        }
        setError(e.message)
        setState('error')
      }
    }

    check(0)
    return () => {
      run.live = false
      clearTimeout(timer.id)
    }
  }, [orderId, round, navigate])

  function recheck() {
    setState('checking')
    setRound((r) => r + 1)
  }

  const isSeries = info && info.kind === 'series'
  const seriesLink = info && info.seriesId ? '/student/test-series?series=' + encodeURIComponent(info.seriesId) : '/student/test-series'
  const rupees = info && info.amount ? '₹' + info.amount.toLocaleString('en-IN') : null

  let title, text, actions
  if (state === 'checking') {
    title = 'Confirming your payment…'
    text = "We're checking with the payment gateway. This takes a few seconds — please don't close this page."
    actions = null
  } else if (state === 'paid') {
    title = 'Payment successful'
    text = isSeries
      ? `${rupees ? rupees + ' received. ' : ''}The series is yours — its tests are ready to take.`
      : `${rupees ? rupees + ' received. ' : ''}Your batch is active — its tests are on your dashboard.`
    actions = (
      <Link className="btn btn-gold btn-lg btn-block" to={isSeries ? seriesLink : '/student'} replace viewTransition>
        {isSeries ? 'Open your series' : 'Go to your dashboard'}
      </Link>
    )
  } else if (state === 'unpaid') {
    title = 'Payment not completed'
    text =
      info && info.orderStatus === 'ACTIVE'
        ? "We haven't received this payment. If you cancelled, nothing was charged. If money left your account, it will be confirmed automatically within a few minutes — or refunded by your bank."
        : 'This payment did not go through and nothing was charged. You can try again.'
    actions = (
      <>
        <Link className="btn btn-gold btn-lg btn-block" to={isSeries ? seriesLink : '/subscribe'} replace>
          Try again
        </Link>
        <button type="button" className="btn btn-ghost btn-block pr-again" onClick={recheck}>
          I&apos;ve paid — check again
        </button>
      </>
    )
  } else {
    title = "We couldn't confirm this payment"
    text = error || 'Something went wrong. If you paid, it will be confirmed automatically within a few minutes.'
    actions = (
      <>
        {orderId ? (
          <button type="button" className="btn btn-gold btn-lg btn-block" onClick={recheck}>
            Check again
          </button>
        ) : null}
        <Link className="btn btn-ghost btn-block pr-again" to="/student" replace>
          Back to dashboard
        </Link>
      </>
    )
  }

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
        </div>
      </header>

      <main className="wrap page pr-page">
        <section className="sum-card pr-card" aria-live="polite" aria-busy={state === 'checking'}>
          <span className={'pr-icon pr-' + state} aria-hidden="true">
            {state === 'paid' ? '✓' : state === 'checking' ? '' : '!'}
          </span>
          <p className="eyebrow">{state === 'paid' ? 'All done' : 'Payment'}</p>
          <h1 className="pr-title">{title}</h1>
          <p className="sum-text">{text}</p>
          {orderId ? <p className="pr-order tnum">Order {orderId}</p> : null}
          {actions ? <div className="pr-actions">{actions}</div> : null}
        </section>
        <p className="pr-help">
          Questions about a payment? <Link to="/contact">Contact us</Link> with your order number.
        </p>
      </main>
    </div>
  )
}
