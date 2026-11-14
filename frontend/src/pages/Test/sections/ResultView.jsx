import MathText from '../../../lib/MathText.jsx'
import { esc } from '../../../lib/esc.js'
import { mmss } from '../../../lib/format.js'
import { AR_OPTIONS } from '../data/papers.js'
import { computeResult } from '../scoring.js'
import { hasAnswer } from '../answers.js'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import BackButton from '../../../components/BackButton.jsx'
import { DownloadIcon, LockIcon, paperHref, unlockText } from './afterTest.jsx'
import Leaderboard from './Leaderboard.jsx'

function letter(i) {
  return String.fromCharCode(65 + i)
}

function tx(o, lang) {
  if (!o) return ''
  if (typeof o === 'string') return o
  return lang === 'hi' && o.hi ? o.hi : o.en
}

/* Only YouTube links are accepted by the server; check again before linking. */
function videoUrl(v) {
  return typeof v === 'string' && /^https:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\//.test(v) ? v : null
}

/* Time used, the way the spec writes it: "2 h 41 min", "46 min 12 s" */
function longTime(ms) {
  const s = Math.max(0, Math.round(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h) return h + ' h' + (m ? ' ' + m + ' min' : '')
  return m + ' min' + (s % 60 ? ' ' + (s % 60) + ' s' : '')
}

/* A test's length in minutes as "3 h", "1 h 30 min" or "45 min" */
function durationText(min) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h ? h + ' h' + (m ? ' ' + m + ' min' : '') : m + ' min'
}

const CHAPTERS_SHOWN = 8

/* 180 -> "3 minutes", 90 -> "90 seconds" */
function secondsText(s) {
  if (s % 60 === 0) return s / 60 + (s === 60 ? ' minute' : ' minutes')
  return s + ' seconds'
}

function answerText(q, a, lang) {
  if (!hasAnswer(q, a)) return 'Not answered'
  if (q.type === 'integer' || q.type === 'numerical') return String(a)
  const opts = q.type === 'ar' ? AR_OPTIONS : q.options
  const idx = Array.isArray(a) ? a : [a]
  return idx.map((i) => '(' + letter(i) + ') ' + tx(opts[i], lang)).join(', ')
}

