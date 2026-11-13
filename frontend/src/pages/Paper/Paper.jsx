import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import './Paper.css'
import { api } from '../../lib/api.js'
import { usePageMeta } from '../../lib/hooks.js'
import MathText from '../../lib/MathText.jsx'
import { esc } from '../../lib/esc.js'
import { fmt } from '../../lib/format.js'
import { getToken } from '../../lib/session.js'
import { AR_OPTIONS } from '../Test/data/papers.js'
import { examLabel } from '../Test/testData.js'

/*
  "/paper?test=<id>": a submitted test's question paper (questions only, no
  answers), laid out for printing. "Download PDF" opens the browser's print
  dialog, where the student picks "Save as PDF" — the browser draws the maths
  and text itself, so the file is small and crisp and the server does no work.

  Every printed page carries the Testverse header (logo + website) and the
  footer "Take free all-India live tests at testverse.in" (the PDFs get
  forwarded — free marketing), and, when the admin turned it on for the test,
  a faint watermark with the student's name and mobile. The header and footer
  are the table's thead/tfoot, which browsers repeat on every printed page; the
  watermark is position: fixed, which browsers also repeat.
*/

const SITE = 'testverse.in'
const TAGLINE = 'Take free all-India live tests at testverse.in'

function letter(i) {
  return String.fromCharCode(65 + i)
}

/* A text in the chosen language(s): "en", "hi" or "both" (English with Hindi under it). */
function Txt({ value, lang, as = 'span', className }) {
  if (value == null) return null
  const o = typeof value === 'string' ? { en: value } : value
  const show = lang === 'both' && o.hi && o.hi !== o.en ? [o.en, o.hi] : [lang === 'hi' && o.hi ? o.hi : o.en]
  return show.map((t, i) => <MathText key={i} as={as} className={(className || '') + (i ? ' pp-hi' : '')} html={esc(t)} />)
}

/* "+4 / −1" for a question's marks */
function marksText(m) {
  if (!m) return ''
  const w = m.wrong ? ' / ' + (m.wrong < 0 ? '−' + Math.abs(m.wrong) : m.wrong) : ' / 0'
  return '+' + m.correct + w
}

/* KaTeX loads with `defer`; wait (up to ~4 s) so formulas are drawn before printing. */
function useKatexReady() {
  const [ready, setReady] = useState(() => !!window.renderMathInElement)
  useEffect(() => {
    if (ready) return undefined
    let n = 0
    const id = setInterval(() => {
      n++
      if (window.renderMathInElement || n > 40) {
        clearInterval(id)
        setReady(true)
      }
    }, 100)
    return () => clearInterval(id)
  }, [ready])
  return ready
}

