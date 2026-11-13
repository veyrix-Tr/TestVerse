import BackButton from '../../components/BackButton.jsx'
import { useEffect, useRef, useState } from 'react'
import AudienceEditor from './AudienceEditor.jsx'
import PaperPreview from './PaperPreview.jsx'
import { EVERYONE, audienceBody, audienceFrom } from './studentsApi.js'
import {
  DEFAULT_MARKING,
  TYPES,
  createTest,
  fromLocalInput,
  getTest,
  setPublished,
  signed,
  toLocalInput,
  updateTest,
  validatePaper,
} from './testsApi.js'

/*
  Create / edit a test: details, marking scheme, instructions, question paper
  (pasted or uploaded JSON, checked as you type) and a preview of the parsed
  questions. One scrolling page with a sticky action bar.

  `kind` decides what the form asks for (an existing test keeps its own kind):
    free   – open to every student; optional opening / closing time.
    live   – needs a start time; "Who can take this test" picks the audience.
    series – stored inside the test series `seriesId`: no timing, no audience
             and no publishing yet (students don't see series tests).
*/

const EXAMS = [
  ['', 'None'],
  ['jee', 'JEE'],
  ['neet', 'NEET'],
]

const markingToForm = (m) =>
  Object.fromEntries(
    TYPES.map(({ key }) => {
      const src = { ...DEFAULT_MARKING[key], ...((m && m[key]) || {}) }
      const row = { correct: String(src.correct), wrong: String(src.wrong) }
      if (key === 'multiple') row.partial = src.partial !== false
      return [key, row]
    }),
  )

const markingFromForm = (f) =>
  Object.fromEntries(
    TYPES.map(({ key }) => {
      const r = f[key]
      const out = { correct: r.correct === '' ? NaN : Number(r.correct), wrong: r.wrong === '' ? NaN : Number(r.wrong) }
      if (key === 'multiple') out.partial = !!r.partial
      return [key, out]
    }),
  )

function defaultInstructions(minutes, f) {
  const m = markingFromForm(f)
  const mins = Number(minutes) > 0 ? Number(minutes) : null
  const part = (k, label) => `${label} ${signed(m[k].correct)} / ${signed(m[k].wrong)}`
  const partial = m.multiple.partial ? ' (partial marks for each correct option chosen when no wrong option is chosen)' : ''
  return [
    `The test lasts ${mins ? mins + ' minutes' : 'a fixed time'}. A timer at the top shows the time left, and the test is submitted automatically when it reaches zero.`,
    'Your answers are saved automatically. Use Save & Next to save an answer and move to the next question.',
    'Use Mark for Review to come back to a question later. A question marked for review that has an answer is still evaluated.',
    'You can move between sections and questions at any time using the question palette.',
    `Marking: ${part('single', 'single correct')}; ${part('multiple', 'multiple correct')}${partial}; ${part('integer', 'integer')}; ${part('numerical', 'numerical')}.`,
    'Unanswered questions get 0 marks. Do not refresh or close the window during the test.',
  ].join('\n')
}

/* Subjects an exam's tests are made of. A single-subject test picks one of
   them; a full-syllabus test lists them all (editable). Stored as plain text
   in `subject`, so "Physics" = single subject, "Physics, Chemistry" = full. */
const SUBJECTS = { jee: ['Physics', 'Chemistry', 'Maths'], neet: ['Physics', 'Chemistry', 'Biology'], '': ['Physics', 'Chemistry', 'Maths', 'Biology'] }
const subjectsFor = (exam) => SUBJECTS[exam] || SUBJECTS['']
const isSingle = (subject) => !!subject && !/[,&/+]| and /i.test(subject)

const examWord = (exam) => (exam === 'jee' ? 'JEE ' : exam === 'neet' ? 'NEET ' : '')

