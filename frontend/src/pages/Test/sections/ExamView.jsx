import { useEffect, useRef } from 'react'
import { AR_OPTIONS, Q_TYPE_LABELS } from '../data/papers.js'
import { esc } from '../../../lib/esc.js'
import MathText from '../../../lib/MathText.jsx'
import { hms } from '../../../lib/format.js'
import { STATUS_LABEL, countsOf, statusOf } from '../status.js'

function letter(i) {
  return String.fromCharCode(65 + i)
}

/*
  design/test.html exam screen — top bar (save state, language, font size,
  timer), section tabs, question body for all 6 types, palette side sheet.
  All behaviour lives in Test.jsx and arrives through `api`.
*/
export default function ExamView({ paper, flat, attempt, candidate, lang, setLang, curIndex, left, save, sideOpen, setSideOpen, tabNote, onFontUp, onFontDn, api }) {
  const qbodyRef = useRef(null)

  // New question (or language) → scroll the question body back to the top,
  // like the design's body.scrollTop = 0 in renderQ().
  useEffect(() => {
    if (qbodyRef.current) qbodyRef.current.scrollTop = 0
  }, [curIndex, lang])

  const f = flat[curIndex]
  const q = f.q
  const r = attempt.responses[q.id] || { answer: null, marked: false, visited: false, timeMs: 0 }
  const c = countsOf(attempt, flat)
  const sec = paper.sections[f.si]

  /* ---------- question body (design renderQ) ---------- */
  const body = []
  body.push(
    <div className="qtext" key="qt">
      <MathText html={esc(q.text ? (lang === 'hi' && q.text.hi ? q.text.hi : q.text.en) : '')} />
    </div>,
  )
  if (q.type === 'ar')
    body.push(
      <div className="ar" key="ar">
        <div>
          <b>Assertion (A):</b>{' '}
          <MathText html={esc(lang === 'hi' && q.assertion.hi ? q.assertion.hi : q.assertion.en)} />
        </div>
        <div>
          <b>Reason (R):</b> <MathText html={esc(lang === 'hi' && q.reason.hi ? q.reason.hi : q.reason.en)} />
        </div>
      </div>,
    )
  if (q.type === 'match')
    body.push(
      <div className="mtable" key="mt">
        <table>
          <thead>
            <tr>
              <th>List I</th>
              <th>List II</th>
            </tr>
          </thead>
          <tbody>
            {q.list1.map((a, i) => (
              <tr key={i}>
                <td>{a}</td>
                <td>{q.list2[i] || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>,
    )

  const opts = q.type === 'ar' ? AR_OPTIONS : q.options
  if (opts && q.type !== 'integer' && q.type !== 'numerical') {
    const multi = q.type === 'multiple'
    body.push(
      <div className="opts" role={multi ? 'group' : 'radiogroup'} aria-label="Options" key="opts">
        {opts.map((o, i) => {
          const on = multi ? Array.isArray(r.answer) && r.answer.indexOf(i) >= 0 : r.answer === i
          const text = lang === 'hi' && o.hi ? o.hi : o.en
          return (
            <button key={i} type="button" className={'opt' + (multi ? ' multi' : '')} role={multi ? 'checkbox' : 'radio'} aria-checked={on ? 'true' : 'false'} onClick={() => api.chooseOption(i)}>
              <span className="k">{letter(i)}</span>
              <span>
                <MathText html={esc(text)} />
              </span>
            </button>
          )
        })}
      </div>,
    )
  }

  if (q.type === 'integer' || q.type === 'numerical') {
    body.push(
      <div className="numwrap" key="num">
        <label className="sr" htmlFor="num">
          Your answer
        </label>
        <input id="num" inputMode="decimal" autoComplete="off" placeholder="Your answer" value={r.answer == null ? '' : r.answer} onChange={(e) => api.setNumeric(e.target.value)} />
        <div className="keypad" aria-label="Number keypad">
          {['7', '8', '9', '4', '5', '6', '1', '2', '3', '−', '0', '.'].map((k) => (
            <button key={k} type="button" data-key={k} onClick={() => api.pressKey(k)}>
              {k}
            </button>
          ))}
          <button type="button" className="wide" data-key="back" onClick={() => api.pressKey('back')}>
            Backspace
          </button>
        </div>
        <span style={{ fontSize: '13px', color: 'var(--muted)' }}>{q.type === 'numerical' ? 'Give the answer to 2 decimal places if needed.' : 'Whole number only.'}</span>
      </div>,
    )
  }

  const secStats = paper.sections.map((s, si) => {
    const list = flat.filter((x) => x.si === si)
    const k = countsOf(attempt, list)
    return { name: s.name, si, total: list.length, done: k.an + k.am }
  })
  const answered = c.an + c.am
  const initials = candidate.name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <section id="v-exam" className="exam">
      <div className="bar exam-top">
        <div className="in">
          <div className="exam-id">
            <svg className="tv-logo exam-logo" viewBox="0 0 1784 409" role="img" aria-label="Testverse">
              <use href="#tv-logo" />
            </svg>
            <span className="exam-sep" aria-hidden="true"></span>
            <div className="cand">
              <b id="e-title">{paper.title}</b>
              <span id="e-cand">
                {candidate.name}
                {candidate.id ? ' · ' + candidate.id : ''}
              </span>
            </div>
          </div>
          <div className="top-tools">
            <span className={'save-state' + (save.off ? ' off' : '')} id="save-state" aria-live="polite">
              <i></i>
              <span>{save.text}</span>
            </span>
            {paper.languages.length > 1 ? (
              <div className="seg on-navy" id="lang-seg" role="group" aria-label="Question language">
                {paper.languages.map((l) => (
                  <button key={l} type="button" data-lang={l} aria-pressed={lang === l ? 'true' : 'false'} onClick={() => setLang(l)}>
                    {l === 'hi' ? 'हिंदी' : 'EN'}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="font-tools" role="group" aria-label="Text size">
              <button className="tool" type="button" id="font-dn" aria-label="Smaller text" onClick={onFontDn}>
                A−
              </button>
              <button className="tool" type="button" id="font-up" aria-label="Larger text" onClick={onFontUp}>
                A+
              </button>
            </div>
            <div className={'timer' + (left <= 60000 ? ' danger' : left <= 5 * 60000 ? ' warn' : '')} id="timer" role="timer" aria-label="Time left">
              <span>Time left</span>
              <b id="t-left">{hms(left)}</b>
            </div>
          </div>
        </div>
      </div>

      <nav className="tabs" aria-label="Sections">
        <div className="in" id="sec-tabs" role="tablist">
          {paper.sections.map((s, si) => (
            <button key={si} type="button" role="tab" data-sec={si} aria-selected={f.si === si ? 'true' : 'false'} onClick={() => api.goSection(si)}>
              {s.name}
              <small>
                {secStats[si].done}/{s.questions.length}
              </small>
            </button>
          ))}
        </div>
      </nav>

      <div className="exam-body">
        <article className="qpane" aria-live="polite">
          <div className="qhead">
            <div className="qhead-l">
              <span className="qno" id="q-no">
                Question {curIndex + 1}
                <small> of {flat.length}</small>
              </span>
              {r.marked ? <span className="tag tag-mr">Marked for review</span> : null}
            </div>
            <div className="qmeta" id="q-meta">
              <span className="tag">{f.sec}</span>
              <span className="tag">{Q_TYPE_LABELS[q.type]}</span>
              <span className="tag tag-marks">
                <b>+{q.marks.correct}</b>
                <i>{String(q.marks.wrong || 0).replace('-', '−')}</i>
              </span>
            </div>
          </div>
          <div className="qbody" id="q-body" ref={qbodyRef}>
            {body}
          </div>
          <div className="qfoot">
            <div className="grp">
              <button className="btn btn-purple" type="button" id="b-mark" onClick={api.markNext}>
                Mark for review &amp; next
              </button>
              <button className="btn btn-ghost" type="button" id="b-clear" onClick={api.clearResponse}>
                Clear response
              </button>
            </div>
            <div className="grp">
              <button
                className="btn btn-outline palette-toggle"
                type="button"
                id="b-palette"
                aria-controls="side"
                aria-expanded={sideOpen ? 'true' : 'false'}
                onClick={() => setSideOpen((v) => !v)}
              >
                Questions
              </button>
              <button className="btn btn-outline" type="button" id="b-prev" disabled={curIndex === 0} onClick={api.prev}>
                Back
              </button>
              <button className="btn btn-green" type="button" id="b-next" onClick={api.next}>
                Save &amp; next
              </button>
            </div>
          </div>
        </article>

        <div className={'side-scrim' + (sideOpen ? ' open' : '')} aria-hidden="true" onClick={() => setSideOpen(false)}></div>

        <aside className={'side' + (sideOpen ? ' open' : '')} id="side" aria-label="Question palette">
          <div className="sheet-head">
            <b>Question palette</b>
            <button className="close" type="button" onClick={() => setSideOpen(false)}>
              Close
            </button>
          </div>
          <div className="side-scroll">
            <div className="cand-card">
              <span className="avatar" aria-hidden="true">
                {initials}
              </span>
              <div>
                <b>{candidate.name}</b>
                <span>{candidate.id}</span>
              </div>
              <div className="progress-num">
                <b>{answered}</b>
                <span>of {flat.length} answered</span>
              </div>
            </div>

            <div className="side-head" id="legend">
              <div>
                <span className="chip an">{c.an}</span>Answered
              </div>
              <div>
                <span className="chip na">{c.na}</span>Not answered
              </div>
              <div>
                <span className="chip nv">{c.nv}</span>Not visited
              </div>
              <div>
                <span className="chip mr">{c.mr}</span>Marked
              </div>
              <div className="wide">
                <span className="chip am">{c.am}</span>Answered &amp; marked (evaluated)
              </div>
            </div>

            <div className="grid-wrap" id="pal">
              <h3>
                {sec.name}
                <span>{sec.questions.length} questions</span>
              </h3>
              <div className="qgrid">
                {flat.map((x, i) => {
                  if (x.si !== f.si) return null
                  const st = statusOf(attempt, x.q)
                  return (
                    <button
                      key={i}
                      type="button"
                      className={'chip ' + st + (i === curIndex ? ' cur' : '')}
                      aria-label={'Question ' + (i + 1) + ', ' + STATUS_LABEL[st]}
                      aria-current={i === curIndex ? 'true' : undefined}
                      onClick={() => {
                        api.goQuestion(i)
                        setSideOpen(false)
                      }}
                    >
                      {i + 1}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="sec-list">
              <h3>All sections</h3>
              {secStats.map((s) => (
                <button
                  key={s.si}
                  type="button"
                  className={'sec-row' + (s.si === f.si ? ' on' : '')}
                  aria-current={s.si === f.si ? 'true' : undefined}
                  onClick={() => {
                    api.goSection(s.si)
                    setSideOpen(false)
                  }}
                >
                  <span className="sec-name">{s.name}</span>
                  <span className="sec-count">
                    {s.done}/{s.total}
                  </span>
                  <span className="sec-bar" aria-hidden="true">
                    <i style={{ width: (s.total ? (s.done / s.total) * 100 : 0) + '%' }}></i>
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="side-foot">
            <button className="btn btn-dark btn-block" type="button" id="b-submit" onClick={api.openSubmit}>
              Submit test
            </button>
            <span className="demo-note" id="tab-note">
              {tabNote}
            </span>
          </div>
        </aside>
      </div>
    </section>
  )
}