/*
  design/test.html renderResult() + renderReview() — KPIs, section bars,
  "What to work on", chapter table, review list with filters.
*/
export default function ResultView({ paper, flat, attempt, meta, reviewFilter, setReviewFilter, embedded }) {
  const [allChapters, setAllChapters] = useState(false)
  // A live test still running for others: the server sends no answers, so only the score shows until it closes
  const locked = !!(meta && meta.paperAt)
  const R = computeResult(locked ? [] : flat, attempt)
  // The server's stored score is the headline; computeResult (same rules) drives the breakdown.
  const total = Number.isFinite(attempt.score) ? attempt.score : R.total
  const max = Number.isFinite(attempt.maxScore) && attempt.maxScore > 0 ? attempt.maxScore : R.max
  const totalQ = flat.length
  const attempted = R.correct + R.wrong + R.partial
  const acc = attempted ? Math.round(((R.correct + R.partial * 0.5) / attempted) * 100) : 0
  const used = Math.min(attempt.durationMs, attempt.submittedAt - attempt.startedAt)
  const avg = attempted ? R.timeMs / Math.max(1, totalQ - R.skipped) : 0
  // The admin's thresholds (Admin › Website): a wrong answer faster than guessSeconds is a likely guess,
  // one slower than slowSeconds a time sink
  const settings = (meta && meta.settings) || {}
  const guessSec = settings.guessSeconds || 30
  const slowSec = settings.slowSeconds || 180
  const slowWrong = R.items.filter((it) => it.sc.status === 'wrong' && it.time > slowSec * 1000)
  const fastWrong = R.items.filter((it) => it.sc.status === 'wrong' && it.time > 0 && it.time < guessSec * 1000)
  // Where the marks went: scored + lost + left = max (bar widths can't go below 0)
  const share = (v) => (max > 0 ? Math.max(0, (v / max) * 100) : 0)
  const chapters = Object.keys(R.chapters)
    .map((k) => ({ name: k, ...R.chapters[k] }))
    .sort((a, b) => b.lost - a.lost)
  const colour = (p) => (p >= 75 ? 'var(--green)' : p >= 50 ? 'var(--blue)' : 'var(--amber)')
  const lang = attempt.lang || 'en'
  const history = (meta && meta.history) || []
  const shownNo = (meta && meta.attemptNo) || 1
  const testHref = '/test?test=' + encodeURIComponent(paper.id)
  // Inside the dashboard, switching attempts stays on the dashboard's result page
  const attemptHref = (n) => (embedded ? '/student/result?test=' + encodeURIComponent(paper.id) : testHref + '&view=result') + '&attempt=' + n

  const list = R.items.filter((it) => {
    if (reviewFilter === 'all') return true
    if (reviewFilter === 'marked') return it.r && it.r.marked
    if (reviewFilter === 'wrong') return it.sc.status === 'wrong' || it.sc.status === 'partial'
    return it.sc.status === reviewFilter
  })
  const label = { correct: ['p-correct', 'Correct'], wrong: ['p-wrong', 'Wrong'], partial: ['p-partial', 'Partly correct'], skipped: ['p-skipped', 'Not answered'] }

  const pct = max ? Math.max(0, Math.min(100, Math.round((total / max) * 100))) : 0
  const usedPct = attempt.durationMs ? Math.min(100, Math.round((used / attempt.durationMs) * 100)) : 0
  const RING = 2 * Math.PI * 52
  const counts = {
    all: R.items.length,
    wrong: R.items.filter((it) => it.sc.status === 'wrong' || it.sc.status === 'partial').length,
    skipped: R.skipped,
    correct: R.correct,
    marked: R.items.filter((it) => it.r && it.r.marked).length,
  }
  const verdict = pct >= 75 ? 'Excellent work' : pct >= 50 ? 'Solid attempt' : pct >= 25 ? 'Room to grow' : 'A starting point'

  function jump(n) {
    if (reviewFilter !== 'all') setReviewFilter('all')
    setTimeout(() => {
      const el = document.getElementById('rq-' + n)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        el.focus({ preventScroll: true })
      }
    }, 30)
  }

  return (
    <section id="v-result" className={'result' + (embedded ? ' is-embedded' : '')}>
      {embedded ? null : (
        <header className="bar">
          <div className="in">
            <Link className="brand" to="/student">
              <svg className="tv-logo" style={{ height: '32px' }} viewBox="0 0 1784 409" role="img" aria-label="Testverse by Studyverse">
                <use href="#tv-logo" />
              </svg>
            </Link>
          </div>
        </header>
      )}

      <div className="res-hero">
        <div className="res-shell res-hero-in">
          <div className="score">
            <svg className="ring" viewBox="0 0 120 120" role="img" aria-label={`Score ${pct} percent`}>
              <circle cx="60" cy="60" r="52" className="ring-track" />
              <circle cx="60" cy="60" r="52" className="ring-val" strokeDasharray={RING} strokeDashoffset={RING * (1 - pct / 100)} transform="rotate(-90 60 60)" />
            </svg>
            <div className="ring-label">
              <b>{pct}%</b>
              <span>of max</span>
            </div>
          </div>
          <div className="res-title">
            {embedded ? null : (
              <BackButton to="/student" tone="dark">
                Back to dashboard
              </BackButton>
            )}
            <span className="eyebrow on-navy">Result and analysis · {paper.exam}</span>
            <h1>{paper.title}</h1>
            <p>
              Submitted{' '}
              {new Date(attempt.submittedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
              {attempt.autoSubmitted ? ' (time ran out)' : ''}
              {history.length > 1 ? ` · Attempt ${shownNo} of ${history.length}` : ''}
            </p>
            {meta ? (
              <div className="res-actions">
                {meta.inProgress ? (
                  <Link className="btn btn-gold" to={testHref}>
                    Resume your retake
                  </Link>
                ) : meta.canRetake ? (
                  <Link className="btn btn-gold" to={testHref + '&retake=1'}>
                    Retake test
                  </Link>
                ) : null}
                {meta.paperAt ? (
                  <span className="res-lock">
                    <LockIcon />
                    Question paper unlocks at {unlockText(meta.paperAt)}
                  </span>
                ) : (
                  <a className="btn btn-outline-light" href={paperHref(paper.id)} target="_blank" rel="noopener">
                    <DownloadIcon />
                    Download question paper
                    <span className="sr"> (opens in a new tab)</span>
                  </a>
                )}
                {history.length > 1 ? (
                  <nav className="attempts" aria-label="Your attempts">
                    {history
                      .slice()
                      .reverse()
                      .map((h) => (
                        <Link key={h.attemptNo} to={attemptHref(h.attemptNo)} aria-current={h.attemptNo === shownNo ? 'page' : undefined}>
                          Attempt {h.attemptNo}
                          <b>{h.score}</b>
                        </Link>
                      ))}
                  </nav>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="res-score">
            <span>{verdict}</span>
            <b id="res-score">
              {total}
              <small> / {max}</small>
            </b>
            <em>marks scored</em>
          </div>
        </div>
      </div>

      {locked ? (
        <div className="res-shell res-body" id="result">
          <div className="kpis" style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
            <section className="kpi" aria-labelledby="lk-t">
              <span>Full result</span>
              <div className="block-head">
                <h2 id="lk-t">Your full result opens at {unlockText(meta.paperAt)}</h2>
                <p>
                  This live test is still running for other students. Correct answers, your question review and the full breakdown appear here once it closes for everyone. Your
                  score above is final.
                </p>
              </div>
            </section>
          </div>
        </div>
      ) : (
      <div className="res-shell res-body" id="result">
        <div className="kpis">
          <div className="kpi">
            <span>Accuracy</span>
            <b>{acc}%</b>
            <div className="meter" aria-hidden="true">
              <i style={{ width: acc + '%', background: colour(acc) }}></i>
            </div>
            <small>of the questions you attempted</small>
          </div>
          <div className="kpi">
            <span>Attempted</span>
            <b>
              {attempted}
              <small> / {totalQ}</small>
            </b>
            <div className="meter" aria-hidden="true">
              <i style={{ width: (totalQ ? (attempted / totalQ) * 100 : 0) + '%' }}></i>
            </div>
            <small>{R.skipped} left blank</small>
          </div>
          <div className="kpi">
            <span>Correct · wrong{R.partial ? ' · partial' : ''}</span>
            <b className="cw">
              <em className="c-ok">{R.correct}</em>
              <em className="c-dot">·</em>
              <em className="c-bad">{R.wrong}</em>
              {R.partial ? (
                <>
                  <em className="c-dot">·</em>
                  <em className="c-part">{R.partial}</em>
                </>
              ) : null}
            </b>
            <div className="meter split" aria-hidden="true">
              <i className="s-ok" style={{ width: (totalQ ? (R.correct / totalQ) * 100 : 0) + '%' }}></i>
              <i className="s-part" style={{ width: (totalQ ? (R.partial / totalQ) * 100 : 0) + '%' }}></i>
              <i className="s-bad" style={{ width: (totalQ ? (R.wrong / totalQ) * 100 : 0) + '%' }}></i>
            </div>
            <small>{R.negative ? `${R.negative} marks lost to negative marking` : 'No negative marks'}</small>
          </div>
          <div className="kpi">
            <span>Time used</span>
            <b>{longTime(used)}</b>
            <div className="meter" aria-hidden="true">
              <i style={{ width: usedPct + '%' }}></i>
            </div>
            <small>of {durationText(paper.durationMin)} · {mmss(avg)} per attempted question</small>
          </div>
        </div>

        <section className="block" aria-labelledby="mw-t">
          <div className="block-head">
            <h2 id="mw-t">Where your marks went</h2>
            <p>All {max} marks of the paper: what you scored, what wrong answers cost and what you left in skipped questions.</p>
          </div>
          <div className="panel marks-went">
            <div className="mw-bar" aria-hidden="true">
              <i className="mw-ok" style={{ width: share(total) + '%' }}></i>
              <i className="mw-bad" style={{ width: share(R.lost) + '%' }}></i>
              <i className="mw-left" style={{ width: share(R.left) + '%' }}></i>
            </div>
            <dl className="mw-key">
              <div>
                <dt><i className="mw-ok" aria-hidden="true"></i>Scored</dt>
                <dd>{total}</dd>
              </div>
              <div>
                <dt><i className="mw-bad" aria-hidden="true"></i>Lost to wrong answers</dt>
                <dd>
                  {R.lost}
                  {R.negative ? <small> incl. {R.negative} negative</small> : null}
                </dd>
              </div>
              <div>
                <dt><i className="mw-left" aria-hidden="true"></i>Left in skipped questions</dt>
                <dd>{R.left}</dd>
              </div>
            </dl>
          </div>
        </section>

        <div className="analysis">
          <section className="block">
            <div className="block-head">
              <h2>Subject-wise</h2>
              <p>Marks, accuracy and time for each section of the paper.</p>
            </div>
            <div className="panel section-rows">
              {paper.sections.map((s) => {
                const S = R.sections[s.name]
                const p = S.max ? Math.max(0, Math.round((S.marks / S.max) * 100)) : 0
                const tried = S.correct + S.wrong + S.partial
                const sAcc = tried ? Math.round(((S.correct + S.partial * 0.5) / tried) * 100) : null
                return (
                  <div className="srow" key={s.name}>
                    <div className="srow-top">
                      <b>{s.name}</b>
                      <span className="srow-score">
                        {S.marks}
                        <small> / {S.max}</small>
                      </span>
                    </div>
                    <div className="meter lg" aria-hidden="true">
                      <i style={{ width: p + '%', background: colour(p) }}></i>
                    </div>
                    <p className="bar-meta">
                      <span>{S.correct} correct</span>
                      <span>{S.wrong} wrong</span>
                      <span>{S.skipped} skipped</span>
                      <span>{sAcc == null ? 'No attempts' : sAcc + '% accuracy'}</span>
                      <span>{mmss(S.time)}</span>
                    </p>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="block">
            <div className="block-head">
              <h2>What to work on</h2>
              <p>The few things that would move your score most.</p>
            </div>
            <ol className="panel tipl">
              {chapters[0] && chapters[0].lost > 0 ? (
                <li>
                  <b>{chapters[0].name}</b> cost you the most: {chapters[0].lost} marks ({chapters[0].right} of {chapters[0].n} correct).
                </li>
              ) : null}
              {R.negative ? (
                <li>
                  You lost <b>{R.negative} marks</b> to negative marking.
                </li>
              ) : (
                <li>No marks lost to negative marking. Good control.</li>
              )}
              {fastWrong.length ? (
                <li>
                  <b>Likely guesses:</b> {fastWrong.length} wrong answer{fastWrong.length === 1 ? '' : 's'} in under {secondsText(guessSec)}. Skip a question rather than guess when you can’t narrow it down.
                </li>
              ) : null}
              {slowWrong.length ? (
                <li>
                  <b>Time sinks:</b> {slowWrong.length} question{slowWrong.length === 1 ? '' : 's'} took over {secondsText(slowSec)} and {slowWrong.length === 1 ? 'was' : 'were'} still wrong. Next time, move on and come back.
                </li>
              ) : null}
              <li>
                Average time per attempted question: <b>{mmss(avg)}</b>.
              </li>
              {R.skipped ? <li>You left {R.skipped} question{R.skipped === 1 ? '' : 's'} unanswered.</li> : null}
            </ol>
          </section>
        </div>

        {embedded ? (
          <section className="block" aria-labelledby="lb-t">
            <div className="block-head">
              <h2 id="lb-t">Leaderboard</h2>
              <p>Where you stand among everyone who took this test, ranked by first attempt.</p>
            </div>
            <Leaderboard testId={paper.id} compact fullHref={'/student/leaderboard?test=' + encodeURIComponent(paper.id)} />
          </section>
        ) : null}

        <section className="block">
          <div className="block-head">
            <h2>Chapter-wise</h2>
            <p>Sorted by marks lost, so the chapters to revise come first.</p>
          </div>
          <div className="panel table-panel">
            <table className="chap">
              <thead>
                <tr>
                  <th>Chapter</th>
                  <th className="hide-xs">Section</th>
                  <th className="hide-sm">Accuracy</th>
                  <th className="n">Correct</th>
                  <th className="n">Marks lost</th>
                </tr>
              </thead>
              <tbody>
                {(allChapters ? chapters : chapters.slice(0, CHAPTERS_SHOWN)).map((c) => {
                  const p = c.n ? Math.round((c.right / c.n) * 100) : 0
                  return (
                    <tr key={c.name + c.sec}>
                      <td>
                        <b>{c.name}</b>
                      </td>
                      <td className="muted hide-xs">{c.sec}</td>
                      <td className="hide-sm">
                        <div className="meter" aria-hidden="true">
                          <i style={{ width: p + '%', background: colour(p) }}></i>
                        </div>
                      </td>
                      <td className="n">
                        {c.right} / {c.n}
                      </td>
                      <td className="n">{c.lost ? <b className="lost">−{c.lost}</b> : <span className="muted">0</span>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {chapters.length > CHAPTERS_SHOWN ? (
              <div className="chap-more">
                <button className="btn btn-outline btn-sm" type="button" aria-expanded={allChapters ? 'true' : 'false'} onClick={() => setAllChapters((v) => !v)}>
                  {allChapters ? 'Show the top ' + CHAPTERS_SHOWN : 'Show all ' + chapters.length + ' chapters'}
                </button>
              </div>
            ) : null}
          </div>
        </section>

        <section className="block" aria-labelledby="rv-t">
          <div className="block-head review-head">
            <div>
              <h2 id="rv-t">Question review</h2>
              <p>Your answer, the correct answer and your time for each question.</p>
            </div>
            <div className="seg" role="group" aria-label="Show">
              {[
                ['all', 'All'],
                ['wrong', 'Wrong'],
                ['skipped', 'Skipped'],
                ['correct', 'Correct'],
                ['marked', 'Marked'],
              ].map(([k, text]) => (
                <button key={k} type="button" data-rf={k} aria-pressed={reviewFilter === k ? 'true' : 'false'} onClick={() => setReviewFilter(k)}>
                  {text}
                  <small>{counts[k]}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="qmap" role="group" aria-label="Jump to a question">
            {R.items.map((it) => (
              <button key={it.n} type="button" className={'qm qm-' + it.sc.status} onClick={() => jump(it.n)} aria-label={`Question ${it.n}, ${label[it.sc.status][1]}`}>
                {it.n}
              </button>
            ))}
            <span className="qmap-key">
              <span><i className="qm-correct"></i>Correct</span>
              <span><i className="qm-wrong"></i>Wrong</span>
              {R.partial ? <span><i className="qm-partial"></i>Partly correct</span> : null}
              <span><i className="qm-skipped"></i>Not answered</span>
            </span>
          </div>

          <div className="review" id="review">
            {list.length ? (
              list.map((it) => {
                const q = it.f.q
                const L = label[it.sc.status]
                const correctText = q.type === 'integer' || q.type === 'numerical' ? String(q.answer) + (q.tolerance ? ' (± ' + q.tolerance + ')' : '') : answerText(q, q.answer, lang)
                return (
                  <article className={'rq rq-' + it.sc.status} key={q.id} id={'rq-' + it.n} tabIndex={-1}>
                    <div className="rq-top">
                      <div className="rq-id">
                        <b>Q.{it.n}</b>
                        <span className={'pill ' + L[0]}>
                          {L[1]} · {it.sc.marks > 0 ? '+' : ''}
                          {it.sc.marks}
                        </span>
                        {it.r && it.r.marked ? <span className="pill p-skipped">Marked</span> : null}
                      </div>
                      <span className="rq-meta">
                        {[it.f.sec, q.chapter, mmss(it.time)].filter(Boolean).join(' · ')}
                      </span>
                    </div>
                    <div className="rq-text">
                      <MathText html={esc(tx(q.text, lang))} />
                    </div>
                    {q.type === 'ar' ? (
                      <div className="ar" style={{ fontSize: '15px' }}>
                        <div>
                          <b>A:</b> <MathText html={esc(tx(q.assertion, lang))} />
                        </div>
                        <div>
                          <b>R:</b> <MathText html={esc(tx(q.reason, lang))} />
                        </div>
                      </div>
                    ) : null}
                    {q.type === 'match' ? (
                      <div className="mtable">
                        <table>
                          <tbody>
                            {q.list1.map((a, i) => (
                              <tr key={i}>
                                <td>{a}</td>
                                <td>{q.list2[i] || ''}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : null}
                    <div className="ans">
                      <div className={'yours' + (it.sc.status === 'wrong' ? ' bad' : it.sc.status === 'correct' ? ' good' : '')}>
                        <span>Your answer</span>
                        <MathText html={esc(answerText(q, it.r && it.r.answer, lang))} />
                      </div>
                      <div className="right">
                        <span>Correct answer</span>
                        <MathText html={esc(correctText)} />
                      </div>
                    </div>
                    {videoUrl(q.video) ? (
                      <div className="rq-actions">
                        <a className="btn btn-outline btn-sm" href={videoUrl(q.video)} target="_blank" rel="noopener noreferrer">
                          Watch video solution
                          <span className="sr"> for question {it.n} (opens YouTube in a new tab)</span>
                        </a>
                      </div>
                    ) : null}
                  </article>
                )
              })
            ) : (
              <div className="empty">No questions in this view.</div>
            )}
          </div>
        </section>
      </div>
      )}
    </section>
  )
}