export default function Paper() {
  const [params] = useSearchParams()
  const testId = params.get('test') || ''
  const [state, setState] = useState({ status: 'loading' })
  const [lang, setLang] = useState('en')
  const katex = useKatexReady()
  const printed = useRef(false)
  usePageMeta({ title: (state.status === 'ready' ? state.test.title + ' · Question paper' : 'Question paper') + ' — Testverse' })

  useEffect(() => {
    let live = true
    if (!testId) {
      setState({ status: 'error', error: 'Open the question paper from your result.' })
      return undefined
    }
    api('/tests/' + encodeURIComponent(testId) + '/paper', { token: getToken() })
      .then((d) => live && setState({ status: 'ready', test: d.test, paper: d.paper, watermark: d.watermark }))
      .catch((e) => {
        if (!live) return
        if (e.status === 403 && e.data && e.data.unlocksAt) {
          const when = fmt(e.data.unlocksAt, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
          return setState({ status: 'locked', title: 'The question paper is locked', error: 'This live test is still open for other students. You can download its question paper from ' + when + ', once it closes for everyone.' })
        }
        const error = e.status === 404 ? 'This test doesn’t exist or isn’t available to you any more.' : e.status === 409 ? 'Submit the test first, then download its question paper from your result.' : e.message
        setState({ status: 'error', title: 'Couldn’t open the question paper', error })
      })
    return () => {
      live = false
    }
  }, [testId])

  const ready = state.status === 'ready' && katex
  // Opened from "Download question paper": go straight to the print dialog once, when everything is drawn
  useEffect(() => {
    if (!ready || printed.current) return undefined
    printed.current = true
    const id = setTimeout(() => window.print(), 400)
    return () => clearTimeout(id)
  }, [ready])

  if (state.status !== 'ready') {
    const back = testId ? '/student/result?test=' + encodeURIComponent(testId) : '/student/results'
    return (
      <div className="tv-paper">
        <div className="pp-state">
          <div className="pp-state-card" role={state.status === 'loading' ? 'status' : state.status === 'error' ? 'alert' : undefined}>
            <div className="pp-state-head">
              <img src="/testverse-logo.svg" alt="Testverse by Studyverse" width="1784" height="409" />
            </div>
            {state.status === 'loading' ? (
              <div className="pp-state-body">
                <span className="pp-spinner" aria-hidden="true"></span>
                <p>Preparing your question paper…</p>
              </div>
            ) : (
              <div className="pp-state-body">
                <span className={'pp-state-ic' + (state.status === 'locked' ? ' is-locked' : '')} aria-hidden="true">
                  {state.status === 'locked' ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="4" y="11" width="16" height="10" rx="2" />
                      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 8v5" />
                      <path d="M12 16.5v.5" />
                    </svg>
                  )}
                </span>
                <h1>{state.title}</h1>
                <p>{state.error}</p>
                <Link className="pp-btn" to={back}>
                  Back to your result
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const { test, paper, watermark } = state
  const langs = paper.languages || ['en']
  const hasHi = langs.includes('hi')
  const exam = examLabel(test.exam)
  let n = 0

  return (
    <div className="tv-paper">
      {/* On screen only */}
      <div className="pp-toolbar">
        <div className="pp-toolbar-in">
          <Link to={'/student/result?test=' + encodeURIComponent(test.id)} className="pp-back">
            ← Back to result
          </Link>
          {hasHi ? (
            <div className="pp-seg" role="group" aria-label="Language">
              {[
                ['en', 'English'],
                ['hi', 'हिन्दी'],
                ['both', 'Both'],
              ].map(([k, t]) => (
                <button key={k} type="button" aria-pressed={lang === k ? 'true' : 'false'} onClick={() => setLang(k)}>
                  {t}
                </button>
              ))}
            </div>
          ) : null}
          <button className="pp-btn" type="button" onClick={() => window.print()} disabled={!ready}>
            Download PDF
          </button>
        </div>
        <p className="pp-hint">In the print window, choose “Save as PDF” as the printer.</p>
      </div>

      {watermark ? (
        <div className="pp-mark" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span key={i}>
              {[watermark.name, watermark.contact].filter(Boolean).join(' · ')}
            </span>
          ))}
        </div>
      ) : null}

      <table className="pp-sheet">
        {/* Browsers repeat a table's thead and tfoot on every printed page */}
        <thead>
          <tr>
            <td>
              <header className="pp-head">
                {/* An <img>, not the #tv-logo sprite: Chrome drops <use> from repeated table headers in print */}
                <img className="pp-logo" src="/testverse-logo.svg" alt="Testverse by Studyverse" width="1784" height="409" />
                <span className="pp-site">{SITE}</span>
              </header>
            </td>
          </tr>
        </thead>
        <tfoot>
          <tr>
            <td>
              <footer className="pp-foot">
                <span>{TAGLINE}</span>
                <span className="pp-foot-title">{test.title}</span>
              </footer>
            </td>
          </tr>
        </tfoot>
        <tbody>
          <tr>
            <td>
              <section className="pp-cover">
                {exam ? <span className="pp-eyebrow">{exam}</span> : null}
                <h1>{test.title}</h1>
                <dl className="pp-facts">
                  <div>
                    <dt>Questions</dt>
                    <dd>{test.questionCount}</dd>
                  </div>
                  <div>
                    <dt>Maximum marks</dt>
                    <dd>{test.totalMarks}</dd>
                  </div>
                  <div>
                    <dt>Duration</dt>
                    <dd>{test.durationMin} min</dd>
                  </div>
                  <div>
                    <dt>Sections</dt>
                    <dd>{paper.sections.map((s) => s.name).join(', ')}</dd>
                  </div>
                </dl>
              </section>

              {paper.sections.map((s) => (
                <section className="pp-section" key={s.name}>
                  <h2>{s.name}</h2>
                  <ol className="pp-qs">
                    {s.questions.map((q) => {
                      n++
                      const opts = q.type === 'ar' ? AR_OPTIONS : q.options
                      return (
                        <li className="pp-q" key={q.id}>
                          <div className="pp-q-top">
                            <b>Q{n}.</b>
                            <span className="pp-q-meta">
                              {q.type === 'multiple' ? 'One or more correct · ' : q.type === 'integer' ? 'Integer answer · ' : q.type === 'numerical' ? 'Numerical answer · ' : ''}
                              {marksText(q.marks)}
                            </span>
                          </div>
                          <div className="pp-q-text">
                            <Txt value={q.text} lang={lang} as="div" />
                          </div>
                          {q.type === 'ar' ? (
                            <div className="pp-ar">
                              <div>
                                <b>Assertion (A):</b> <Txt value={q.assertion} lang={lang} />
                              </div>
                              <div>
                                <b>Reason (R):</b> <Txt value={q.reason} lang={lang} />
                              </div>
                            </div>
                          ) : null}
                          {q.type === 'match' && Array.isArray(q.list1) ? (
                            <table className="pp-match">
                              <tbody>
                                {q.list1.map((a, i) => (
                                  <tr key={i}>
                                    <td>
                                      <Txt value={a} lang={lang} />
                                    </td>
                                    <td>
                                      <Txt value={(q.list2 || [])[i] || ''} lang={lang} />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : null}
                          {Array.isArray(opts) && opts.length ? (
                            <ol className="pp-opts">
                              {opts.map((o, i) => (
                                <li key={i}>
                                  <span className="pp-opt-l">({letter(i)})</span>
                                  <span>
                                    <Txt value={o} lang={lang} />
                                  </span>
                                </li>
                              ))}
                            </ol>
                          ) : q.type === 'integer' || q.type === 'numerical' ? (
                            <p className="pp-blank">Answer: ____________</p>
                          ) : null}
                        </li>
                      )
                    })}
                  </ol>
                </section>
              ))}

              <p className="pp-end">
                End of question paper · {TAGLINE}
              </p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
