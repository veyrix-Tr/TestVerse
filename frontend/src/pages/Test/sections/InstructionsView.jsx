import { useState } from 'react'
import { Link } from 'react-router-dom'
import { fmt, hms, pad } from '../../../lib/format.js'
import { useCountdown } from '../../../lib/hooks.js'
import { Q_TYPE_LABELS } from '../data/papers.js'

const mins = (n) => n + (n === 1 ? ' minute' : ' minutes')

const HOW_IT_WORKS = [
  <>
    The timer starts when you press Start and <b>keeps running even if you close the app</b>. The test submits automatically when time is up.
  </>,
  <>Your answers are saved automatically. If your internet or phone stops, log in again and continue from where you left off.</>,
  <>
    Use <b>Save &amp; next</b> to save an answer. <b>Mark for review &amp; next</b> flags a question to come back to. A marked question that has an answer is still evaluated.
  </>,
  <>For integer and numerical questions, type the number or use the on-screen keypad.</>,
  <>Switching to other apps or tabs is recorded.</>,
]

const LEGEND = [
  ['nv', '1', 'Not visited', 'You have not opened it yet'],
  ['na', '2', 'Not answered', 'Opened, but no answer saved'],
  ['an', '3', 'Answered', 'Your answer is saved'],
  ['mr', '4', 'Marked for review', 'No answer, flagged to revisit'],
  ['am', '5', 'Answered and marked', 'Flagged, and still evaluated'],
]

