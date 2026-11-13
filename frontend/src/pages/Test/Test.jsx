import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Test.css'
import LogoSprite from '../../components/LogoSprite.jsx'
import { api } from '../../lib/api.js'
import { fmt, hms } from '../../lib/format.js'
import { usePageMeta } from '../../lib/hooks.js'
import { getToken, loadSession } from '../../lib/session.js'
import { loadJSON, removeKey, saveJSON } from '../../lib/storage.js'
import { useToast } from '../../lib/useToast.jsx'
import ExamView from './sections/ExamView.jsx'
import InstructionsView from './sections/InstructionsView.jsx'
import { countsOf } from './status.js'
import { attemptOf, flatten, paperOf } from './testData.js'
import BackButton from '../../components/BackButton.jsx'

const BASE = import.meta.env.VITE_API_URL || ''
const SAVE_DEBOUNCE_MS = 4000
const RETRY_MS = 15000

const SAVE = {
  saving: { text: 'Saving…', off: false },
  saved: { text: 'Saved', off: false },
  offline: { text: 'Offline · saved on this device', off: true },
  failed: { text: 'Not synced yet · saved on this device', off: true },
}

function baseResp() {
  return { answer: null, marked: false, visited: false, timeMs: 0 }
}

/*
  design/test.html -> route "/test?test=<id>" (or &retake=1 to take a
  submitted test again). Results live in the dashboard
  (/student/result, ResultPage.jsx): after submitting, and for old
  &view=result[&attempt=n] links, this page sends the student there.
  The paper, clock and attempt live on the server (backend/controllers/
  testsController.js). The browser keeps a backup of the attempt in
  localStorage and pushes answers to PUT /attempt; the server's deadline
  (corrected for this device's clock) drives the timer.
*/
export default function Test() {
  usePageMeta({ title: 'Test — Testverse' })
  const routerNavigate = useNavigate()

  const qs = useMemo(() => new URLSearchParams(window.location.search), [])
  const testId = qs.get('test') || ''
  const wantResult = qs.get('view') === 'result'
  const wantRetake = qs.get('retake') === '1'
  const KEY = 'tv-attempt-' + testId
  const PATH = '/tests/' + encodeURIComponent(testId)
  const RESULT_PATH = PATH + '/result' + (qs.get('attempt') ? '?attempt=' + encodeURIComponent(qs.get('attempt')) : '')

  const [view, setView] = useState('loading') // loading | error | instr | exam
  const [problem, setProblem] = useState(null) // { title, text, retry? } in the error view
  const [paper, setPaper] = useState(null)
  const [attempt, setAttempt] = useState(null)
  const [retakeNo, setRetakeNo] = useState(0) // the attempt number a retake will start, 0 if not retaking
  const [blocked, setBlocked] = useState(null) // { opensAt } while the test hasn't opened
  const [starting, setStarting] = useState(false)
  const [lang, setLang] = useState('en')
  const [left, setLeft] = useState(0)
  const [save, setSave] = useState(SAVE.saved)
  const [sideOpen, setSideOpen] = useState(false)
  const [online, setOnline] = useState(() => navigator.onLine)
  const [submitOpen, setSubmitOpen] = useState(false)
  const [submitState, setSubmitState] = useState(null) // { status: 'sending' | 'failed', auto, msg }
  const [bootKey, setBootKey] = useState(0)
  const { toast, node } = useToast()

  const flat = useMemo(() => (paper ? flatten(paper) : []), [paper])
  const account = loadSession()
  const candidate = { name: (account && account.name) || 'Student', id: (account && account.email) || '' }

  const curIndex = attempt && typeof attempt.current === 'number' ? attempt.current : 0
  const inProgress = !!attempt && !attempt.submittedAt

  const attemptRef = useRef(attempt)
  const flatRef = useRef(flat)
  const viewRef = useRef(view)
  const curIndexRef = useRef(curIndex)
  const enteredAt = useRef(0)
  const wrapperRef = useRef(null)
  const submitDlgRef = useRef(null)
  const offsetRef = useRef(0) // server clock − device clock, ms
  const verRef = useRef(0) // bumped on every change to the attempt
  const syncedVerRef = useRef(0) // last version the server confirmed
  const inflightRef = useRef(false)
  const againRef = useRef(false)
  const debounceRef = useRef(null)
  const lastCurRef = useRef(null)
  const submittingRef = useRef(false)
  const failedRef = useRef(null) // the failed submit's `auto`, to retry it
  const fnRef = useRef({})
  attemptRef.current = attempt
  flatRef.current = flat
  viewRef.current = view
  curIndexRef.current = curIndex

  const serverNow = () => Date.now() + offsetRef.current
  const syncClock = (iso) => {
    const t = Date.parse(iso)
    if (Number.isFinite(t)) offsetRef.current = t - Date.now()
  }
  const qidNow = () => flatRef.current[curIndexRef.current].q.id

  /* ---------- device backup ---------- */
  function saveLocal(a, pending) {
    if (!a || a.submittedAt) return
    saveJSON(KEY, { startedAt: a.startedAt, responses: a.responses, current: a.current, lang: a.lang, tabSwitches: a.tabSwitches, warned5: a.warned5, pending })
  }

  /* ---------- result: shown in the dashboard ---------- */
  // `fresh` = this page just submitted it (opens the "Test submitted" pop-up there; auto = time ran out)
  function showResult(d, message, fresh) {
    clearTimeout(debounceRef.current)
    // The attempt is submitted: nothing left to autosave or flush on the way out
    attemptRef.current = attemptOf(d.attempt, null, flatten(paperOf(d.test)).length)
    failedRef.current = null
    removeKey(KEY)
    routerNavigate('/student/result?test=' + encodeURIComponent(testId) + '&attempt=' + (d.attempt.attemptNo || 1), {
      replace: true,
      state: fresh ? { submitted: { auto: !!fresh.auto } } : message ? { notice: message } : null,
    })
  }

  function fail(title, text, retry) {
    setProblem({ title, text, retry: !!retry })
    setView('error')
  }

  function failFrom(e) {
    if (e.status === 401) {
      routerNavigate('/login?next=' + encodeURIComponent('/test?test=' + testId), { replace: true })
      return
    }
    if (e.status === 404) return fail('Test not found', 'This test doesn’t exist or isn’t published any more.')
    if (e.status === 0) return fail('You’re offline', 'Connect to the internet to open this test.', true)
    fail('Couldn’t open the test', e.message, true)
  }

  /* ---------- boot: details, status and any attempt from the server ---------- */
  useEffect(() => {
    let alive = true
    async function boot() {
      if (!testId) return fail('No test selected', 'Open a test from your dashboard.')
      const token = getToken()
      try {
        if (wantResult) {
          try {
            const r = await api(RESULT_PATH, { token })
            if (alive) showResult(r)
            return
          } catch (e) {
            if (e.status !== 409) throw e
          }
        }
        const d = await api(PATH, { token })
        if (!alive) return
        syncClock(d.serverNow)
        const p = paperOf(d.test)
        if (d.status === 'done' && wantRetake && d.canRetake) {
          // A fresh attempt: the instructions again, with no clock until Start
          setPaper(p)
          setRetakeNo((d.attempt.attemptNo || 1) + 1)
          setView('instr')
          return
        }
        if (d.status === 'done') {
          const r = await api(RESULT_PATH, { token })
          if (alive) showResult(r)
          return
        }
        setPaper(p)
        if (d.status === 'closed') {
          return fail('This test has closed', d.test.closesAt ? `It closed on ${fmt(d.test.closesAt)}. Look out for the next one on your dashboard.` : 'Look out for the next one on your dashboard.')
        }
        if (d.attempt) {
          const a = attemptOf(d.attempt, loadJSON(KEY), flatten(p).length)
          attemptRef.current = a
          setAttempt(a)
          setLang(a.lang)
          setLeft(a.deadline - serverNow())
        } else {
          setBlocked(d.status === 'upcoming' ? { opensAt: d.test.opensAt } : null)
        }
        setView('instr')
      } catch (e) {
        if (alive) failFrom(e)
      }
    }
    setView('loading')
    boot()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bootKey])

  /* ---------- server autosave ---------- */
  async function pushSave() {
    const a = attemptRef.current
    if (!a || a.submittedAt || submittingRef.current || viewRef.current !== 'exam') return
    if (syncedVerRef.current >= verRef.current) return
    if (inflightRef.current) {
      againRef.current = true
      return
    }
    inflightRef.current = true
    const ver = verRef.current
    try {
      const d = await api(PATH + '/attempt', { method: 'PUT', body: { responses: a.responses }, token: getToken() })
      syncClock(d.serverNow)
      syncedVerRef.current = Math.max(syncedVerRef.current, ver)
      if (syncedVerRef.current >= verRef.current) {
        setSave(SAVE.saved)
        saveLocal(attemptRef.current, false)
      }
    } catch (e) {
      if (e.status === 409 && e.data && e.data.submitted && e.data.test) {
        showResult(e.data, e.message)
        return
      }
      setSave(e.status === 0 ? SAVE.offline : SAVE.failed)
    } finally {
      inflightRef.current = false
      if (againRef.current) {
        againRef.current = false
        fnRef.current.pushSave()
      }
    }
  }

  /* Last-chance save while the page goes away: fetch keepalive outlives the page. */
  function flushOnLeave() {
    const a = attemptRef.current
    if (viewRef.current !== 'exam' || !a || a.submittedAt) return
    const b = fnRef.current.addLeaveTime(a)
    saveLocal(b, syncedVerRef.current < verRef.current || b !== a)
    const token = getToken()
    if (!token || syncedVerRef.current >= verRef.current) return
    try {
      fetch(BASE + '/api' + PATH + '/attempt', {
        method: 'PUT',
        keepalive: true,
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ responses: b.responses }),
      }).catch(() => {})
    } catch {
      /* the backup in localStorage is still there */
    }
  }

  // Every change: back up on this device at once, push to the server after a
  // pause, or straight away when the student moves to another question.
  useEffect(() => {
    if (view !== 'exam' || !attempt || attempt.submittedAt) return
    verRef.current++
    saveLocal(attempt, true)
    setSave(navigator.onLine ? SAVE.saving : SAVE.offline)
    if (lastCurRef.current !== attempt.current) {
      lastCurRef.current = attempt.current
      setTimeout(() => fnRef.current.pushSave(), 0)
    }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fnRef.current.pushSave(), SAVE_DEBOUNCE_MS)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, view])

  /* Adds time on the current question (design leaveCurrent). Pure: safe in updaters. */
  function addLeaveTime(a) {
    if (!enteredAt.current || !a) return a
    const t = Date.now() - enteredAt.current
    enteredAt.current = 0
    const qid = flatRef.current[curIndexRef.current].q.id
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

  function go(i) {
    const ni = Math.max(0, Math.min(flat.length - 1, i))
    // Time on the question being left is measured now, not inside the updater
    const from = flat[curIndexRef.current].q.id
    const spent = enteredAt.current ? Date.now() - enteredAt.current : 0
    enteredAt.current = Date.now()
    setAttempt((a) => {
      let responses = a.responses
      if (spent) {
        const prevR = responses[from] || baseResp()
        responses = { ...responses, [from]: { ...prevR, timeMs: prevR.timeMs + spent } }
      }
      const qid = flat[ni].q.id
      const cur = responses[qid] || baseResp()
      return { ...a, current: ni, responses: { ...responses, [qid]: { ...cur, visited: true } } }
    })
  }

  /* ---------- exam actions ---------- */
  function chooseOption(i) {
    const q = flat[curIndexRef.current].q
    if (!q.options || i >= q.options.length) return
    patchResp((cur) => {
      let ans
      if (q.type === 'multiple') {
        const arr = Array.isArray(cur.answer) ? cur.answer.slice() : []
        const k = arr.indexOf(i)
        if (k >= 0) arr.splice(k, 1)
        else arr.push(i)
        arr.sort((x, y) => x - y)
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

  function enterExam(a) {
    const qi = Math.min(a.current || 0, flat.length - 1)
    const qid = flat[qi].q.id
    const cur = a.responses[qid] || baseResp()
    a = { ...a, current: qi, responses: { ...a.responses, [qid]: { ...cur, visited: true } } }
    attemptRef.current = a
    lastCurRef.current = qi
    setAttempt(a)
    setLeft(a.deadline - serverNow())
    enteredAt.current = Date.now()
    setView('exam')
  }

  // Start (or resume): the server creates the attempt and owns the clock.
  async function startExam() {
    if (starting) return
    if (!navigator.onLine) {
      toast('Connect to the internet to start.')
      return
    }
    setStarting(true)
    try {
      const d = await api(PATH + '/start', { method: 'POST', body: retakeNo ? { retake: true } : {}, token: getToken() })
      syncClock(d.serverNow)
      const a = attemptOf(d.attempt, loadJSON(KEY), flat.length)
      setBlocked(null)
      if (retakeNo) {
        // Reloading now should resume this attempt, not offer yet another retake
        window.history.replaceState(window.history.state, '', '/test?test=' + encodeURIComponent(testId))
        setRetakeNo(0)
      }
      enterExam({ ...a, lang })
    } catch (e) {
      if (e.status === 409) {
        try {
          showResult(await api(RESULT_PATH, { token: getToken() }), e.message)
        } catch (err) {
          failFrom(err)
        }
      } else if (e.status === 403 && e.data.opensAt) {
        setBlocked({ opensAt: e.data.opensAt })
        toast(e.message)
      } else if (e.status === 403) {
        fail('This test has closed', e.data.closesAt ? `It closed on ${fmt(e.data.closesAt)}.` : e.message)
      } else if (e.status === 401) {
        failFrom(e)
      } else {
        toast(e.message, 4000)
      }
    } finally {
      setStarting(false)
    }
  }

  // Submit (button or timer). Answers stay in the backup until the server confirms.
  async function submit(auto) {
    if (submittingRef.current) return
    submittingRef.current = true
    failedRef.current = null
    clearTimeout(debounceRef.current)
    let a = attemptRef.current
    if (viewRef.current === 'exam') {
      a = addLeaveTime(a)
      enteredAt.current = Date.now()
    }
    attemptRef.current = a
    setAttempt(a)
    saveLocal(a, true)
    setSubmitOpen(true)
    setSubmitState({ status: 'sending', auto: !!auto })
    try {
      const d = await api(PATH + '/submit', { body: { responses: a.responses, auto: !!auto }, token: getToken() })
      showResult(d, null, { auto: !!auto })
    } catch (e) {
      if (e.data && e.data.test && e.data.attempt) {
        // Time ran out before this reached the server (e.g. the laptop slept), so it submitted
        // the saved answers itself: still a fresh submit for this student, with the time's-up pop-up
        if (e.data.attempt.autoSubmitted) showResult(e.data, null, { auto: true })
        else showResult(e.data, e.message)
      } else if (e.status === 401) {
        failFrom(e)
      } else {
        failedRef.current = { auto: !!auto }
        setSubmitState({ status: 'failed', auto: !!auto, msg: e.status === 0 ? 'You seem to be offline.' : e.message })
      }
    } finally {
      submittingRef.current = false
    }
  }

  function openSubmit() {
    const a = addLeaveTime(attemptRef.current)
    attemptRef.current = a
    setAttempt(a)
    enteredAt.current = Date.now()
    setSubmitState(null)
    setSubmitOpen(true)
  }

  function closeSubmit() {
    if (submittingRef.current || left <= 0) return
    failedRef.current = null
    setSubmitState(null)
    setSubmitOpen(false)
  }

  fnRef.current = { pushSave, submit, addLeaveTime, flushOnLeave }

  /* ---------- font size (--qsize lives on the scoped page root) ---------- */
  function font(delta) {
    const el = wrapperRef.current
    if (!el) return
    const s = parseInt(getComputedStyle(el).getPropertyValue('--qsize'), 10) || 17
    el.style.setProperty('--qsize', Math.min(24, Math.max(14, s + delta)) + 'px')
  }

  /* ---------- global effects ---------- */
  // Timer: the server's deadline against the server's clock (device clock + offset).
  useEffect(() => {
    if (!inProgress || (view !== 'exam' && view !== 'instr')) return undefined
    const tick = () => {
      const a = attemptRef.current
      if (!a || a.submittedAt) return
      const l = a.deadline - serverNow()
      setLeft(l)
      if (viewRef.current === 'exam' && l <= 5 * 60000 && l > 0 && !a.warned5 && a.durationMs > 5 * 60000) {
        const n = { ...a, warned5: true }
        attemptRef.current = n
        setAttempt(n)
        toast('5 minutes left.')
      }
      if (l <= 0 && !failedRef.current) fnRef.current.submit(true)
    }
    tick()
    const id = setInterval(tick, 500)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, inProgress, toast])

  // Retry unsynced answers and failed submits now and then.
  useEffect(() => {
    if (view !== 'exam') return undefined
    const id = setInterval(() => {
      if (failedRef.current) fnRef.current.submit(failedRef.current.auto)
      else fnRef.current.pushSave()
    }, RETRY_MS)
    return () => clearInterval(id)
  }, [view])

  // View switch → scroll to top (design show())
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [view])

  // Keyboard shortcuts (desktop): 1–4 / A–D choose, N next, P previous, M mark
  useEffect(() => {
    function onKey(e) {
      if (view !== 'exam') return
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || document.querySelector('dialog[open]')) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const k = e.key.toLowerCase()
      let idx = '123456'.indexOf(k)
      if (idx < 0) idx = 'abcdef'.indexOf(k)
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

  // Tab / app switch: log it and save to the server while the page is hidden
  useEffect(() => {
    function onVis() {
      if (view !== 'exam') return
      const a = attemptRef.current
      if (!a || a.submittedAt) return
      if (document.hidden) {
        const n = { ...addLeaveTime(a), tabSwitches: (a.tabSwitches || 0) + 1 }
        attemptRef.current = n
        verRef.current++
        saveLocal(n, true)
        setAttempt(n)
        pushSave()
      } else {
        enteredAt.current = Date.now()
        setLeft(attemptRef.current.deadline - serverNow())
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

  // Connectivity: show it, and sync (or finish a failed submit) when it's back
  useEffect(() => {
    function sync() {
      setOnline(navigator.onLine)
      if (viewRef.current !== 'exam') return
      if (!navigator.onLine) {
        setSave(SAVE.offline)
        return
      }
      if (failedRef.current) fnRef.current.submit(failedRef.current.auto)
      else fnRef.current.pushSave()
    }
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    return () => {
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', sync)
    }
  }, [])

  // Warn before leaving an unfinished test, saving the latest answers first
  useEffect(() => {
    function onUnload(e) {
      if (view !== 'exam') return
      const a = attemptRef.current
      if (!a || a.submittedAt) return
      flushOnLeave()
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  })

  // Same flush when leaving through a <Link>: in-app navigation skips beforeunload
  useEffect(() => {
    const fns = fnRef
    const deb = debounceRef
    return () => {
      clearTimeout(deb.current)
      fns.current.flushOnLeave()
    }
  }, [])

  // Submit dialog (design showModal/close)
  useEffect(() => {
    const d = submitDlgRef.current
    if (!d) return
    if (submitOpen && !d.open) d.showModal()
    if (!submitOpen && d.open) d.close()
  }, [submitOpen])

  const sectionCounts = attempt && paper ? paper.sections.map((s, si) => countsOf(attempt, flat.filter((f) => f.si === si))) : []
  const tabNote = attempt && attempt.tabSwitches ? `You left the test ${attempt.tabSwitches} time${attempt.tabSwitches === 1 ? '' : 's'}. This is recorded.` : ''
  const sending = submitState && submitState.status === 'sending'
  const failed = submitState && submitState.status === 'failed'
  const timeUp = inProgress && left <= 0

  const examApi = {
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

      {view === 'loading' || view === 'error' ? (
        <StateView
          problem={view === 'error' ? problem : null}
          onRetry={() => {
            setProblem(null)
            setBootKey((k) => k + 1)
          }}
        />
      ) : null}

      {view === 'instr' && paper ? (
        <InstructionsView
          paper={paper}
          flat={flat}
          attempt={attempt}
          left={left}
          lang={lang}
          setLang={setLang}
          onStart={startExam}
          starting={starting}
          online={online}
          blocked={blocked}
          offset={offsetRef.current}
          retakeNo={retakeNo}
        />
      ) : null}

      {view === 'exam' && attempt && paper ? (
        <ExamView
          paper={paper}
          flat={flat}
          attempt={attempt}
          candidate={candidate}
          lang={lang}
          setLang={(l) => {
            setLang(l)
            setAttempt((a) => (a && !a.submittedAt ? { ...a, lang: l } : a))
          }}
          curIndex={curIndex}
          left={left}
          save={save}
          sideOpen={sideOpen}
          setSideOpen={setSideOpen}
          tabNote={tabNote}
          onFontUp={() => font(1)}
          onFontDn={() => font(-1)}
          api={examApi}
        />
      ) : null}

      {/* Submit confirm / progress / retry */}
      <dialog
        id="d-submit"
        ref={submitDlgRef}
        aria-labelledby="ds-t"
        onCancel={(e) => {
          e.preventDefault()
          closeSubmit()
        }}
      >
        <div className="dh">
          <h2 id="ds-t">{sending ? 'Submitting your test…' : failed ? 'Your test isn’t submitted yet' : timeUp ? 'Time is up' : 'Submit the test?'}</h2>
          {!sending && !timeUp ? (
            <button className="close" type="button" aria-label="Close" onClick={closeSubmit}>
              Close
            </button>
          ) : null}
        </div>
        <div className="db" id="ds-body">
          {sending ? (
            <p>{submitState.auto ? 'Time is up. Sending your answers…' : 'Sending your answers. Please keep this page open.'}</p>
          ) : failed ? (
            <div className="notice n-warn" role="alert">
              <b>We couldn’t reach Testverse.</b> {submitState.msg} Your answers are saved on this device; we’ll keep trying, or press Try again.
            </div>
          ) : attempt && paper ? (
            <>
              <p>
                You still have <b>{hms(left)}</b>. Once submitted, you can’t change your answers.
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
        {!sending ? (
          <div className="df">
            {!timeUp ? (
              <button className="btn btn-outline" type="button" onClick={closeSubmit}>
                Go back to the test
              </button>
            ) : null}
            <button className="btn btn-dark" type="button" id="ds-yes" onClick={() => submit(failed ? submitState.auto : timeUp)}>
              {failed ? 'Try again' : 'Yes, submit'}
            </button>
          </div>
        ) : null}
      </dialog>

      {node}
    </div>
  )
}

/* Loading, and every state where the test can't be shown (not found, closed, offline …). */
function StateView({ problem, onRetry }) {
  return (
    <section className="state-view">
      <header className="bar">
        <div className="in">
          <Link className="brand" to="/student">
            <svg className="tv-logo" style={{ height: '32px' }} viewBox="0 0 1784 409" role="img" aria-label="Testverse by Studyverse">
              <use href="#tv-logo" />
            </svg>
          </Link>
        </div>
      </header>
      <div className="state-body">
        {problem ? (
          <div className="state-card" role="alert">
            <BackButton to="/student">Back to dashboard</BackButton>
            <h1>{problem.title}</h1>
            <p>{problem.text}</p>
            <div className="state-actions">
              {problem.retry ? (
                <button className="btn btn-primary" type="button" onClick={onRetry}>
                  Try again
                </button>
              ) : null}
              <Link className={'btn ' + (problem.retry ? 'btn-outline' : 'btn-primary')} to="/student">
                Go to your dashboard
              </Link>
            </div>
          </div>
        ) : (
          <div className="state-card is-loading" role="status" aria-live="polite">
            <span className="spinner" aria-hidden="true"></span>
            <p>Loading your test…</p>
          </div>
        )}
      </div>
    </section>
  )
}
