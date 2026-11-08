import { useState } from 'react'
import { hms } from '../../../lib/format.js'
import { Q_TYPE_LABELS } from '../data/papers.js'
import { Link } from 'react-router-dom'

function timeLeftOf(a) {
  return a.startedAt + a.durationMs - Date.now()
}

/*
  design/test.html renderInstr() — instructions screen (facts, marking scheme,
  rules, palette legend, language pick, internet check, agree + start).
*/
export default function InstructionsView({ paper, flat, attempt, lang, setLang, onStart, online }) {
  const resuming = !!(attempt && !attempt.submittedAt)
  const [agree, setAgree] = useState(resuming)

  // One row per distinct marking scheme, in first-appearance order.
  const markRows = new Map()
  flat.forEach((f) => {
    const k = f.q.type + '|' + f.q.marks.correct + '|' + f.q.marks.wrong + '|' + (f.q.marks.partial ? 1 : 0)
    if (!markRows.has(k)) markRows.set(k, f.q)
  })

  const totalQ = flat.length
  const maxMarks = flat.reduce((a, f) => a + f.q.marks.correct, 0)
  const agreeId = 'agree'

  return (
    <section id="v-instr">
      <div className="bar">
        <div className="in">
          <Link className="brand" to="/student">
            <svg className="tv-logo" style={{ height: '34px' }} viewBox="0 0 1784 409" role="img" aria-label="Testverse by Studyverse">
              <use href="#tv-logo" />
            </svg>
          </Link>
          <Link className="back-link" to="/student">
            Back to home
          </Link>
        </div>
      </div>
      <div className="wrap" id="instr">
        <div className="page-head">
          <span className="eyebrow">Instructions</span>
          <h1>{paper.title}</h1>
          <p>{paper.note ? `${paper.exam} · ${paper.note}` : paper.exam}</p>
        </div>

        {resuming ? (
          <div className="notice n-warn">
            <b>You have a test in progress.</b> Your answers are saved. The timer kept running while you were away, so you have <b>{hms(timeLeftOf(attempt))}</b> left.
          </div>
        ) : null}

        <div className="facts">
          <div>
            <b>{totalQ}</b>
            <span>questions</span>
          </div>
          <div>
            <b>{paper.durationMin} min</b>
            <span>duration</span>
          </div>
          <div>
            <b>{maxMarks}</b>
            <span>total marks</span>
          </div>
          <div>
            <b>{paper.sections.length}</b>
            <span>sections: {paper.sections.map((s) => s.name).join(', ')}</span>
          </div>
        </div>

        <section className="card">
          <h2>Marking scheme</h2>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Question type</th>
                  <th>Correct</th>
                  <th>Wrong</th>
                  <th>Not answered</th>
                </tr>
              </thead>
              <tbody>
                {[...markRows.values()].map((q, i) => (
                  <tr key={i}>
                    <td>{Q_TYPE_LABELS[q.type]}</td>
                    <td>
                      {'+' + q.marks.correct}
                      {q.marks.partial ? (
                        <>
                          {' '}
                          (all correct options)
                          <br />
                          <span style={{ color: 'var(--muted)', fontSize: '13px', fontVariantNumeric: 'normal' }}>+1 for each correct option if you choose only some and no wrong one</span>
                        </>
                      ) : null}
                    </td>
                    <td>{q.marks.wrong || 0}</td>
                    <td>0</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <h2>Instructions</h2>
          <ol className="rules">
            <li>
              The timer starts when you press Start and <b>keeps running even if you close the app</b>. The test submits automatically when time is up.
            </li>
            <li>Your answers are saved automatically. If your internet or phone stops, log in again and continue from where you left off.</li>
            <li>
              Use <b>Save &amp; next</b> to save an answer. <b>Mark for review &amp; next</b> flags a question to come back to. A marked question that has an answer is still evaluated.
            </li>
            <li>For integer and numerical questions, type the number or use the on-screen keypad.</li>
            <li>Switching to other apps or tabs is recorded.</li>
          </ol>
        </section>

        <section className="card">
          <h2>Question palette</h2>
          <div className="legend">
            <div>
              <span className="chip nv">1</span>Not visited
            </div>
            <div>
              <span className="chip na">2</span>Not answered
            </div>
            <div>
              <span className="chip an">3</span>Answered
            </div>
            <div>
              <span className="chip mr">4</span>Marked for review
            </div>
            <div>
              <span className="chip am">5</span>Answered and marked (will be evaluated)
            </div>
          </div>
        </section>

        <section className="card start-card">
          {paper.languages.length > 1 ? (
            <div className="lang-row">
              <b>Question language</b>
              <div className="seg" role="group" aria-label="Question language">
                {paper.languages.map((l) => (
                  <button key={l} type="button" data-ilang={l} aria-pressed={lang === l ? 'true' : 'false'} onClick={() => setLang(l)}>
                    {l === 'hi' ? 'हिंदी' : 'English'}
                  </button>
                ))}
              </div>
              <span>You can switch during the test.</span>
            </div>
          ) : null}
          <div className={'notice ' + (online ? 'n-ok' : 'n-err')} id="net" role="status">
            {online ? 'Internet connection OK.' : 'You are offline. Connect to the internet to start.'}
          </div>
          <label className="check" htmlFor={agreeId}>
            <input type="checkbox" id={agreeId} checked={agree} onChange={(e) => setAgree(e.target.checked)} /> I have read the instructions and will not use unfair means.
          </label>
          <div>
            <button className="btn btn-primary" type="button" id="start" disabled={!agree} onClick={onStart}>
              {resuming ? 'Resume test' : 'Start test'}
            </button>
          </div>
        </section>

        <p className="demo-note">
          Demo paper. Try{' '}
          <Link to="/test?test=JA1">
            the JEE Advanced demo
          </Link>{' '}
          for multiple-correct, integer and numerical questions.
        </p>
      </div>
    </section>
  )
}