export default function TestEditor({ id, kind: newKind = 'live', seriesId, backText = 'Back to tests', onBack, onSaved }) {
  const editing = !!id
  const [loaded, setLoaded] = useState(!editing)
  const [loadError, setLoadError] = useState(null)
  const [original, setOriginal] = useState(null) // the test as loaded (edit only)

  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [scope, setScope] = useState('full') // 'full' | 'single' — the test type
  const [exam, setExam] = useState('')
  const [duration, setDuration] = useState('180')
  const [opensAt, setOpensAt] = useState('')
  const [closesAt, setClosesAt] = useState('')
  const [marking, setMarking] = useState(() => markingToForm(DEFAULT_MARKING))
  const [instructions, setInstructions] = useState(null) // null = follow the generated default
  const [audience, setAudience] = useState(EVERYONE)
  const [paperText, setPaperText] = useState('')
  const [mode, setMode] = useState('paste')
  const [fileName, setFileName] = useState('')
  const [dragging, setDragging] = useState(false)

  const [result, setResult] = useState(null) // last paper check: { key, state: ok | bad | failed, … }
  const [fieldErr, setFieldErr] = useState(null) // { field, message }
  const [formErr, setFormErr] = useState(null)
  const [saving, setSaving] = useState(null) // 'draft' | 'publish' | 'save'
  const seq = useRef(0)
  const formRef = useRef(null)

  const kind = editing ? (original && (original.kind || (original.isFree ? 'free' : 'live'))) || newKind : newKind
  const isSeries = kind === 'series'
  const isLive = kind === 'live'
  const locked = editing && original && original.attempts > 0
  const published = editing && original && original.status === 'published'
  const instrValue = instructions == null ? defaultInstructions(duration, marking) : instructions

  /* Load the test when editing */
  useEffect(() => {
    if (!editing) return
    let live = true
    getTest(id)
      .then((t) => {
        if (!live) return
        setOriginal(t)
        setTitle(t.title || '')
        setSubject(t.subject || '')
        setScope(isSingle(t.subject) ? 'single' : 'full')
        setExam(t.exam || '')
        setDuration(String(t.durationMin || ''))
        setOpensAt(toLocalInput(t.opensAt))
        setClosesAt(toLocalInput(t.closesAt))
        setMarking(markingToForm(t.marking))
        setInstructions(t.instructions || '')
        setAudience(audienceFrom(t.audience))
        setPaperText(t.source != null ? JSON.stringify(t.source, null, 2) : '')
        setLoaded(true)
      })
      .catch((e) => live && setLoadError(e.message))
    return () => {
      live = false
    }
  }, [editing, id])

  /* Check the paper as the admin types (debounced). `result` belongs to the
     input it was made for (`key`); anything else is shown as "checking". */
  const markingKey = JSON.stringify(marking)
  const checkKey = JSON.stringify([paperText, subject.trim(), markingKey])
  useEffect(() => {
    if (!loaded || !paperText.trim()) return
    const n = ++seq.current
    const timer = setTimeout(() => {
      const done = (r) => n === seq.current && setResult({ key: checkKey, ...r })
      validatePaper({ paper: paperText, subject: subject.trim(), marking: markingFromForm(JSON.parse(markingKey)) })
        .then((r) =>
          done(r.ok ? { state: 'ok', summary: r.summary, paper: r.paper } : { state: 'bad', error: r.error, errors: r.errors || [], field: r.field }),
        )
        .catch((e) => done({ state: 'failed', error: e.message }))
    }, 500)
    return () => clearTimeout(timer)
  }, [paperText, subject, markingKey, checkKey, loaded])

  const check = !paperText.trim()
    ? { state: 'empty' }
    : result && result.key === checkKey
      ? result
      : { state: 'checking', prev: result }

  function setMark(type, key, value) {
    setMarking((m) => ({ ...m, [type]: { ...m[type], [key]: value } }))
    if (fieldErr && fieldErr.field === 'marking') setFieldErr(null)
  }

  function clearErr(field) {
    if (fieldErr && fieldErr.field === field) setFieldErr(null)
  }

  function readFile(file) {
    if (!file) return
    if (!/\.json$/i.test(file.name) && file.type !== 'application/json') {
      setFileName('')
      setFormErr(null)
      setFieldErr({ field: 'paper', message: `"${file.name}" isn't a .json file.` })
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setPaperText(String(reader.result || ''))
      setFileName(file.name)
      clearErr('paper')
    }
    reader.onerror = () => setFieldErr({ field: 'paper', message: "Couldn't read that file. Try again or paste the JSON instead." })
    reader.readAsText(file)
  }

  function body() {
    return {
      title: title.trim(),
      subject: subject.trim(),
      exam,
      kind: isSeries ? undefined : kind,
      seriesId: isSeries && !editing ? seriesId : undefined,
      durationMin: Number(duration),
      instructions: instrValue,
      marking: markingFromForm(marking),
      opensAt: isSeries ? null : fromLocalInput(opensAt),
      closesAt: isSeries ? null : fromLocalInput(closesAt),
      paper: paperText.trim() ? paperText : null,
      ...(isLive ? { audience: audienceBody(audience) } : {}),
    }
  }

  async function save(how) {
    setSaving(how)
    setFieldErr(null)
    setFormErr(null)
    try {
      let msg
      if (!editing) {
        const t = await createTest({ ...body(), ...(isSeries ? {} : { publish: how === 'publish' }) })
        msg = isSeries ? `"${t.title}" added to the series` : how === 'publish' ? `"${t.title}" is published` : `"${t.title}" saved as a draft`
      } else {
        const t = await updateTest(id, body())
        if (how === 'publish' && t.status !== 'published') await setPublished(id, true)
        msg = how === 'publish' ? `"${t.title}" saved and published` : `"${t.title}" saved`
      }
      onSaved(msg)
    } catch (e) {
      setSaving(null)
      if (e.field && e.field !== 'seriesId') {
        setFieldErr({ field: e.field, message: e.message })
        if (e.field === 'paper' && Array.isArray(e.data.errors) && e.data.errors.length) {
          setResult({ key: checkKey, state: 'bad', error: e.message, errors: e.data.errors })
        }
        const el = formRef.current && formRef.current.querySelector(`[data-field="${e.field}"]`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          const input = el.querySelector('input, textarea')
          if (input) input.focus({ preventScroll: true })
        }
      } else {
        setFormErr(e.message)
      }
    }
  }

  const err = (field) =>
    fieldErr && fieldErr.field === field ? (
      <p className="ts-field-err" role="alert">
        {fieldErr.message}
      </p>
    ) : null
  const invalid = (field) => (fieldErr && fieldErr.field === field ? 'true' : undefined)

  if (loadError) {
    return (
      <>
        <BackLink onBack={onBack} text={backText} />
        <div className="alert a-err" role="alert">
          <span>Couldn&apos;t open this test. {loadError}</span>
        </div>
      </>
    )
  }
  if (!loaded) {
    return (
      <>
        <BackLink onBack={onBack} text={backText} />
        <p className="hint">Loading test…</p>
      </>
    )
  }

  const paperOk = check.state === 'ok'
  // keep the last good preview on screen while a new check runs
  const shownOk = paperOk ? check : check.state === 'checking' && check.prev && check.prev.state === 'ok' ? check.prev : null
  const markingErr = check.state === 'bad' && check.field === 'marking'
  const canPublish = paperOk && !saving
  const noStart = isLive && editing && !original.opensAt // older tests were made before live tests needed a start time
  // section numbers: the audience section only exists for live tests
  const num = (name) => String(['details', isLive && 'audience', 'marking', 'instructions', 'paper', 'preview'].filter(Boolean).indexOf(name) + 1)
  const noun = { free: 'free test', live: 'live test', series: 'test' }[kind]

  return (
    <div className="ts-editor" ref={formRef}>
      <div className="head ts-head">
        <div>
          <BackLink onBack={onBack} text={backText} />
          <h1>{editing ? 'Edit ' + noun : isSeries ? 'Add a test to the series' : 'Create ' + noun}</h1>
          <p>
            {isSeries
              ? 'Fill in the details and add the question paper as JSON. Tests in a series are stored only: no student sees them yet.'
              : editing
                ? 'Change the details, marking or question paper. Students see changes as soon as you save.'
                : isLive
                  ? 'Set when it starts and who can take it, add the question paper as JSON and check the preview before publishing.'
                  : 'Free tests are open to every student, with or without a batch. Add the question paper as JSON and check the preview before publishing.'}
          </p>
        </div>
        {editing && !isSeries && (
          <div className="ts-head-meta">
            <span className={'pill ' + (published ? 'p-published' : 'p-draft')}>{published ? 'Published' : 'Draft'}</span>
            <span className="hint">
              {original.attempts || 0} started · {original.submitted || 0} submitted
            </span>
          </div>
        )}
      </div>

      {locked && (
        <div className="alert a-info">
          <span>
            {original.attempts} student{original.attempts === 1 ? ' has' : 's have'} already started this test, so its question paper and marking are locked.
            {isLive
              ? ' You can still change the title, instructions, timings and who can take it.'
              : isSeries
                ? ' You can still change the title and instructions.'
                : ' You can still change the title, instructions and timings.'}
          </span>
        </div>
      )}

      {noStart && (
        <div className="alert a-warn">
          <span>This live test has no start time yet. Add one under Details before you save.</span>
        </div>
      )}

      {/* Details */}
      <section className="ts-sect">
        <SectHead n={num('details')} title="Details" text={isSeries ? 'The name, subject and length of this test.' : 'What students see in their test list.'} />
        <div className="card">
          <div className="form ts-form">
            <div className="full" data-field="title">
              <label className="l" htmlFor="ts-title">
                Title
              </label>
              <input
                className="input"
                id="ts-title"
                value={title}
                maxLength={120}
                placeholder="e.g. NEET Full Syllabus Test 1"
                aria-invalid={invalid('title')}
                onChange={(e) => {
                  setTitle(e.target.value)
                  clearErr('title')
                }}
              />
              {err('title')}
            </div>
            <div className="full" data-field="subject">
              <span className="l ts-l" id="ts-scope-l">
                Test type
              </span>
              <div className="seg" role="group" aria-labelledby="ts-scope-l">
                {[
                  ['full', 'Full syllabus'],
                  ['single', 'Single subject'],
                ].map(([v, l]) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={scope === v ? 'true' : 'false'}
                    onClick={() => {
                      if (scope === v) return
                      setScope(v)
                      clearErr('subject')
                      const list = subjectsFor(exam)
                      setSubject(v === 'single' ? (isSingle(subject) ? subject : list[0]) : list.join(', '))
                    }}
                  >
                    {l}
                  </button>
                ))}
              </div>
              {scope === 'single' ? (
                <>
                  <div className="ts-subjects" role="group" aria-label="Subject">
                    {subjectsFor(exam).map((v) => (
                      <button
                        key={v}
                        type="button"
                        className="chip-btn"
                        aria-pressed={subject === v ? 'true' : 'false'}
                        onClick={() => {
                          setSubject(v)
                          clearErr('subject')
                        }}
                      >
                        {v}
                      </button>
                    ))}
                    <input
                      className="input ts-subject-other"
                      id="ts-subject"
                      value={subjectsFor(exam).includes(subject) ? '' : subject}
                      maxLength={60}
                      placeholder="Other subject…"
                      aria-label="Other subject"
                      aria-invalid={invalid('subject')}
                      onChange={(e) => {
                        setSubject(e.target.value.replace(/[,&/+]/g, ''))
                        clearErr('subject')
                      }}
                    />
                  </div>
                  {err('subject') || <p className="hint">Students can filter a series by subject. A paper without sections becomes one section named after it.</p>}
                </>
              ) : (
                <>
                  <input
                    className="input"
                    id="ts-subject"
                    value={subject}
                    maxLength={120}
                    placeholder={'e.g. ' + subjectsFor(exam).join(', ')}
                    aria-label="Subjects covered"
                    aria-invalid={invalid('subject')}
                    onChange={(e) => {
                      setSubject(e.target.value)
                      clearErr('subject')
                    }}
                  />
                  {err('subject') || <p className="hint">The subjects this paper covers, separated by commas.</p>}
                </>
              )}
            </div>
            <div data-field="exam">
              <span className="l ts-l" id="ts-exam-l">
                Exam
              </span>
              <div className="seg" role="group" aria-labelledby="ts-exam-l">
                {EXAMS.map(([v, l]) => (
                  <button key={v || 'none'} type="button" aria-pressed={exam === v ? 'true' : 'false'} onClick={() => setExam(v)}>
                    {l}
                  </button>
                ))}
              </div>
              {err('exam') ||
                (kind === 'free' ? (
                  <p className="hint ts-exam-hint">Every {examWord(exam)}student can take it, with or without a batch.</p>
                ) : isLive ? (
                  <p className="hint ts-exam-hint">{exam ? `Only ${examWord(exam)}students see it.` : 'Students of every exam can see it.'}</p>
                ) : null)}
            </div>
            <div data-field="durationMin">
              <label className="l" htmlFor="ts-duration">
                Duration (minutes)
              </label>
              <input
                className="input ts-num"
                id="ts-duration"
                type="number"
                inputMode="numeric"
                min="1"
                max="600"
                step="1"
                value={duration}
                aria-invalid={invalid('durationMin')}
                onChange={(e) => {
                  setDuration(e.target.value)
                  clearErr('durationMin')
                }}
              />
              {err('durationMin')}
            </div>
            {!isSeries && (
              <>
                <div className="ts-spacer" aria-hidden="true"></div>
                <div data-field="opensAt">
                  <label className="l" htmlFor="ts-opens">
                    {isLive ? 'Starts at' : 'Opens at'} {!isLive && <span className="ts-opt">optional</span>}
                  </label>
                  <input
                    className="input"
                    id="ts-opens"
                    type="datetime-local"
                    value={opensAt}
                    required={isLive}
                    aria-invalid={invalid('opensAt')}
                    onChange={(e) => {
                      setOpensAt(e.target.value)
                      clearErr('opensAt')
                    }}
                  />
                  {err('opensAt') || (
                    <p className="hint">{isLive ? 'Students can start the test from this time.' : 'Leave empty to open it as soon as it is published.'}</p>
                  )}
                </div>
                <div data-field="closesAt">
                  <label className="l" htmlFor="ts-closes">
                    Closes at <span className="ts-opt">optional</span>
                  </label>
                  <input
                    className="input"
                    id="ts-closes"
                    type="datetime-local"
                    value={closesAt}
                    aria-invalid={invalid('closesAt')}
                    onChange={(e) => {
                      setClosesAt(e.target.value)
                      clearErr('closesAt')
                    }}
                  />
                  {err('closesAt') || <p className="hint">Leave empty to keep it open.</p>}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Who can take it (live tests only) */}
      {isLive && (
        <section className="ts-sect" data-field="audience">
          <SectHead n={num('audience')} title="Who can take this test" text="All paid students, or only the batches, groups and students you choose. You can change this at any time." />
          <AudienceEditor
            value={audience}
            error={fieldErr && fieldErr.field === 'audience' ? fieldErr.message : null}
            onChange={(a) => {
              setAudience(a)
              clearErr('audience')
            }}
          />
        </section>
      )}

      {/* Marking */}
      <section className="ts-sect" data-field="marking">
        <SectHead n={num('marking')} title="Marking scheme" text="Applies to every question of that type, unless a question sets its own marks." />
        <div className="card ts-mk-card">
          <table className="ts-mk">
            <thead>
              <tr>
                <th>Question type</th>
                <th>Correct</th>
                <th>Wrong</th>
                <th>
                  <span className="sr">Options</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {TYPES.map(({ key, label }) => (
                <tr key={key}>
                  <td>
                    <b>{label}</b>
                  </td>
                  <td data-label="Correct">
                    <input
                      className="input ts-num"
                      type="number"
                      step="any"
                      min="0"
                      aria-label={label + ': marks for a correct answer'}
                      value={marking[key].correct}
                      readOnly={locked}
                      onChange={(e) => setMark(key, 'correct', e.target.value)}
                    />
                  </td>
                  <td data-label="Wrong">
                    <input
                      className="input ts-num"
                      type="number"
                      step="any"
                      max="0"
                      aria-label={label + ': marks for a wrong answer'}
                      value={marking[key].wrong}
                      readOnly={locked}
                      onChange={(e) => setMark(key, 'wrong', e.target.value)}
                    />
                  </td>
                  <td className="ts-mk-extra">
                    {key === 'multiple' ? (
                      <label className="check">
                        <input type="checkbox" checked={!!marking.multiple.partial} disabled={locked} onChange={(e) => setMark('multiple', 'partial', e.target.checked)} />
                        Partial marking
                      </label>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="hint ts-mk-note">
            Wrong is 0 or negative. With partial marking, a multiple-correct question gives +1 for each correct option chosen when no wrong option is chosen.
            Unanswered questions always get 0.
          </p>
          {markingErr && (
            <div className="alert a-err">
              <span>{check.errors && check.errors.length ? check.errors.join(' ') : check.error}</span>
            </div>
          )}
          {err('marking')}
        </div>
      </section>

      {/* 4. Instructions */}
      <section className="ts-sect" data-field="instructions">
        <SectHead
          n={num('instructions')}
          title="Instructions"
          text="Shown to students before they start. One rule per line."
          action={
            instructions != null && !locked ? (
              <button className="btn btn-outline btn-sm" type="button" onClick={() => setInstructions(null)}>
                Reset to standard rules
              </button>
            ) : null
          }
        />
        <div className="card">
          <label className="sr" htmlFor="ts-instructions">
            Instructions
          </label>
          <textarea
            className="input ts-instr"
            id="ts-instructions"
            rows={8}
            value={instrValue}
            maxLength={5000}
            aria-invalid={invalid('instructions')}
            onChange={(e) => {
              setInstructions(e.target.value)
              clearErr('instructions')
            }}
          />
          {err('instructions') ||
            (instructions == null ? (
              <p className="hint">The standard rules follow the duration and marking scheme above until you edit them.</p>
            ) : null)}
        </div>
      </section>

      {/* 5. Question paper */}
      <section className="ts-sect" data-field="paper">
        <SectHead
          n={num('paper')}
          title="Question paper"
          text="Paste the paper as JSON or upload a .json file. It is checked as you type."
          action={
            <div className="ts-links">
              <a href="/sample-test.json" download="sample-test.json">
                Download sample
              </a>
            </div>
          }
        />
        <div className="ts-paper">
          <div className="card ts-paper-input">
            <div className="ts-paper-bar">
              <div className="seg" role="group" aria-label="How to add the paper">
                <button type="button" aria-pressed={mode === 'paste' ? 'true' : 'false'} onClick={() => setMode('paste')}>
                  Paste JSON
                </button>
                <button type="button" aria-pressed={mode === 'upload' ? 'true' : 'false'} onClick={() => setMode('upload')}>
                  Upload .json file
                </button>
              </div>
              {paperText && !locked && (
                <button
                  className="btn btn-outline btn-sm"
                  type="button"
                  onClick={() => {
                    setPaperText('')
                    setFileName('')
                  }}
                >
                  Clear
                </button>
              )}
            </div>

            {mode === 'paste' ? (
              <>
                <label className="sr" htmlFor="ts-paper">
                  Question paper JSON
                </label>
                <textarea
                  className="input ts-code"
                  id="ts-paper"
                  spellCheck="false"
                  autoCapitalize="off"
                  autoComplete="off"
                  wrap="off"
                  readOnly={locked}
                  placeholder={'{\n  "languages": ["en"],\n  "sections": [\n    { "name": "Physics", "questions": [ … ] }\n  ]\n}'}
                  value={paperText}
                  aria-invalid={invalid('paper')}
                  onChange={(e) => {
                    setPaperText(e.target.value)
                    setFileName('')
                    clearErr('paper')
                  }}
                />
              </>
            ) : (
              <label
                className={'ts-drop' + (dragging ? ' on' : '') + (locked ? ' off' : '')}
                onDragOver={(e) => {
                  if (locked) return
                  e.preventDefault()
                  setDragging(true)
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  if (locked) return
                  e.preventDefault()
                  setDragging(false)
                  readFile(e.dataTransfer.files && e.dataTransfer.files[0])
                }}
              >
                <b>{fileName ? fileName : 'Choose a .json file'}</b>
                <span className="hint">
                  {locked
                    ? 'The paper is locked because students have started this test.'
                    : fileName
                      ? 'Loaded. Choose another file to replace it, or switch to Paste JSON to edit it.'
                      : 'Or drag it here. The file is read in your browser and checked straight away.'}
                </span>
                <input
                  type="file"
                  accept=".json,application/json"
                  disabled={locked}
                  onChange={(e) => {
                    readFile(e.target.files && e.target.files[0])
                    e.target.value = ''
                  }}
                />
              </label>
            )}
            {err('paper')}

            <details className="ts-guide">
              <summary>Format guide</summary>
              <div className="ts-guide-body">
                <ul>
                  <li>
                    The paper is <code>{'{"languages": ["en"], "sections": [{"name": "Physics", "questions": [ … ]}]}'}</code>. Use{' '}
                    <code>{'["en", "hi"]'}</code> to add Hindi. A plain list of questions becomes one section named after the subject.
                  </li>
                  <li>
                    Every question has a <code>type</code>: <code>single</code>, <code>multiple</code>, <code>integer</code> or <code>numerical</code>, and a{' '}
                    <code>text</code>: <code>{'"…"'}</code> or <code>{'{"en": "…", "hi": "…"}'}</code>.
                  </li>
                  <li>
                    Single and multiple questions have 2 to 6 <code>options</code>, shown as A, B, C… Answers are letters: <code>{'"C"'}</code> or{' '}
                    <code>{'["A", "C"]'}</code>.
                  </li>
                  <li>
                    Integer answers are whole numbers (<code>6</code>). Numerical answers are numbers (<code>44.5</code>) with an optional{' '}
                    <code>tolerance</code>.
                  </li>
                  <li>
                    Optional: <code>marks</code> (<code>{'{"correct": 4, "wrong": -1}'}</code>), <code>chapter</code> and a YouTube{' '}
                    <code>video</code> link.
                  </li>
                  <li>
                    Write maths in LaTeX between dollar signs, <code>{'"$x^2 - 5x + 6 = 0$"'}</code>, and double every backslash in JSON:{' '}
                    <code>{'"$\\\\sqrt{3}$"'}</code>.
                  </li>
                  <li>At most 300 questions. Every problem is listed with its place, like “Physics › Q3”.</li>
                </ul>
              </div>
            </details>
          </div>

          <PaperStatus check={check} />
        </div>
      </section>

      {/* 6. Preview */}
      {shownOk && (
        <section className={'ts-sect' + (paperOk ? '' : ' ts-stale')}>
          <SectHead n={num('preview')} title="Preview" text="The questions as the server read them, with the correct answers highlighted." />
          <PaperPreview paper={shownOk.paper} />
        </section>
      )}

      {/* Actions */}
      <div className="ts-bar">
        <div className="ts-bar-msg">
          {formErr ? (
            <span className="ts-field-err" role="alert">
              {formErr}
            </span>
          ) : fieldErr ? (
            <span className="ts-field-err">Not saved. Fix the {FIELD_NAME[fieldErr.field] || 'highlighted field'} above.</span>
          ) : (
            <span className="hint">
              {check.state === 'ok'
                ? `Paper ready: ${check.summary.questionCount} questions, ${check.summary.totalMarks} marks.`
                : check.state === 'checking'
                  ? 'Checking the paper…'
                  : check.state === 'empty'
                    ? isSeries
                      ? 'You can save the test now and add the paper later.'
                      : 'You can save a draft without a paper. Publishing needs one.'
                    : isSeries
                      ? 'The paper has problems. You can still save and fix it later.'
                      : 'Fix the paper before publishing. You can still save a draft.'}
            </span>
          )}
        </div>
        <div className="actions">
          <button className="btn btn-outline" type="button" onClick={onBack} disabled={!!saving}>
            Cancel
          </button>
          {isSeries ? (
            <button className="btn btn-primary" type="button" disabled={!!saving} onClick={() => save('save')}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Save test'}
            </button>
          ) : published ? (
            <button className="btn btn-primary" type="button" disabled={!!saving || check.state === 'checking'} onClick={() => save('save')}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          ) : (
            <>
              <button className="btn btn-outline" type="button" disabled={!!saving} onClick={() => save('draft')}>
                {saving === 'draft' ? 'Saving…' : 'Save draft'}
              </button>
              <button
                className="btn btn-primary"
                type="button"
                disabled={!canPublish}
                title={paperOk ? undefined : 'The paper must pass the check first'}
                onClick={() => save('publish')}
              >
                {saving === 'publish' ? 'Publishing…' : 'Publish'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function BackLink({ onBack, text }) {
  return <BackButton onClick={onBack}>{text}</BackButton>
}

function SectHead({ n, title, text, action }) {
  return (
    <div className="sect-head ts-sect-head">
      <div>
        <h2>
          <span className="ts-step">{n}</span>
          {title}
        </h2>
        <p>{text}</p>
      </div>
      {action}
    </div>
  )
}

const FIELD_NAME = {
  title: 'title',
  subject: 'subject',
  exam: 'exam',
  durationMin: 'duration',
  opensAt: 'start time',
  closesAt: 'closing time',
  instructions: 'instructions',
  marking: 'marking scheme',
  paper: 'question paper',
  audience: 'who can take this test',
}

const LANG = { en: 'English', hi: 'Hindi' }

function PaperStatus({ check }) {
  const c = check.state === 'checking' ? check.prev || { state: 'empty' } : check
  const pending = check.state === 'checking'

  let inner
  if (c.state === 'empty') {
    inner = (
      <div className="ts-status-empty">
        <b>No paper yet</b>
        <p className="hint">Paste the JSON or upload a file. A summary of the sections, question types and total marks will appear here.</p>
      </div>
    )
  } else if (c.state === 'failed') {
    inner = (
      <div className="alert a-warn">
        <span>Couldn&apos;t check the paper right now. {c.error}</span>
      </div>
    )
  } else if (c.state === 'bad') {
    const errors = c.errors && c.errors.length ? c.errors : [c.error]
    inner = (
      <>
        <div className="ts-status-top">
          <span className="pill p-off">
            {errors.length} problem{errors.length === 1 ? '' : 's'}
          </span>
          <b>Fix these to publish</b>
        </div>
        {c.errors && c.errors.length > 1 && c.error && <p className="hint">{c.error}</p>}
        <ol className="ts-errors" aria-label="Problems in the paper">
          {errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ol>
      </>
    )
  } else if (c.state === 'ok') {
    const s = c.summary
    inner = (
      <>
        <div className="ts-status-top">
          <span className="pill p-published">Ready</span>
          <b>The paper has no problems</b>
        </div>
        <div className="ts-kpis">
          <div>
            <span>Questions</span>
            <b>{s.questionCount}</b>
          </div>
          <div>
            <span>Total marks</span>
            <b>{s.totalMarks}</b>
          </div>
          <div>
            <span>Languages</span>
            <b className="ts-kpi-text">{(s.languages || []).map((l) => LANG[l] || l).join(', ')}</b>
          </div>
        </div>
        <table className="ts-mini">
          <thead>
            <tr>
              <th>Section</th>
              <th className="num">Questions</th>
              <th className="num">Marks</th>
            </tr>
          </thead>
          <tbody>
            {s.sections.map((x) => (
              <tr key={x.name}>
                <td>{x.name}</td>
                <td className="num">{x.questions}</td>
                <td className="num">{x.marks}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="ts-types">
          {TYPES.map(({ key, label }) => (
            <div key={key}>
              <span>{label}</span>
              <b>{(s.byType && s.byType[key]) || 0}</b>
            </div>
          ))}
        </div>
      </>
    )
  }

  return (
    <aside className={'card ts-status' + (pending ? ' pending' : '')} aria-live="polite" aria-busy={pending ? 'true' : 'false'}>
      <div className="ts-status-label">
        <span>Check</span>
        {pending && <span className="ts-checking">Checking…</span>}
      </div>
      {inner}
    </aside>
  )
}