/*
  design/test.html renderInstr() — instructions screen (facts, marking scheme,
  rules, palette legend, language pick, internet check, agree + start).
  Layout: navy hero with the paper facts, then the reading column on the left
  and a sticky "ready to start" panel on the right.
*/
export default function InstructionsView({ paper, flat, attempt, left, lang, setLang, onStart, starting, online, blocked, offset }) {
  const resuming = !!(attempt && !attempt.submittedAt)
  const [agree, setAgree] = useState(resuming)
  // Opening time on this device's clock (the server's clock is `offset` ahead)
  const opensLocal = blocked && blocked.opensAt ? new Date(Date.parse(blocked.opensAt) - (offset || 0)).toISOString() : null
  const cd = useCountdown(opensLocal)
  const waiting = !!opensLocal && !cd.done
  const teacherRules = paper.instructions
    .split('\n')
    .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
    .filter(Boolean)

  // One row per distinct marking scheme, in first-appearance order.
  const markRows = new Map()
  flat.forEach((f) => {
    const k = f.q.type + '|' + f.q.marks.correct + '|' + f.q.marks.wrong + '|' + (f.q.marks.partial ? 1 : 0)
    if (!markRows.has(k)) markRows.set(k, f.q)
  })

  const totalQ = flat.length
  const maxMarks = flat.reduce((a, f) => a + f.q.marks.correct, 0)
  const sectionRows = paper.sections.map((s, si) => {
    const qs = flat.filter((f) => f.si === si)
    return { name: s.name, n: qs.length, marks: qs.reduce((a, f) => a + f.q.marks.correct, 0) }
  })
  const agreeId = 'agree'

  return (
    <section id="v-instr" className="instr">
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

      <div className="instr-hero">
        <div className="shell instr-cols">
          <div className="hero-copy">
            <span className="eyebrow on-navy">{paper.exam} · Instructions</span>
            <h1>{paper.title}</h1>
            <p>
              {paper.subject}
              {paper.closesAt ? ` · Open until ${fmt(paper.closesAt)}` : ''}
            </p>
            <dl className="facts">
              <div>
                <dt>Questions</dt>
                <dd>{totalQ}</dd>
              </div>
              <div>
                <dt>Duration</dt>
                <dd>
                  {paper.durationMin}
                  <small>min</small>
                </dd>
              </div>
              <div>
                <dt>Total marks</dt>
                <dd>{maxMarks}</dd>
              </div>
              <div>
                <dt>Sections</dt>
                <dd>{paper.sections.length}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <div className="shell instr-cols instr-body" id="instr">
        <div className="instr-main">
          {resuming ? (
            <div className="notice n-warn">
              <b>You have a test in progress.</b> Your answers are saved. The timer kept running while you were away, so you have <b>{hms(left)}</b> left.
            </div>
          ) : null}

          <div className="duo">
            <section className="block">
              <div className="block-head">
                <h2>Paper structure</h2>
                <p>Sections appear as tabs in the exam. Move between them freely.</p>
              </div>
              <div className="panel">
                <table>
                  <thead>
                    <tr>
                      <th>Section</th>
                      <th className="n">Questions</th>
                      <th className="n">Marks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sectionRows.map((s) => (
                      <tr key={s.name}>
                        <td>
                          <b>{s.name}</b>
                        </td>
                        <td className="n">{s.n}</td>
                        <td className="n">{s.marks}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td>Total</td>
                      <td className="n">{totalQ}</td>
                      <td className="n">{maxMarks}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>

            <section className="block">
              <div className="block-head">
                <h2>Marking scheme</h2>
                <p>Unanswered questions never cost marks.</p>
              </div>
              <div className="panel">
                <table>
                  <thead>
                    <tr>
                      <th>Question type</th>
                      <th className="n">Correct</th>
                      <th className="n">Wrong</th>
                      <th className="n">Blank</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...markRows.values()].map((q, i) => (
                      <tr key={i}>
                        <td>
                          <b>{Q_TYPE_LABELS[q.type]}</b>
                          {q.marks.partial ? <span className="sub">+1 for each correct option if you choose only some and no wrong one</span> : null}
                        </td>
                        <td className="n">
                          <span className="mk mk-plus">{'+' + q.marks.correct}</span>
                        </td>
                        <td className="n">{q.marks.wrong ? <span className="mk mk-minus">{String(q.marks.wrong).replace('-', '−')}</span> : <span className="mk">0</span>}</td>
                        <td className="n">
                          <span className="mk">0</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {teacherRules.length ? (
            <section className="block" id="teacher-rules">
              <div className="block-head">
                <h2>Instructions</h2>
                <p>From your teacher, for this test.</p>
              </div>
              <ol className="rules">
                {teacherRules.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ol>
            </section>
          ) : null}

          <section className="block">
            <div className="block-head">
              <h2>{teacherRules.length ? 'How the exam screen works' : 'Instructions'}</h2>
              <p>Read these once. They are the same rules as the real exam.</p>
            </div>
            <ol className="rules">
              {HOW_IT_WORKS.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="ready" aria-label="Start the test">
          <div className="ready-card">
            <div className="ready-head">
              <h2>{resuming ? 'Pick up where you left off' : waiting ? 'Not open yet' : 'Ready when you are'}</h2>
              <p>
                {resuming
                  ? `${hms(left)} left on the clock.`
                  : waiting
                    ? `This test opens on ${fmt(blocked.opensAt)}.`
                    : `${mins(paper.durationMin)}, ${totalQ} questions. The clock starts on Start.`}
              </p>
            </div>

            {waiting ? (
              <div className="opens-in" role="timer" aria-label="Time until the test opens">
                <span className="field-label">Opens in</span>
                <div className="opens-segs">
                  {[
                    [cd.d, 'days'],
                    [pad(cd.h), 'hrs'],
                    [pad(cd.m), 'min'],
                    [pad(cd.s), 'sec'],
                  ].map(([v, l]) => (
                    <span key={l}>
                      <b>{v}</b>
                      <small>{l}</small>
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {paper.languages.length > 1 ? (
              <div className="ready-row">
                <span className="field-label" id="lang-label">
                  Question language
                </span>
                <div className="seg seg-full" role="group" aria-labelledby="lang-label">
                  {paper.languages.map((l) => (
                    <button key={l} type="button" data-ilang={l} aria-pressed={lang === l ? 'true' : 'false'} onClick={() => setLang(l)}>
                      {l === 'hi' ? 'हिंदी' : 'English'}
                    </button>
                  ))}
                </div>
                <span className="hint">You can switch at any time during the test.</span>
              </div>
            ) : null}

            <div className="ready-row">
              <span className="field-label">Question palette</span>
              <ul className="legend">
                {LEGEND.map(([k, n, label, desc]) => (
                  <li key={k}>
                    <span className={'chip ' + k} aria-hidden="true">
                      {n}
                    </span>
                    <span>
                      <b>{label}</b>
                      <small>{desc}</small>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className={'net ' + (online ? 'ok' : 'err')} id="net" role="status">
              <i aria-hidden="true"></i>
              {online ? 'Internet connection OK' : 'You are offline. Connect to the internet to start.'}
            </div>

            <label className="check" htmlFor={agreeId}>
              <input type="checkbox" id={agreeId} checked={agree} onChange={(e) => setAgree(e.target.checked)} />
              <span>I have read the instructions and will not use unfair means.</span>
            </label>

            <button className="btn btn-primary btn-lg btn-block" type="button" id="start" disabled={!agree || waiting || starting} onClick={onStart}>
              {starting ? (resuming ? 'Resuming…' : 'Starting…') : waiting ? 'Opens ' + fmt(blocked.opensAt, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : resuming ? 'Resume test' : 'Start test'}
            </button>
          </div>

          {paper.closesAt && !resuming ? <p className="demo-note">Start before {fmt(paper.closesAt)}. You get the full {mins(paper.durationMin)} once you start.</p> : null}
        </aside>
      </div>
    </section>
  )
}
