import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './Test.css'
import LogoSprite from '../../components/LogoSprite.jsx'
import MathText from '../../lib/MathText.jsx'
import { esc } from '../../lib/esc.js'
import { hms } from '../../lib/format.js'
import { usePageMeta } from '../../lib/hooks.js'
import { loadJSON, removeKey, saveJSON } from '../../lib/storage.js'
import { useToast } from '../../lib/useToast.jsx'
import { PAPERS, STUDENT, flatten } from './data/papers.js'
import ExamView from './sections/ExamView.jsx'
import InstructionsView from './sections/InstructionsView.jsx'
import ResultView from './sections/ResultView.jsx'
import { countsOf } from './status.js'

function timeLeftOf(a) {
  return a.startedAt + a.durationMs - Date.now()
}

function baseResp() {
  return { answer: null, marked: false, visited: false, timeMs: 0 }
}

/* A sample finished attempt so the result page can be seen directly (design demoAttempt). */
function demoAttempt(flat, paper) {
  const picks = {}
  flat.forEach((f, i) => {
    const q = f.q
    let a
    if (i % 5 === 3) a = null
    else if (i % 4 === 1) a = q.type === 'multiple' ? [0] : q.type === 'integer' || q.type === 'numerical' ? String(q.answer + 1) : (q.answer + 1) % 4
    else a = q.type === 'integer' || q.type === 'numerical' ? String(q.answer) : q.answer
    picks[q.id] = { answer: a, marked: i === 6, visited: true, timeMs: (20 + ((i * 37) % 200)) * 1000 }
  })
  const started = Date.now() - 18 * 60000
  return { paperId: paper.id, startedAt: started, durationMs: paper.durationMin * 60000, responses: picks, current: 0, lang: 'en', tabSwitches: 0, submittedAt: started + 17 * 60000, demo: true }
}

const REPORT_REASONS = ['Wrong answer key', 'Mistake in the question', 'Wrong or unclear solution', 'Diagram missing or unclear', 'Out of syllabus']

