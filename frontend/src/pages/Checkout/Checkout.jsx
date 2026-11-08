import { useState } from 'react'
import { Link } from 'react-router-dom'
import './Checkout.css'
import LogoSprite from '../../components/LogoSprite.jsx'
import { money } from '../../lib/format.js'
import { usePageMeta } from '../../lib/hooks.js'
import { api } from '../../lib/api.js'
import { clearSession, loadSession, saveSession } from '../../lib/session.js'
import { isEmail } from '../Login/otp.js'

/* ------------------------------------------------------------------
   EXAMPLE SETTINGS FOR THE DESIGN ONLY.
   In the real app, prices, coupons, referral codes and credit balances
   must come from the server, and the server must recheck every code and
   recalculate the total before taking payment. Never trust totals
   calculated in the browser.
   ------------------------------------------------------------------ */
const CONFIG = {
  currency: '₹',
  prices: { neet: 999, 'jee-main': 999, 'jee-advanced': 1199 }, // example prices
  names: { neet: 'NEET Test Series', 'jee-main': 'JEE Main Test Series', 'jee-advanced': 'JEE Advanced Test Series' },
  coupons: {
    // admin-created codes
    LAUNCH20: { type: 'percent', value: 20, label: '20% off' },
    RANKER100: { type: 'flat', value: 100, label: '₹100 off' },
    DIWALI25: { type: 'percent', value: 25, expired: '3 Nov 2026' },
  },
  referral: { friendDiscount: 100, referrerCredit: 100, pattern: /^[A-Z]{3,8}[0-9]{2,4}$/ },
  creditBalance: 150, // this student's wallet
  myReferralCode: 'RIYA4821',
}

const EXAM_OPTIONS = [
  { key: 'neet', label: 'NEET', note: 'Physics, Chemistry, Biology' },
  { key: 'jee-main', label: 'JEE Main', note: 'Physics, Chemistry, Maths' },
  { key: 'jee-advanced', label: 'JEE Advanced', note: 'Paper 1 and Paper 2' },
]

/* The series, in order: drawn on the success ticket. */
const SERIES = [
  { label: 'Part tests', n: 6, prefix: 'P' },
  { label: 'Half syllabus', n: 3, prefix: 'H' },
  { label: 'Full syllabus', n: 2, prefix: 'F' },
]

const REQUIRED = ['f-name', 'f-dob', 'f-email', 'f-class', 'f-year', 'f-state', 'f-city', 'f-pname', 'f-pphone']
const EMAIL_RE = /^\S+@\S+\.\S+$/

function checkCode(raw, kind) {
  const c = (raw || '').trim().toUpperCase()
  if (!c) return { error: 'Enter a code first.' }
  if (kind === 'coupon') {
    const cp = CONFIG.coupons[c]
    if (!cp) return { error: "That coupon code isn't valid. Check the spelling, or try it as a referral code." }
    if (cp.expired) return { error: 'This coupon expired on ' + cp.expired + '.' }
    return { code: c, kind: 'coupon', rule: cp, label: 'Coupon ' + c }
  }
  if (c === CONFIG.myReferralCode) return { error: "You can't use your own referral code." }
  if (!CONFIG.referral.pattern.test(c)) return { error: "That referral code isn't valid. Ask your friend to check it in their account." }
  return { code: c, kind: 'referral', rule: { type: 'flat', value: CONFIG.referral.friendDiscount }, label: 'Referral ' + c }
}

function emailOk(v) {
  return EMAIL_RE.test((v || '').trim())
}
function pphoneOk(v) {
  return (v || '').replace(/\D/g, '').length >= 10
}

/* How many of the 10 required things are done (9 fields + terms). */
function aboutProgress(form) {
  let n = 0
  for (const id of REQUIRED) {
    const v = (form[id] || '').trim()
    if (!v) continue
    if (id === 'f-email' && !emailOk(v)) continue
    if (id === 'f-pphone' && !pphoneOk(v)) continue
    n++
  }
  if (form['f-terms']) n++
  return n
}

