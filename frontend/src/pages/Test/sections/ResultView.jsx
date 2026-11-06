import MathText, { esc } from '../../../lib/MathText.jsx'
import { mmss } from '../../../lib/format.js'
import { AR_OPTIONS } from '../data/papers.js'
import { computeResult } from '../scoring.js'
import { hasAnswer } from '../answers.js'

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
  const colour = (p) => (p >= 75 ? '#1E7A46' : p >= 50 ? 'var(--blue)' : 'var(--orange)')
  const lang = attempt.lang || 'en'

  const list = R.items.filter((it) => {
    if (reviewFilter === 'all') return true
    if (reviewFilter === 'marked') return it.r && it.r.marked
    if (reviewFilter === 'wrong') return it.sc.status === 'wrong' || it.sc.status === 'partial'
    return it.sc.status === reviewFilter
  })
  const label = { correct: ['p-correct', 'Correct'], wrong: ['p-wrong', 'Wrong'], partial: ['p-partial', 'Partly correct'], skipped: ['p-skipped', 'Not answered'] }

  return (
    <section id="v-result">
      <div className="bar">
        <div className="in">
          <a className="brand" href="/student">
            <svg className="tv-logo" style={{ height: '34px' }} viewBox="0 0 1784 409" role="img" aria-label="Testverse by Studyverse">
              <use href="#tv-logo" />
            </svg>
          </a>
          <a href="/student" style={{ marginLeft: 'auto', color: '#C9D0EC', fontSize: '14px' }}>
            ← Back to home
          </a>
        </div>
      </div>

      <div className="res-wrap" id="result">
        <div className="res-head">
          <div>
            <h1>
              {paper.title}: your result
            </h1>
            <p>
              Submitted{' '}
              {new Date(attempt.submittedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
              {attempt.autoSubmitted ? ' (time ran out)' : ''}
              {attempt.demo ? ' · sample attempt' : ''}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <a className="btn btn-outline" href="/student">
              Back to home
            </a>
          </div>
        </div>

        <div className="kpis">
          <div className="kpi main">
            <b>
              {R.total} / {R.max}
            </b>
            <span>Score</span>
          </div>
          <div className="kpi">
            <b>{acc}%</b>
            <span>Accuracy</span>
          </div>
          <div className="kpi">
            <b>
              {attempted} / {totalQ}
            </b>
            <span>Attempted</span>
          </div>
          <div className="kpi">
            <b>
              {R.correct} · {R.wrong}
              {R.partial ? ' · ' + R.partial : ''}
            </b>
            <span>
              Correct · wrong{R.partial ? ' · partly correct' : ''}
            </span>
          </div>
          <div className="kpi">
            <b>{mmss(used)}</b>
            <span>Time used of {paper.durationMin} min</span>
          </div>
        </div>

        {paper.kind === 'live' ? <div className="notice n-info">Your all-India rank will be published at [time] once everyone has finished.</div> : null}

        <div className="two">
          <section className="card">
            <h2>Section-wise</h2>
            {paper.sections.map((s) => {
              const S = R.sections[s.name]
              const p = S.max ? Math.max(0, Math.round((S.marks / S.max) * 100)) : 0
              return (
                <div key={s.name}>
                  <div className="barrow">
                    <span>{s.name}</span>
                    <div>
                      <i style={{ width: p + '%', background: colour(p) }}></i>
                    </div>
                    <b>
                      {S.marks}/{S.max}
                    </b>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '-4px 0 12px' }}>
                    {S.correct} correct · {S.wrong} wrong · {S.skipped} skipped · {mmss(S.time)}
                  </p>
                </div>
              )
            })}
          </section>

          <section className="card">
            <h2>What to work on</h2>
            <ol className="tipl">
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

        <section className="card">
          <h2>Chapter-wise</h2>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Chapter</th>
                  <th>Section</th>
                  <th>Correct</th>
                  <th>Marks lost</th>
                </tr>
              </thead>
              <tbody>
                {chapters.map((c) => (
                  <tr key={c.name + c.sec}>
                    <td>{c.name}</td>
                    <td>{c.sec}</td>
                    <td>
                      {c.right} / {c.n}
                    </td>
                    <td>{c.lost ? <b style={{ color: 'var(--orange-ink)' }}>{c.lost}</b> : '0'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section style={{ display: 'grid', gap: '12px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '20px' }}>Questions and solutions</h2>
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
                </button>
              ))}
            </div>
          </div>
          <div className="review" id="review">
            {list.length ? (
              list.map((it) => {
                const q = it.f.q
                const L = label[it.sc.status]
                const correctText = q.type === 'integer' || q.type === 'numerical' ? String(q.answer) + (q.tolerance ? ' (± ' + q.tolerance + ')' : '') : answerText(q, q.answer, lang)
                return (
                  <article className="rq" key={q.id}>
                    <div className="rq-top">
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <b style={{ fontFamily: 'var(--display)' }}>Q.{it.n}</b>
                        <span className={'pill ' + L[0]}>
                          {L[1]} · {it.sc.marks > 0 ? '+' : ''}
                          {it.sc.marks}
                        </span>
                        {it.r && it.r.marked ? <span className="pill p-skipped">Marked</span> : null}
                      </div>
                      <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                        {it.f.sec} · {q.chapter} · {mmss(it.time)}
                      </span>
                    </div>
                    <div style={{ fontSize: '16px', lineHeight: 1.6 }}>
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
                      <span className={'yours' + (it.sc.status === 'wrong' ? ' bad' : '')}>
                        <MathText html={esc('Your answer: ' + answerText(q, it.r && it.r.answer, lang))} />
                      </span>
                      <span className="right">
                        <MathText html={esc('Correct: ' + correctText)} />
                      </span>
                    </div>
                    <div className="sol">
                      <b>Solution</b>
                      {'\n'}
                      <MathText html={esc(q.solution)} />
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button className="btn btn-outline btn-sm" type="button" onClick={() => onVideo(it)}>
                        Request video solution
                      </button>
                      <button className="btn btn-outline btn-sm" type="button" onClick={() => onReport(it.n)}>
                        Report a problem
                      </button>
                    </div>
                  </article>
                )
              })
            ) : (
              <div className="card">
                <p style={{ color: 'var(--muted)' }}>No questions in this view.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </section>
  )
}
