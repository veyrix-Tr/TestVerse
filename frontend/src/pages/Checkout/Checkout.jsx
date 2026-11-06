import { useState } from 'react'
import './Checkout.css'
import LogoSprite from '../../components/LogoSprite.jsx'
import { usePageMeta } from '../../lib/hooks.js'
import { money } from '../../lib/format.js'

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

const REQUIRED = ['f-name', 'f-dob', 'f-email', 'f-class', 'f-year', 'f-state', 'f-city', 'f-pname', 'f-pphone']

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

function aboutComplete(form) {
  let ok = REQUIRED.every((id) => (form[id] || '').trim() !== '')
  ok = ok && /^\S+@\S+\.\S+$/.test((form['f-email'] || '').trim())
  ok = ok && (form['f-pphone'] || '').replace(/\D/g, '').length >= 10
  return ok && !!form['f-terms']
}

function isMinor(dob) {
  if (!dob) return false
  const d = new Date(dob)
  const now = new Date()
  const age = now.getFullYear() - d.getFullYear() - (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate()) ? 1 : 0)
  return age < 18
}

/* design/checkout.html -> route "/checkout" */
export default function Checkout() {
  usePageMeta({ title: 'Checkout — Testverse by Studyverse' })

  const qs = new URLSearchParams(window.location.search)
  const preExam = qs.get('exam')
  const preCoupon = qs.get('coupon')
  const preRef = qs.get('ref')

  /* state — prefill from link: ?exam=neet&ref=RIYA4821 or ?coupon=LAUNCH20 */
  const [signedIn, setSignedIn] = useState(false)
  const [exam, setExam] = useState(preExam && CONFIG.prices[preExam] ? preExam : null)
  const [tab, setTab] = useState(preRef && !preCoupon ? 'referral' : 'coupon')
  const [code, setCode] = useState(() => {
    const res = preCoupon ? checkCode(preCoupon, 'coupon') : preRef ? checkCode(preRef, 'referral') : null
    return res && !res.error ? res : null
  })
  const [codeErr, setCodeErr] = useState(() => {
    const res = preCoupon ? checkCode(preCoupon, 'coupon') : preRef ? checkCode(preRef, 'referral') : null
    return res && res.error ? res.error : null
  })
  const [codeInput, setCodeInput] = useState('')
  const [useCredits, setUseCredits] = useState(false)
  const [form, setForm] = useState({})
  const [paid, setPaid] = useState(false)

  const complete = aboutComplete(form)

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

  function signIn() {
    setSignedIn(true)
  }

  function onFormChange(e) {
    const el = e.target
    if (el.type === 'checkbox') setForm((f) => ({ ...f, [el.id]: el.checked }))
    else setForm((f) => ({ ...f, [el.id]: el.value }))
  }

  /* Pay (demo): the real app opens the payment gateway here, then confirms on the server */
  function pay() {
    setPaid(true)
    window.scrollTo(0, 0)
  }

  const payDisabled = !signedIn || !complete || !exam
  const payLabel = !signedIn ? 'Sign in to continue' : !complete ? 'Fill in your details' : !exam ? 'Choose your exam' : t.total > 0 ? 'Pay ' + money(t.total) : 'Get it free'
  const aboutDone = signedIn && complete
  const doneText = 'Your ' + CONFIG.names[exam] + ' is ready. All 11 tests are now in your account.'
  const refLink = window.location.origin + '/?ref=' + CONFIG.myReferralCode
  const waHref =
    'https://wa.me/?text=' +
    encodeURIComponent("I'm preparing with Testverse by Studyverse. Use my code " + CONFIG.myReferralCode + ' to get ' + money(CONFIG.referral.friendDiscount) + ' off the test series: ' + refLink)

  return (
    <div className="tv-checkout">
      <LogoSprite />

      <header className="top">
        <div className="in">
          <a className="brand" href="/">
            <svg className="tv-logo" style={{ height: '38px' }} viewBox="0 0 1784 409" role="img" aria-label="Testverse by Studyverse">
              <use href="#tv-logo" />
            </svg>
          </a>
          <span className="secure">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
            <span>Secure checkout</span>
          </span>
        </div>
      </header>

      <main className="page" id="checkout" hidden={paid}>
        <h1>Get your test series</h1>

        <div>
          {/* Step 1: account */}
          <section className="card" aria-labelledby="s1">
            <div className="step-head">
              <span className={'num' + (signedIn ? ' done' : '')} id="n1">
                {signedIn ? '✓' : '1'}
              </span>
              <h2 id="s1">Your account</h2>
            </div>
            <div id="signin" hidden={signedIn}>
              <div style={{ display: 'grid', gap: '14px' }}>
                <button className="btn btn-outline btn-block" type="button" data-signin onClick={signIn}>
                  Continue with Google
                </button>
                <div className="or">or</div>
                <div className="field">
                  <label className="l" htmlFor="phone">
                    Mobile number
                  </label>
                  <div className="row">
                    <input className="input" id="phone" inputMode="tel" autoComplete="tel" placeholder="10-digit mobile number" />
                    <button className="btn btn-primary" type="button" data-signin onClick={signIn}>
                      Send OTP
                    </button>
                  </div>
                </div>
                <p className="hint">Studying in a Studyverse course? Use the same Google account or mobile number. It's one account.</p>
              </div>
            </div>
            <div id="signed" className="signed" hidden={!signedIn}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12l5 5L20 7" />
              </svg>
              <span>
                Signed in as <b>[Student name]</b>
              </span>
            </div>
          </section>

          {/* Step 2: about you */}
          <section className="card" aria-labelledby="s2">
            <div className="step-head">
              <span className={'num' + (aboutDone ? ' done' : '')} id="n2">
                {aboutDone ? '✓' : '2'}
              </span>
              <h2 id="s2">About you</h2>
            </div>
            <p className="hint" id="about-locked" hidden={signedIn}>
              Sign in first.
            </p>
            <form id="about" className="grid2" hidden={!signedIn} noValidate onChange={onFormChange}>
              <div className="field full">
                <label className="l" htmlFor="f-name">
                  Full name, as on your exam admit card
                </label>
                <input className="input" id="f-name" autoComplete="name" required defaultValue="" />
              </div>
              <div className="field">
                <label className="l" htmlFor="f-dob">
                  Date of birth
                </label>
                <input className="input" id="f-dob" type="date" required defaultValue="" />
              </div>
              <div className="field">
                <label className="l" htmlFor="f-email">
                  Email
                </label>
                <input className="input" id="f-email" type="email" autoComplete="email" required defaultValue="" />
              </div>
              <div className="field">
                <label className="l" htmlFor="f-class">
                  Class
                </label>
                <select className="input" id="f-class" required defaultValue="">
                  <option value="">Select</option>
                  <option>Class 11</option>
                  <option>Class 12</option>
                  <option>Dropper / repeater</option>
                </select>
              </div>
              <div className="field">
                <label className="l" htmlFor="f-year">
                  Exam year
                </label>
                <select className="input" id="f-year" required defaultValue="">
                  <option value="">Select</option>
                  <option>2027</option>
                  <option>2028</option>
                </select>
              </div>
              <div className="field">
                <label className="l" htmlFor="f-state">
                  State
                </label>
                <input className="input" id="f-state" autoComplete="address-level1" required defaultValue="" />
              </div>
              <div className="field">
                <label className="l" htmlFor="f-city">
                  City
                </label>
                <input className="input" id="f-city" autoComplete="address-level2" required defaultValue="" />
              </div>
              <div className="field">
                <label className="l" htmlFor="f-pname">
                  Parent or guardian's name
                </label>
                <input className="input" id="f-pname" required defaultValue="" />
              </div>
              <div className="field">
                <label className="l" htmlFor="f-pphone">
                  Parent or guardian's mobile
                </label>
                <input className="input" id="f-pphone" inputMode="tel" required defaultValue="" />
              </div>
              <div className="field full">
                <label className="l" htmlFor="f-coaching">
                  School or coaching you attend now <span style={{ fontWeight: 400 }}>(optional)</span>
                </label>
                <input className="input" id="f-coaching" defaultValue="" />
              </div>
              <div className="minor full" id="minor" hidden={!isMinor(form['f-dob'])}>
                <b>Parent's consent needed.</b> As you're under 18, we'll send an OTP to your parent's mobile to confirm they agree to you using Testverse. You can still finish checkout now.
              </div>
              <label className="agree full">
                <input type="checkbox" id="f-terms" required defaultChecked={!!form['f-terms']} />
                <span>
                  I agree to the <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>.
                </span>
              </label>
              <label className="agree full">
                <input type="checkbox" id="f-results" defaultChecked={!!form['f-results']} />
                <span>
                  Contact me after my exam result to share how I did. <span className="fine">Optional. We'll always ask separately before using your name or photo anywhere.</span>
                </span>
              </label>
            </form>
          </section>

          {/* Step 3: exam */}
          <section className="card" aria-labelledby="s3">
            <div className="step-head">
              <span className="num">3</span>
              <h2 id="s3">Your exam</h2>
            </div>
            <div className="exams" role="radiogroup" aria-labelledby="s3">
              <label>
                <input type="radio" name="exam" value="neet" checked={exam === 'neet'} onChange={() => setExam('neet')} />
                <b>NEET</b>
                <span>Physics, Chemistry, Biology</span>
              </label>
              <label>
                <input type="radio" name="exam" value="jee-main" checked={exam === 'jee-main'} onChange={() => setExam('jee-main')} />
                <b>JEE Main</b>
                <span>Physics, Chemistry, Maths</span>
              </label>
              <label>
                <input type="radio" name="exam" value="jee-advanced" checked={exam === 'jee-advanced'} onChange={() => setExam('jee-advanced')} />
                <b>JEE Advanced</b>
                <span>Paper 1 and Paper 2</span>
              </label>
            </div>
            <div className="product" id="product" hidden={!exam}>
              <h3 id="product-name">{exam ? CONFIG.names[exam] + ': 11 tests' : ''}</h3>
              <ul>
                <li>6 part tests</li>
                <li>3 half-syllabus tests</li>
                <li>2 full-syllabus tests</li>
                <li>Real CBT screen, rank and full analysis with solutions</li>
              </ul>
            </div>
          </section>
        </div>

        {/* Summary */}
        <aside className="summary" aria-labelledby="sum">
          <section className="card">
            <h2 id="sum" style={{ fontSize: '19px' }}>
              Order summary
            </h2>

            <div className="lines">
              <div className="line">
                <span id="line-product">{exam ? CONFIG.names[exam] : 'Test series'}</span>
                <span id="line-price">{exam ? money(t.price) : '—'}</span>
              </div>
              <div className="line minus" id="line-code" hidden={!code || !t.codeOff}>
                <span id="line-code-label">{code ? code.label : ''}</span>
                <span id="line-code-amt">{code ? '−' + money(t.codeOff) : ''}</span>
              </div>
              <div className="line minus" id="line-credits" hidden={!t.creditOff}>
                <span>Credits used</span>
                <span id="line-credits-amt">−{money(t.creditOff)}</span>
              </div>
            </div>

            <div className="code-box">
              <div className="tabs" role="tablist" aria-label="Discount code type">
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'coupon' ? 'true' : 'false'}
                  data-tab="coupon"
                  onClick={() => {
                    setTab('coupon')
                    setCodeErr(null)
                  }}
                >
                  Coupon code
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'referral' ? 'true' : 'false'}
                  data-tab="referral"
                  onClick={() => {
                    setTab('referral')
                    setCodeErr(null)
                  }}
                >
                  Referral code
                </button>
              </div>
              <div id="code-entry" hidden={!!code}>
                <label className="l" htmlFor="code" id="code-label" style={{ display: 'block', marginBottom: '6px' }}>
                  {tab === 'coupon' ? 'Coupon code' : "Friend's referral code"}
                </label>
                <div className="row">
                  <input
                    className="input"
                    id="code"
                    autoComplete="off"
                    autoCapitalize="characters"
                    placeholder="Enter code"
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), applyCode(codeInput, tab))}
                  />
                  <button className="btn btn-outline" type="button" id="apply" onClick={() => applyCode(codeInput, tab)}>
                    Apply
                  </button>
                </div>
              </div>
              <div className="applied" id="applied" hidden={!code}>
                <span id="applied-text">
                  {code ? code.label + (code.kind === 'coupon' ? ' applied: ' + code.rule.label : ' applied: ' + money(code.rule.value) + ' off') : ''}
                </span>
                <button
                  type="button"
                  id="remove"
                  onClick={() => {
                    setCode(null)
                    setCodeErr(null)
                  }}
                >
                  Remove
                </button>
              </div>
              <div className="err" id="code-err" role="alert" hidden={!codeErr}>
                {codeErr}
              </div>
              <p className="fine">One code per order: a coupon or a friend's referral code.</p>
            </div>

            <label className="credits" id="credits-box" hidden={!(CONFIG.creditBalance > 0)}>
              <input type="checkbox" id="use-credits" checked={useCredits} onChange={(e) => setUseCredits(e.target.checked)} />
              <span>
                Use my credits. You have <b id="credit-bal">{money(CONFIG.creditBalance)}</b> available. Credits work on top of a code.
              </span>
            </label>

            <div className="total">
              <span>Total</span>
              <b id="total">{exam ? money(t.total) : '—'}</b>
            </div>

            <button className="btn btn-gold btn-block" type="button" id="pay" disabled={payDisabled} onClick={pay}>
              {payLabel}
            </button>
            <p className="fine" id="pay-note">
              {signedIn && exam && complete ? 'UPI, card or net banking. You’ll get a receipt by SMS and email.' : 'Sign in, fill in your details and choose your exam to continue. Payment by UPI, card or net banking.'}
            </p>
          </section>
        </aside>
      </main>

      {/* Success */}
      <main className="page" id="done" hidden={!paid}>
        <div className="success">
          <section className="card">
            <span className="tick">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12l5 5L20 7" />
              </svg>
            </span>
            <h1 style={{ fontSize: '28px' }}>You're in</h1>
            <p style={{ color: 'var(--muted)' }} id="done-text">
              {paid ? doneText : ''}
            </p>
            <a className="btn btn-primary" href="/student">
              Start Part Test 1
            </a>
            <div className="refbox">
              <h3>Invite friends, earn credits</h3>
              <p style={{ color: 'var(--gold-ink)', fontSize: '15px' }}>
                Your friends get <b id="r-disc">{money(CONFIG.referral.friendDiscount)}</b> off with your code. You get <b id="r-credit">{money(CONFIG.referral.referrerCredit)}</b> in credits every time one of them buys.
              </p>
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
              <a className="btn wa" id="wa" href={waHref} target="_blank" rel="noopener">
                Share on WhatsApp
              </a>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