function isMinor(dob) {
  if (!dob) return false
  const d = new Date(dob)
  const now = new Date()
  const age = now.getFullYear() - d.getFullYear() - (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate()) ? 1 : 0)
  return age < 18
}

function Field({ id, label, hint, optional, error, wide, children }) {
  return (
    <div className={'field' + (wide ? ' wide' : '')}>
      <label htmlFor={id}>
        {label}
        {optional && <span className="opt"> (optional)</span>}
      </label>
      {children}
      {error ? (
        <p className="err" id={id + '-err'} role="alert">
          {error}
        </p>
      ) : (
        hint && (
          <p className="hint" id={id + '-hint'}>
            {hint}
          </p>
        )
      )}
    </div>
  )
}

/* design/checkout.html -> route "/checkout" */
export default function Checkout() {
  usePageMeta({ title: 'Checkout — Testverse by Studyverse' })

  const qs = new URLSearchParams(window.location.search)
  const preExam = qs.get('exam')
  const preCoupon = qs.get('coupon')
  const preRef = qs.get('ref')
  const preCode = preCoupon ? checkCode(preCoupon, 'coupon') : preRef ? checkCode(preRef, 'referral') : null

  /* state — prefill from link: ?exam=neet&ref=RIYA4821 or ?coupon=LAUNCH20 */
  const [user, setUser] = useState(() => loadSession())
  const signedIn = !!user
  const [exam, setExam] = useState(preExam && CONFIG.prices[preExam] ? preExam : null)
  const [tab, setTab] = useState(preRef && !preCoupon ? 'referral' : 'coupon')
  const [code, setCode] = useState(preCode && !preCode.error ? preCode : null)
  const [codeErr, setCodeErr] = useState(preCode && preCode.error ? preCode.error : null)
  const [codeOpen, setCodeOpen] = useState(!!preCode)
  const [codeInput, setCodeInput] = useState('')
  const [useCredits, setUseCredits] = useState(false)
  const [form, setForm] = useState(() => {
    const u = loadSession() || {}
    return { 'f-name': u.name || '', 'f-email': u.email || '' }
  })
  const [touched, setTouched] = useState({})
  const [paid, setPaid] = useState(null) // totals at the moment of payment

  /* account step: email + password (new students sign up on /signup and come back) */
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [authErr, setAuthErr] = useState(null)
  const [authBusy, setAuthBusy] = useState(false)
  const backHere = encodeURIComponent(window.location.pathname + window.location.search)

  const filled = aboutProgress(form)
  const complete = filled === REQUIRED.length + 1

  function totals() {
    const price = exam ? CONFIG.prices[exam] : 0
    let codeOff = 0
    if (code && price) {
      codeOff = code.rule.type === 'percent' ? (price * code.rule.value) / 100 : code.rule.value
      codeOff = Math.min(Math.round(codeOff), price)
    }
    const afterCode = price - codeOff
    const creditOff = useCredits && signedIn ? Math.min(CONFIG.creditBalance, afterCode) : 0
    return { price, codeOff, creditOff, total: afterCode - creditOff }
  }

  const t = totals()

  function applyCode(raw, kind) {
    const res = checkCode(raw, kind)
    if (res.error) {
      setCodeErr(res.error)
      return
    }
    setCode(res)
    setCodeErr(null)
    setCodeInput('')
  }

  async function signIn(e) {
    e.preventDefault()
    if (!isEmail(loginEmail)) return setAuthErr('Enter a valid email address, like name@example.com.')
    if (!loginPassword) return setAuthErr('Enter your password.')
    setAuthBusy(true)
    setAuthErr(null)
    try {
      const session = await api('/auth/login', { body: { email: loginEmail, password: loginPassword } })
      saveSession(session)
      setUser(session.user)
      setForm((f) => ({ ...f, 'f-name': f['f-name'] || session.user.name || '', 'f-email': f['f-email'] || session.user.email || '' }))
      setLoginPassword('')
    } catch (err) {
      setAuthErr(err.message)
    } finally {
      setAuthBusy(false)
    }
  }

  function onFormChange(e) {
    const el = e.target
    if (el.type === 'checkbox') setForm((f) => ({ ...f, [el.id]: el.checked }))
    else setForm((f) => ({ ...f, [el.id]: el.value }))
  }

  function onFormBlur(e) {
    const id = e.target.id
    if (id) setTouched((s) => (s[id] ? s : { ...s, [id]: true }))
  }

  /* Pay (demo): the real app opens the payment gateway here, then confirms on the server */
  function pay() {
    setPaid({ ...t, exam })
    window.scrollTo(0, 0)
  }

  const payDisabled = !signedIn || !complete || !exam
  const payLabel = !exam ? 'Choose your exam' : !signedIn ? 'Sign in to continue' : !complete ? 'Fill in your details' : t.total > 0 ? 'Pay ' + money(t.total) : 'Get it free'
  const aboutDone = signedIn && complete
  const userName = user && user.name ? user.name : null
  const firstName = userName ? userName.split(' ')[0] : null
  const refLink = window.location.origin + '/?ref=' + CONFIG.myReferralCode
  const waHref =
    'https://wa.me/?text=' +
    encodeURIComponent("I'm preparing with Testverse by Studyverse. Use my code " + CONFIG.myReferralCode + ' to get ' + money(CONFIG.referral.friendDiscount) + ' off the test series: ' + refLink)

  const steps = [
    { id: 'step-exam', label: 'Exam', done: !!exam },
    { id: 'step-account', label: 'Account', done: signedIn },
    { id: 'step-details', label: 'Your details', done: aboutDone },
    { id: 'summary', label: 'Payment', done: false },
  ]
  const current = steps.findIndex((s) => !s.done)
  const stepState = (i) => (steps[i].done ? ' is-done' : i === current ? ' is-current' : '')

  const emailErr = touched['f-email'] && form['f-email'] && !emailOk(form['f-email']) ? 'Enter a valid email address, like name@example.com.' : null
  const pphoneErr = touched['f-pphone'] && form['f-pphone'] && !pphoneOk(form['f-pphone']) ? 'Enter a 10-digit mobile number.' : null

  return (
    <div className="tv-checkout">
      <LogoSprite />

      <header className="top">
        <div className="in">
          <Link className="brand" to="/" aria-label="Testverse by Studyverse, home">
            <svg className="tv-logo" style={{ height: '36px' }} viewBox="0 0 1784 409" role="img" aria-label="Testverse by Studyverse">
              <use href="#tv-logo" />
            </svg>
          </Link>
          <span className="secure">Secure checkout</span>
        </div>
      </header>

      {!paid ? (
        <main className="page" id="checkout">
          <div className="page-head">
            <div>
              <p className="eyebrow">Checkout</p>
              <h1>Get your test series</h1>
              <p className="lede">Three short steps. Your 11 tests unlock the moment you pay.</p>
            </div>
            <ol className="progress" aria-label="Checkout progress">
              {steps.map((s, i) => (
                <li key={s.id} className={stepState(i).trim()} aria-current={i === current ? 'step' : undefined}>
                  <a href={'#' + s.id}>
                    <span className="p-num">{i + 1}</span>
                    <span className="p-label">{s.label}</span>
                  </a>
                </li>
              ))}
            </ol>
          </div>

          <div className="layout">
            <div className="steps">
              {/* Step 1: exam */}
              <section className={'step' + stepState(0)} id="step-exam" aria-labelledby="s1">
                <div className="rail" aria-hidden="true">
                  <span className="num">1</span>
                </div>
                <div className="step-body">
                  <header className="step-head">
                    <div>
                      <h2 id="s1">Choose your exam</h2>
                      <p className="step-sub">Each series has 11 tests on the real CBT screen.</p>
                    </div>
                    {exam && <span className="chip chip-done">Done</span>}
                  </header>
                  <div className="exams" role="radiogroup" aria-labelledby="s1">
                    {EXAM_OPTIONS.map((o) => (
                      <label key={o.key} className={'exam' + (exam === o.key ? ' on' : '')}>
                        <input type="radio" name="exam" value={o.key} checked={exam === o.key} onChange={() => setExam(o.key)} />
                        <span className="exam-top">
                          <b>{o.label}</b>
                          <span className="radio" aria-hidden="true" />
                        </span>
                        <span className="exam-note">{o.note}</span>
                        <span className="exam-price">{money(CONFIG.prices[o.key])}</span>
                      </label>
                    ))}
                  </div>
                  {exam && (
                    <div className="product" id="product">
                      <h3 id="product-name">{CONFIG.names[exam]}: what you get</h3>
                      <ul>
                        <li>
                          <b>6</b> part tests
                        </li>
                        <li>
                          <b>3</b> half-syllabus tests
                        </li>
                        <li>
                          <b>2</b> full-syllabus tests
                        </li>
                        <li>Real CBT screen, all-India rank and full analysis with solutions</li>
                      </ul>
                    </div>
                  )}
                </div>
              </section>

              {/* Step 2: account */}
              <section className={'step' + stepState(1)} id="step-account" aria-labelledby="s2">
                <div className="rail" aria-hidden="true">
                  <span className="num">2</span>
                </div>
                <div className="step-body">
                  <header className="step-head">
                    <div>
                      <h2 id="s2">Your account</h2>
                      <p className="step-sub">{signedIn ? 'Your tests will be added to this account.' : 'One account for Testverse and Studyverse courses.'}</p>
                    </div>
                    {signedIn && <span className="chip chip-done">Done</span>}
                  </header>

                  {signedIn ? (
                    <div className="signed" id="signed">
                      <span className="avatar" aria-hidden="true">
                        {(userName || 'S').charAt(0).toUpperCase()}
                      </span>
                      <span className="signed-who">
                        <span className="signed-label">Signed in as</span>
                        <b>{userName || user.email || 'Student'}</b>
                      </span>
                      <button type="button" className="linkbtn" onClick={() => {
                          clearSession()
                          setUser(null)
                          setForm({})
                          setTouched({})
                        }}>
                        Use a different account
                      </button>
                    </div>
                  ) : (
                    <form className="signin" id="signin" onSubmit={signIn} noValidate>
                      <div className="field">
                        <label htmlFor="login-email">Email</label>
                        <input
                          id="login-email"
                          className="input"
                          type="email"
                          autoComplete="email"
                          placeholder="name@example.com"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          aria-invalid={authErr ? 'true' : undefined}
                          aria-describedby={authErr ? 'auth-err' : 'auth-hint'}
                          disabled={authBusy}
                        />
                      </div>
                      <div className="field">
                        <label htmlFor="login-password">Password</label>
                        <div className="row">
                          <input
                            id="login-password"
                            className="input"
                            type="password"
                            autoComplete="current-password"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            aria-invalid={authErr ? 'true' : undefined}
                            aria-describedby={authErr ? 'auth-err' : 'auth-hint'}
                            disabled={authBusy}
                          />
                          <button className="btn btn-primary btn-lg" type="submit" disabled={authBusy}>
                            {authBusy ? 'Logging in…' : 'Log in'}
                          </button>
                        </div>
                        {authErr ? (
                          <p className="err" id="auth-err" role="alert">
                            {authErr}
                          </p>
                        ) : (
                          <p className="hint" id="auth-hint">
                            In a Studyverse course? Use the same email.
                          </p>
                        )}
                      </div>
                      <p className="otp-actions">
                        <Link className="linkbtn" to={'/signup?next=' + backHere + (exam ? '&exam=' + exam : '')}>
                          New here? Create an account
                        </Link>
                        <Link className="linkbtn" to={'/login?next=' + backHere}>
                          Forgot password?
                        </Link>
                      </p>
                    </form>
                  )}
                </div>
              </section>

              {/* Step 3: about you */}
              <section className={'step' + stepState(2)} id="step-details" aria-labelledby="s3">
                <div className="rail" aria-hidden="true">
                  <span className="num">3</span>
                </div>
                <div className="step-body">
                  <header className="step-head">
                    <div>
                      <h2 id="s3">About you</h2>
                      <p className="step-sub">For your rank card, results and parent reports.</p>
                    </div>
                    {signedIn &&
                      (aboutDone ? (
                        <span className="chip chip-done">Done</span>
                      ) : (
                        <span className="chip">
                          <span className="tnum">{filled}</span> of 10
                        </span>
                      ))}
                  </header>
                  <p className="locked" id="about-locked" hidden={signedIn}>
                    Sign in above and this step opens.
                  </p>
                  <form id="about" className="about" key={user ? 'signed-in' : 'signed-out'} hidden={!signedIn} noValidate onChange={onFormChange} onBlur={onFormBlur}>
                    <fieldset className="group">
                      <legend>Student</legend>
                      <div className="grid">
                        <Field id="f-name" label="Full name" hint="As printed on your exam admit card." wide>
                          <input className="input" id="f-name" key={'name-' + (user ? user.id : '')} autoComplete="name" required defaultValue={form['f-name'] || ''} aria-describedby="f-name-hint" />
                        </Field>
                        <Field id="f-dob" label="Date of birth">
                          <input className="input" id="f-dob" type="date" required defaultValue="" />
                        </Field>
                        <Field id="f-email" label="Email" error={emailErr}>
                          <input
                            className="input"
                            id="f-email"
                            key={'email-' + (user ? user.id : '')}
                            type="email"
                            autoComplete="email"
                            required
                            defaultValue={form['f-email'] || ''}
                            aria-invalid={emailErr ? 'true' : undefined}
                            aria-describedby={emailErr ? 'f-email-err' : undefined}
                          />
                        </Field>
                        <Field id="f-class" label="Class">
                          <select className="input" id="f-class" required defaultValue="">
                            <option value="">Select</option>
                            <option>Class 11</option>
                            <option>Class 12</option>
                            <option>Dropper / repeater</option>
                          </select>
                        </Field>
                        <Field id="f-year" label="Exam year">
                          <select className="input" id="f-year" required defaultValue="">
                            <option value="">Select</option>
                            <option>2027</option>
                            <option>2028</option>
                          </select>
                        </Field>
                      </div>
                    </fieldset>

                    <fieldset className="group">
                      <legend>Where you study</legend>
                      <div className="grid">
                        <Field id="f-state" label="State">
                          <input className="input" id="f-state" autoComplete="address-level1" required defaultValue="" />
                        </Field>
                        <Field id="f-city" label="City">
                          <input className="input" id="f-city" autoComplete="address-level2" required defaultValue="" />
                        </Field>
                        <Field id="f-coaching" label="School or coaching you attend now" optional wide>
                          <input className="input" id="f-coaching" defaultValue="" />
                        </Field>
                      </div>
                    </fieldset>

                    <fieldset className="group">
                      <legend>Parent or guardian</legend>
                      <div className="grid">
                        <Field id="f-pname" label="Name">
                          <input className="input" id="f-pname" required defaultValue="" />
                        </Field>
                        <Field id="f-pphone" label="Mobile number" hint="We send them a short report after each test." error={pphoneErr}>
                          <input
                            className="input"
                            id="f-pphone"
                            type="tel"
                            inputMode="tel"
                            required
                            defaultValue=""
                            aria-invalid={pphoneErr ? 'true' : undefined}
                            aria-describedby={pphoneErr ? 'f-pphone-err' : 'f-pphone-hint'}
                          />
                        </Field>
                      </div>
                      <div className="minor" id="minor" hidden={!isMinor(form['f-dob'])}>
                        <b>Parent's consent needed.</b> As you're under 18, we'll send an OTP to your parent's mobile to confirm they agree to you using Testverse. You can still finish checkout now.
                      </div>
                    </fieldset>

                    <div className="agrees">
                      <label className="agree">
                        <input type="checkbox" id="f-terms" required defaultChecked={!!form['f-terms']} />
                        <span>
                          I agree to the <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>.
                        </span>
                      </label>
                      <label className="agree">
                        <input type="checkbox" id="f-results" defaultChecked={!!form['f-results']} />
                        <span>
                          Contact me after my exam result to share how I did.
                          <span className="fine"> Optional. We'll always ask separately before using your name or photo anywhere.</span>
                        </span>
                      </label>
                    </div>
                  </form>
                </div>
              </section>
            </div>

            {/* Summary */}
            <aside className="summary" id="summary" aria-labelledby="sum">
              <div className="sum-card">
                <div className="sum-body">
                  <p className="eyebrow" id="sum">
                    Order summary
                  </p>

                  <div className="sum-product">
                    <div>
                      <h2 id="line-product">{exam ? CONFIG.names[exam] : 'Test series'}</h2>
                      <p>{exam ? '11 tests, rank and full analysis' : 'Choose your exam to see the price.'}</p>
                    </div>
                    {exam && (
                      <b id="line-price" className="tnum">
                        {money(t.price)}
                      </b>
                    )}
                  </div>

                  <dl className="lines">
                    <div className="line" id="line-code" hidden={!code || !t.codeOff}>
                      <dt id="line-code-label">{code ? code.label : ''}</dt>
                      <dd id="line-code-amt">{code ? '−' + money(t.codeOff) : ''}</dd>
                    </div>
                    <div className="line" id="line-credits" hidden={!t.creditOff}>
                      <dt>Credits used</dt>
                      <dd id="line-credits-amt">−{money(t.creditOff)}</dd>
                    </div>
                  </dl>

                  <div className="code-box">
                    {code ? (
                      <div className="applied" id="applied">
                        <span id="applied-text">
                          <b>{code.code}</b> {code.kind === 'coupon' ? code.rule.label : money(code.rule.value) + ' off'} applied
                        </span>
                        <button
                          type="button"
                          className="linkbtn"
                          id="remove"
                          onClick={() => {
                            setCode(null)
                            setCodeErr(null)
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    ) : !codeOpen ? (
                      <button type="button" className="linkbtn code-toggle" onClick={() => setCodeOpen(true)}>
                        Have a coupon or referral code?
                      </button>
                    ) : (
                      <div id="code-entry">
                        <div className="tabs" role="tablist" aria-label="Discount code type">
                          {[
                            ['coupon', 'Coupon'],
                            ['referral', 'Referral'],
                          ].map(([k, l]) => (
                            <button
                              key={k}
                              type="button"
                              role="tab"
                              aria-selected={tab === k ? 'true' : 'false'}
                              data-tab={k}
                              onClick={() => {
                                setTab(k)
                                setCodeErr(null)
                              }}
                            >
                              {l}
                            </button>
                          ))}
                        </div>
                        <label className="l" htmlFor="code" id="code-label">
                          {tab === 'coupon' ? 'Coupon code' : "Friend's referral code"}
                        </label>
                        <div className="row">
                          <input
                            className="input code-input"
                            id="code"
                            autoComplete="off"
                            autoCapitalize="characters"
                            placeholder={tab === 'coupon' ? 'LAUNCH20' : 'RIYA4821'}
                            value={codeInput}
                            onChange={(e) => setCodeInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), applyCode(codeInput, tab))}
                            aria-invalid={codeErr ? 'true' : undefined}
                            aria-describedby={codeErr ? 'code-err' : 'code-fine'}
                          />
                          <button className="btn btn-outline" type="button" id="apply" onClick={() => applyCode(codeInput, tab)}>
                            Apply
                          </button>
                        </div>
                        <p className="fine" id="code-fine">
                          One code per order: a coupon or a friend's referral code.
                        </p>
                      </div>
                    )}
                    <p className="err" id="code-err" role="alert" hidden={!codeErr}>
                      {codeErr}
                    </p>
                  </div>

                  <label className="credits" id="credits-box" hidden={!signedIn || !(CONFIG.creditBalance > 0)}>
                    <input type="checkbox" id="use-credits" checked={useCredits} onChange={(e) => setUseCredits(e.target.checked)} />
                    <span>
                      Use my credits
                      <span className="fine">
                        {' '}
                        <b id="credit-bal">{money(CONFIG.creditBalance)}</b> available. Works on top of a code.
                      </span>
                    </span>
                  </label>
                </div>

                <div className="paybox">
                  <div className="total">
                    <span>Total</span>
                    <b id="total" className={'tnum' + (exam ? '' : ' dim')}>
                      {money(exam ? t.total : 0)}
                    </b>
                  </div>
                  {exam && t.price > t.total && <p className="saved">You save {money(t.price - t.total)}</p>}
                  <button className="btn btn-gold btn-block" type="button" id="pay" disabled={payDisabled} onClick={pay}>
                    {payLabel}
                  </button>
                  <p className="pay-note" id="pay-note">
                    {!payDisabled ? 'UPI, card or net banking. You’ll get a receipt by SMS and email.' : 'Finish the steps above to continue. Pay by UPI, card or net banking.'}
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </main>
      ) : (
        /* Success */
        <main className="page done" id="done">
          <div className="done-hero">
            <p className="eyebrow">Payment confirmed</p>
            <h1>
              You're in{firstName ? ', ' + firstName : ''}.
            </h1>
            <p id="done-text">Your {CONFIG.names[paid.exam]} is ready. All 11 tests are now in your account.</p>
            <p className="done-meta">
              {paid.total > 0 ? (
                <>
                  Paid <b className="tnum">{money(paid.total)}</b>
                </>
              ) : (
                <b>Free with your code and credits</b>
              )}
              <span className="sep" aria-hidden="true" />
              Receipt sent by SMS and email
            </p>
          </div>

          <div className="done-grid">
            <section className="ticket" aria-labelledby="ticket-title">
              <div className="ticket-head">
                <span className="ticket-kicker">Unlocked</span>
                <h2 id="ticket-title">{CONFIG.names[paid.exam]}</h2>
              </div>
              <ol className="series">
                {SERIES.map((g, gi) => (
                  <li key={g.label}>
                    <span className="series-label">
                      {g.label} <span className="tnum">{g.n}</span>
                    </span>
                    <span className="series-row">
                      {Array.from({ length: g.n }, (_, i) => {
                        const idx = SERIES.slice(0, gi).reduce((a, s) => a + s.n, 0) + i
                        return (
                          <span key={i} className="seg" style={{ animationDelay: 120 + idx * 70 + 'ms' }}>
                            {g.prefix + (i + 1)}
                          </span>
                        )
                      })}
                    </span>
                  </li>
                ))}
              </ol>
              <div className="ticket-foot">
                <Link className="btn btn-gold btn-lg" to="/student">
                  Start Part Test 1
                </Link>
                <Link className="ticket-link" to="/student">
                  Go to my dashboard
                </Link>
              </div>
            </section>

            <section className="invite" aria-labelledby="invite-title">
              <h3 id="invite-title">Invite friends, earn credits</h3>
              <p className="invite-sub">Preparing is easier together. Share your code with friends who are taking the same exam.</p>
              <dl className="perks">
                <div>
                  <dt id="r-disc">{money(CONFIG.referral.friendDiscount)}</dt>
                  <dd>off for each friend who uses your code</dd>
                </div>
                <div>
                  <dt id="r-credit">{money(CONFIG.referral.referrerCredit)}</dt>
                  <dd>in credits for you every time one buys</dd>
                </div>
              </dl>
              <div className="refcode">
                <code id="my-code">{CONFIG.myReferralCode}</code>
                <button
                  className="btn btn-outline"
                  type="button"
                  id="copy"
                  onClick={(e) => {
                    const btn = e.currentTarget
                    ;(navigator.clipboard ? navigator.clipboard.writeText(refLink) : Promise.reject()).then(
                      () => {
                        btn.textContent = 'Link copied'
                      },
                      () => {
                        btn.textContent = refLink
                      },
                    )
                  }}
                >
                  Copy link
                </button>
              </div>
              <a className="btn btn-dark btn-block" id="wa" href={waHref} target="_blank" rel="noopener">
                Share on WhatsApp
              </a>
            </section>
          </div>
        </main>
      )}
    </div>
  )
}