/* design/test.html -> route "/test" (?test=P4&view=result&retake=1) */
export default function Test() {
  usePageMeta({ title: 'Test — Testverse' })

  const qs = useMemo(() => new URLSearchParams(window.location.search), [])
  const paper = PAPERS[qs.get('test')] || PAPERS.P4
  const KEY = 'tv-attempt-' + paper.id
  const flat = useMemo(() => flatten(paper), [paper])

  /* ---------- boot (design boot()) ---------- */
  const [boot] = useState(() => {
    let a = loadJSON(KEY)
    if (qs.get('view') === 'result') {
      if (!a || !a.submittedAt) a = demoAttempt(flat, paper)
      return { attempt: a, view: 'result', auto: false }
    }
    if (a && a.submittedAt) {
      if (qs.get('retake') === '1') {
        removeKey(KEY)
        return { attempt: null, view: 'instr', auto: false }
      }
      return { attempt: a, view: 'result', auto: false }
    }
    if (a && !a.submittedAt && timeLeftOf(a) <= 0) {
      const s = { ...a, submittedAt: Date.now(), autoSubmitted: true }
      saveJSON(KEY, s)
      return { attempt: s, view: 'result', auto: true }
    }
    return { attempt: a, view: 'instr', auto: false }
  })

  const [attempt, setAttempt] = useState(boot.attempt)
  const [view, setView] = useState(boot.view)
  const [lang, setLang] = useState((boot.attempt && boot.attempt.lang) || 'en')
  const [left, setLeft] = useState(() => (boot.attempt ? timeLeftOf(boot.attempt) : 0))
  const [saveText, setSaveText] = useState('Saved')
  const [sideOpen, setSideOpen] = useState(false)
  const [online, setOnline] = useState(() => navigator.onLine)
  const [reviewFilter, setReviewFilter] = useState('all')
  const [submitOpen, setSubmitOpen] = useState(false)
  const [report, setReport] = useState(null) // { q } while the report dialog is open
  const [reportReason, setReportReason] = useState('Wrong answer key')
  const [video, setVideo] = useState(null) // result item while the video dialog is open
  const [videoLeft, setVideoLeft] = useState(STUDENT.videoLeft)
  const { toast, node } = useToast()

  const curIndex = attempt && typeof attempt.current === 'number' ? attempt.current : 0
  const inProgress = !!attempt && !attempt.submittedAt

  const attemptRef = useRef(attempt)
  const curIndexRef = useRef(curIndex)
  const enteredAt = useRef(0)
  const wrapperRef = useRef(null)
  const reportNoteRef = useRef(null)
  const videoNoteRef = useRef(null)
  const submitRef = useRef(null)
  const reportDlgRef = useRef(null)
  const videoDlgRef = useRef(null)
  const submitFn = useRef(null)
  attemptRef.current = attempt
  curIndexRef.current = curIndex
  submitFn.current = submit

  const qidNow = () => flat[curIndexRef.current].q.id

  /* ---------- persistence (design persist/queueSave) ---------- */
  const write = useCallback((a) => {
    saveJSON(KEY, a)
    setSaveText(navigator.onLine ? 'Saved' : 'Offline · saved on this device')
  }, [KEY])

  useEffect(() => {
    if (view !== 'exam' || !attempt || attempt.submittedAt) return
    setSaveText('Saving…')
    const t = setTimeout(() => write(attempt), 400)
    return () => clearTimeout(t)
  }, [attempt, view, write])

  /* Adds time on the current question (design leaveCurrent). Pure: safe in updaters. */
  function addLeaveTime(a) {
    if (!enteredAt.current || !a) return a
    const t = Date.now() - enteredAt.current
    enteredAt.current = 0
    const qid = flat[curIndexRef.current].q.id
    const cur = a.responses[qid] || baseResp()
    return { ...a, responses: { ...a.responses, [qid]: { ...cur, timeMs: cur.timeMs + t } } }
  }

  function patchResp(patch) {
    const qid = qidNow()
    setAttempt((a) => {
      const cur = a.responses[qid] || baseResp()
      const merged = typeof patch === 'function' ? patch(cur) : { ...cur, ...patch }
      return { ...a, responses: { ...a.responses, [qid]: merged } }
    })
  }

  function go(i, first) {
    if (!first) setAttempt(addLeaveTime)
    const ni = Math.max(0, Math.min(flat.length - 1, i))
    setAttempt((a) => {
      const qid = flat[ni].q.id
      const cur = a.responses[qid] || baseResp()
      return { ...a, current: ni, responses: { ...a.responses, [qid]: { ...cur, visited: true } } }
    })
    enteredAt.current = Date.now()
  }

  /* ---------- exam actions ---------- */
  function chooseOption(i) {
    const q = flat[curIndexRef.current].q
    patchResp((cur) => {
      let ans
      if (q.type === 'multiple') {
        const arr = Array.isArray(cur.answer) ? cur.answer.slice() : []
        const k = arr.indexOf(i)
        if (k >= 0) arr.splice(k, 1)
        else arr.push(i)
        arr.sort()
        ans = arr.length ? arr : null
      } else {
        ans = i
      }
      return { ...cur, answer: ans }
    })
  }

  function cleanNum(q, v) {
    v = v.replace(/−/g, '-').replace(q.type === 'integer' ? /[^0-9-]/g : /[^0-9.-]/g, '')
    v = v.replace(/(?!^)-/g, '')
    const p = v.split('.')
    if (p.length > 2) v = p[0] + '.' + p.slice(1).join('')
    return v.slice(0, 12)
  }

  function setNumeric(raw) {
    const q = flat[curIndexRef.current].q
    const v = cleanNum(q, raw)
    patchResp((cur) => ({ ...cur, answer: v === '' ? null : v }))
  }

  function pressKey(k) {
    const q = flat[curIndexRef.current].q
    const cur = attemptRef.current.responses[qidNow()] || baseResp()
    let v = cur.answer == null ? '' : String(cur.answer)
    if (k === 'back') v = v.slice(0, -1)
    else if (k === '−') v = v.charAt(0) === '-' ? v.slice(1) : '-' + v
    else if (k === '.' && q.type === 'integer') return
    else v += k
    setNumeric(v)
  }

  function next() {
    patchResp({ marked: false })
    if (curIndexRef.current < flat.length - 1) go(curIndexRef.current + 1)
    else toast('Last question. Review the palette, then submit.')
  }

  function markNext() {
    patchResp({ marked: true })
    if (curIndexRef.current < flat.length - 1) go(curIndexRef.current + 1)
  }

  function clearResponse() {
    patchResp({ answer: null })
  }

  function prev() {
    if (curIndexRef.current > 0) go(curIndexRef.current - 1)
  }

  function startExam() {
    if (!navigator.onLine && !(attempt && !attempt.submittedAt)) {
      toast('Connect to the internet to start.')
      return
    }
    let a = attempt
    if (!a || a.submittedAt) {
      /* REAL APP: POST /attempts {testId} -> server creates the attempt and
         returns {attemptId, startedAt, deadline, serverNow, paper (no answers)}.
         Use deadline + (serverNow vs device clock offset) for the timer. */
      a = { paperId: paper.id, startedAt: Date.now(), durationMs: paper.durationMin * 60000, responses: {}, current: 0, lang, tabSwitches: 0, submittedAt: null }
    }
    const qi = a.current || 0
    const qid = flat[qi].q.id
    const cur = a.responses[qid] || baseResp()
    a = { ...a, lang, responses: { ...a.responses, [qid]: { ...cur, visited: true } } }
    attemptRef.current = a
    setAttempt(a)
    write(a)
    enteredAt.current = Date.now()
    setView('exam')
  }

  function submit(auto) {
    let a = addLeaveTime(attemptRef.current)
    a = { ...a, submittedAt: Date.now(), autoSubmitted: !!auto }
    enteredAt.current = 0
    attemptRef.current = a
    setAttempt(a)
    write(a)
    setSubmitOpen(false)
    setView('result')
    if (auto) toast('Time is up. Your test was submitted automatically.')
  }

  function openSubmit() {
    let a = addLeaveTime(attemptRef.current)
    a = { ...a }
    attemptRef.current = a
    setAttempt(a)
    enteredAt.current = Date.now()
    setSubmitOpen(true)
  }

  /* ---------- font size (--qsize lives on the scoped page root) ---------- */
  function font(delta) {
    const el = wrapperRef.current
    if (!el) return
    const s = parseInt(getComputedStyle(el).getPropertyValue('--qsize'), 10) || 17
    el.style.setProperty('--qsize', Math.min(24, Math.max(14, s + delta)) + 'px')
  }

  /* ---------- global effects ---------- */
  // Timer: always computed from start time + duration, never by counting down.
  useEffect(() => {
    if (view !== 'exam' || !inProgress) return undefined
    const tick = () => {
      const a = attemptRef.current
      if (!a || a.submittedAt) return
      const l = timeLeftOf(a)
      setLeft(l)
      if (l <= 5 * 60000 && !a.warned5) {
        const n = { ...a, warned5: true }
        attemptRef.current = n
        setAttempt(n)
        toast('5 minutes left.')
      }
      if (l <= 0) submitFn.current(true)
    }
    tick()
    const id = setInterval(tick, 500)
    return () => clearInterval(id)
  }, [view, inProgress, toast])

  // View switch → scroll to top (design show())
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [view])

  // Keyboard shortcuts (desktop): 1–4 / A–D choose, N next, P previous, M mark
  useEffect(() => {
    function onKey(e) {
      if (view !== 'exam') return
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || document.querySelector('dialog[open]')) return
      const k = e.key.toLowerCase()
      let idx = '1234'.indexOf(k)
      if (idx < 0) idx = 'abcd'.indexOf(k)
      if (idx >= 0) {
        chooseOption(idx)
        e.preventDefault()
      } else if (k === 'n') next()
      else if (k === 'p' && curIndex > 0) prev()
      else if (k === 'm') markNext()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  // Tab / app switch logging
  useEffect(() => {
    function onVis() {
      if (view !== 'exam') return
      const a = attemptRef.current
      if (!a || a.submittedAt) return
      if (document.hidden) {
        const n = { ...addLeaveTime(a), tabSwitches: (a.tabSwitches || 0) + 1 }
        attemptRef.current = n
        setAttempt(n)
      } else {
        enteredAt.current = Date.now()
        setLeft(timeLeftOf(attemptRef.current))
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  })

  // No copying / right-click during the test
  useEffect(() => {
    function block(e) {
      if (view === 'exam' && !e.target.closest('input')) e.preventDefault()
    }
    ;['copy', 'cut', 'contextmenu'].forEach((ev) => document.addEventListener(ev, block))
    return () => ['copy', 'cut', 'contextmenu'].forEach((ev) => document.removeEventListener(ev, block))
  }, [view])

  // Save when connectivity changes (design online/offline listeners)
  useEffect(() => {
    function sync() {
      setOnline(navigator.onLine)
      if (view === 'exam' && attemptRef.current && !attemptRef.current.submittedAt) write(attemptRef.current)
    }
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    return () => {
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', sync)
    }
  }, [view, write])

  // Warn before leaving an unfinished test, flushing the current answer first
  useEffect(() => {
    function onUnload(e) {
      if (view !== 'exam') return
      const a = attemptRef.current
      if (!a || a.submittedAt) return
      saveJSON(KEY, addLeaveTime(a))
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  })

  // Same flush when leaving through a <Link>: in-app navigation skips beforeunload
  // and the unmount clears the pending debounced save
  const viewRef = useRef(view)
  const addLeaveTimeRef = useRef(addLeaveTime)
  viewRef.current = view
  addLeaveTimeRef.current = addLeaveTime
  useEffect(() => {
    return () => {
      if (viewRef.current !== 'exam') return
      const a = attemptRef.current
      if (!a || a.submittedAt) return
      saveJSON(KEY, addLeaveTimeRef.current(a))
    }
  }, [KEY])

  // Dialogs (design showModal/close)
  useEffect(() => {
    const d = submitRef.current
    if (!d) return
    if (submitOpen && !d.open) d.showModal()
    if (!submitOpen && d.open) d.close()
  }, [submitOpen])
  useEffect(() => {
    const d = reportDlgRef.current
    if (!d) return
    if (report && !d.open) d.showModal()
    if (!report && d.open) d.close()
    if (report && reportNoteRef.current) reportNoteRef.current.value = ''
  }, [report])
  useEffect(() => {
    const d = videoDlgRef.current
    if (!d) return
    if (video && !d.open) d.showModal()
    if (!video && d.open) d.close()
    if (video && videoNoteRef.current) videoNoteRef.current.value = ''
  }, [video])

  // First render after auto-submit at boot
  useEffect(() => {
    if (boot.auto) toast('Time is up. Your test was submitted automatically.')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sectionCounts = attempt ? paper.sections.map((s, si) => countsOf(attempt, flat.filter((f) => f.si === si))) : []
  const tabNote = attempt && attempt.tabSwitches ? `You left the test ${attempt.tabSwitches} time${attempt.tabSwitches === 1 ? '' : 's'}. This is recorded.` : ''

  const api = {
    chooseOption,
    setNumeric,
    pressKey,
    next,
    markNext,
    clearResponse,
    prev,
    goQuestion: (i) => go(i),
    goSection: (si) => go(flat.findIndex((f) => f.si === si)),
    openSubmit,
  }

  return (
    <div className="tv-test" ref={wrapperRef}>
      <LogoSprite />

      {view === 'instr' ? (
        <InstructionsView paper={paper} flat={flat} attempt={attempt} lang={lang} setLang={setLang} onStart={startExam} online={online} />
      ) : null}

      {view === 'exam' && attempt ? (
        <ExamView
          paper={paper}
          flat={flat}
          attempt={attempt}
          lang={lang}
          setLang={(l) => {
            setLang(l)
            setAttempt((a) => (a && !a.submittedAt ? { ...a, lang: l } : a))
          }}
          curIndex={curIndex}
          left={left}
          saveText={saveText}
          sideOpen={sideOpen}
          setSideOpen={setSideOpen}
          tabNote={tabNote}
          onFontUp={() => font(1)}
          onFontDn={() => font(-1)}
          api={api}
        />
      ) : null}

      {view === 'result' && attempt ? (
        <ResultView paper={paper} flat={flat} attempt={attempt} reviewFilter={reviewFilter} setReviewFilter={setReviewFilter} onReport={(n) => setReport({ q: n })} onVideo={(it) => setVideo(it)} />
      ) : null}

      {/* Submit confirm */}
      <dialog id="d-submit" ref={submitRef} aria-labelledby="ds-t" onCancel={() => setSubmitOpen(false)}>
        <div className="dh">
          <h2 id="ds-t">Submit the test?</h2>
          <button className="close" type="button" aria-label="Close" onClick={() => setSubmitOpen(false)}>
            Close
          </button>
        </div>
        <div className="db" id="ds-body">
          {attempt ? (
            <>
              <p>
                You still have <b>{hms(timeLeftOf(attempt))}</b>. Once submitted, you can’t change your answers.
              </p>
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Section</th>
                      <th>Answered</th>
                      <th>Not answered</th>
                      <th>Marked</th>
                      <th>Not visited</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paper.sections.map((s, si) => {
                      const c = sectionCounts[si]
                      return (
                        <tr key={s.name}>
                          <td>{s.name}</td>
                          <td>{c.an + c.am}</td>
                          <td>{c.na}</td>
                          <td>{c.mr + c.am}</td>
                          <td>{c.nv}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--muted)' }}>Answered and marked questions are evaluated. Marked questions without an answer are not.</p>
            </>
          ) : null}
        </div>
        <div className="df">
          <button className="btn btn-outline" type="button" onClick={() => setSubmitOpen(false)}>
            Go back to the test
          </button>
          <button className="btn btn-dark" type="button" id="ds-yes" onClick={() => submit(false)}>
            Yes, submit
          </button>
        </div>
      </dialog>

      {/* Report problem */}
      <dialog id="d-report" ref={reportDlgRef} aria-labelledby="dr-t" onCancel={() => setReport(null)}>
        <div className="dh">
          <h2 id="dr-t">{report ? `Report a problem with Q.${report.q}` : 'Report a problem'}</h2>
          <button className="close" type="button" aria-label="Close" onClick={() => setReport(null)}>
            Close
          </button>
        </div>
        <div className="db">
          <div className="choices" id="dr-reasons" role="group" aria-label="What's wrong">
            {REPORT_REASONS.map((r) => (
              <button key={r} type="button" aria-pressed={r === reportReason ? 'true' : 'false'} onClick={() => setReportReason(r)}>
                {r}
              </button>
            ))}
          </div>
          <div>
            <label className="l" htmlFor="dr-note">
              Details (optional)
            </label>
            <textarea className="input" id="dr-note" ref={reportNoteRef} placeholder="e.g. The answer should be option 3, because…"></textarea>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--muted)' }}>Our team checks every report. If the answer key was wrong, your score is corrected automatically.</p>
        </div>
        <div className="df">
          <button className="btn btn-outline" type="button" onClick={() => setReport(null)}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            type="button"
            id="dr-send"
            onClick={() => {
              /* REAL APP: POST /reports {testId, questionId, reason, note} -> admin "Reported questions" */
              const n = report.q
              setReport(null)
              toast(`Thanks. We’ll check Q.${n} and let you know.`)
            }}
          >
            Send report
          </button>
        </div>
      </dialog>

      {/* Video request */}
      <dialog id="d-video" ref={videoDlgRef} aria-labelledby="dv-t" onCancel={() => setVideo(null)}>
        <div className="dh">
          <h2 id="dv-t">Request a video solution</h2>
          <button className="close" type="button" aria-label="Close" onClick={() => setVideo(null)}>
            Close
          </button>
        </div>
        <div className="db">
          <div className="notice n-info" id="dv-q">
            {video ? (
              <>
                <b>Q.{video.n}</b> · {video.f.sec} · {video.f.q.chapter}
                <br />
                <MathText html={esc(video.f.q.text ? (video.f.q.text.en || '') : '')} />
              </>
            ) : null}
          </div>
          <div>
            <label className="l" htmlFor="dv-note">
              What's confusing you? (optional)
            </label>
            <textarea className="input" id="dv-note" ref={videoNoteRef} placeholder="e.g. I don't understand step 2"></textarea>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--muted)' }} id="dv-limit">
            You can send {videoLeft} more request{videoLeft === 1 ? '' : 's'} this week. We reply within {STUDENT.videoHours} hours, in the app and on WhatsApp.
          </p>
        </div>
        <div className="df">
          <button className="btn btn-outline" type="button" onClick={() => setVideo(null)}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            type="button"
            id="dv-send"
            onClick={() => {
              /* REAL APP: POST /video-requests {source:'test', testId, questionId, note} -> admin "Video requests" */
              if (videoLeft <= 0) {
                toast('You’ve used all your requests this week.')
                return
              }
              const n = video.n
              setVideoLeft((v) => v - 1)
              setVideo(null)
              toast(`Request sent for Q.${n}. We’ll notify you when the video is ready.`)
            }}
          >
            Send request
          </button>
        </div>
      </dialog>

      {node}
    </div>
  )
}
