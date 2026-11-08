import MathText from '../../../lib/MathText.jsx'
import { esc } from '../../../lib/esc.js'
import { mmss } from '../../../lib/format.js'
import { AR_OPTIONS } from '../data/papers.js'
import { computeResult } from '../scoring.js'
import { hasAnswer } from '../answers.js'
import { Link } from 'react-router-dom'

function letter(i) {
  return String.fromCharCode(65 + i)
}

function tx(o, lang) {
  if (!o) return ''
  if (typeof o === 'string') return o
  return lang === 'hi' && o.hi ? o.hi : o.en
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
export default function ResultView({ paper, flat, attempt, reviewFilter, setReviewFilter, onReport, onVideo }) {
  const R = computeResult(flat, attempt)
  const totalQ = flat.length
  const attempted = R.correct + R.wrong + R.partial
  const acc = attempted ? Math.round(((R.correct + R.partial * 0.5) / attempted) * 100) : 0
  const used = Math.min(attempt.durationMs, attempt.submittedAt - attempt.startedAt)
  const avg = attempted ? R.timeMs / Math.max(1, totalQ - R.skipped) : 0
  const slowWrong = R.items.filter((it) => it.sc.status === 'wrong' && it.time > 3 * 60000)
  const fastWrong = R.items.filter((it) => it.sc.status === 'wrong' && it.time < 30000)
  const chapters = Object.keys(R.chapters)
    .map((k) => ({ name: k, ...R.chapters[k] }))
    .sort((a, b) => b.lost - a.lost)
  const colour = (p) => (p >= 75 ? 'var(--green)' : p >= 50 ? 'var(--blue)' : 'var(--amber)')
  const lang = attempt.lang || 'en'

  const list = R.items.filter((it) => {
    if (reviewFilter === 'all') return true
    if (reviewFilter === 'marked') return it.r && it.r.marked
    if (reviewFilter === 'wrong') return it.sc.status === 'wrong' || it.sc.status === 'partial'
    return it.sc.status === reviewFilter
  })
  const label = { correct: ['p-correct', 'Correct'], wrong: ['p-wrong', 'Wrong'], partial: ['p-partial', 'Partly correct'], skipped: ['p-skipped', 'Not answered'] }

  const pct = R.max ? Math.max(0, Math.min(100, Math.round((R.total / R.max) * 100))) : 0
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
    <section id="v-result" className="result">
      <header className="bar">
        <div className="in">
          <Link className="brand" to="/student">
            <svg className="tv-logo" style={{ height: '32px' }} viewBox="0 0 1784 409" role="img" aria-label="Testverse by Studyverse">
              <use href="#tv-logo" />
            </svg>
          </Link>
          <Link className="back-link" to="/student">
            Back to home
          </Link>
        </div>
      </header>

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
            <span className="eyebrow on-navy">Result and analysis · {paper.exam}</span>
            <h1>{paper.title}</h1>
            <p>
              Submitted{' '}
              {new Date(attempt.submittedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
              {attempt.autoSubmitted ? ' (time ran out)' : ''}
              {attempt.demo ? ' · sample attempt' : ''}
            </p>
          </div>
          <div className="res-score">
            <span>{verdict}</span>
            <b>
              {R.total}
              <small> / {R.max}</small>
            </b>
            <em>marks scored</em>
          </div>
        </div>
      </div>

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
            <b>{mmss(used)}</b>
            <div className="meter" aria-hidden="true">
              <i style={{ width: usedPct + '%' }}></i>
            </div>
            <small>of {paper.durationMin} min · {mmss(avg)} per question</small>
          </div>
        </div>

        {paper.kind === 'live' ? <div className="notice n-info">Your all-India rank will be published at [time] once everyone has finished.</div> : null}

        <div className="analysis">
          <section className="block">
            <div className="block-head">
              <h2>Section-wise</h2>
              <p>Marks per section against the maximum.</p>
            </div>
            <div className="panel section-rows">
              {paper.sections.map((s) => {
                const S = R.sections[s.name]
                const p = S.max ? Math.max(0, Math.round((S.marks / S.max) * 100)) : 0
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
                  Negative marking took away <b>{R.negative} marks</b>.
                  {fastWrong.length ? ' ' + fastWrong.length + ' wrong answer' + (fastWrong.length === 1 ? ' was' : 's were') + ' given in under 30 seconds, likely guesses.' : ''}
                </li>
              ) : (
                <li>No marks lost to negative marking. Good control.</li>
              )}
              {slowWrong.length ? (
                <li>
                  You spent over 3 minutes on {slowWrong.length} question{slowWrong.length === 1 ? '' : 's'} and still got {slowWrong.length === 1 ? 'it' : 'them'} wrong. Next time, move on and come back.
                </li>
              ) : null}
              <li>
                Average time per attempted question: <b>{mmss(avg)}</b>.
              </li>
              {R.skipped ? <li>You left {R.skipped} question{R.skipped === 1 ? '' : 's'} unanswered.</li> : null}
            </ol>
          </section>
        </div>

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
                  <th>Section</th>
                  <th className="hide-sm">Accuracy</th>
                  <th className="n">Correct</th>
                  <th className="n">Marks lost</th>
                </tr>
              </thead>
              <tbody>
                {chapters.map((c) => {
                  const p = c.n ? Math.round((c.right / c.n) * 100) : 0
                  return (
                    <tr key={c.name + c.sec}>
                      <td>
                        <b>{c.name}</b>
                      </td>
                      <td className="muted">{c.sec}</td>
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
          </div>
        </section>

        <section className="block" aria-labelledby="rv-t">
          <div className="block-head review-head">
            <div>
              <h2 id="rv-t">Questions and solutions</h2>
              <p>Jump to any question, or filter the list below.</p>
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
                        {it.f.sec} · {q.chapter} · {mmss(it.time)}
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
                    <details className="sol" open={it.sc.status !== 'correct'}>
                      <summary>Solution</summary>
                      <div>
                        <MathText html={esc(q.solution)} />
                      </div>
                    </details>
                    <div className="rq-actions">
                      <button className="btn btn-ghost btn-sm" type="button" onClick={() => onVideo(it)}>
                        Request video solution
                      </button>
                      <button className="btn btn-ghost btn-sm" type="button" onClick={() => onReport(it.n)}>
                        Report a problem
                      </button>
                    </div>
                  </article>
                )
              })
            ) : (
              <div className="empty">No questions in this view.</div>
            )}
          </div>
        </section>
      </div>
    </section>
  )
}
