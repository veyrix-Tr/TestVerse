import { useState } from 'react'
import BackButton from '../../components/BackButton.jsx'
import { useToast } from '../../lib/useToast.jsx'
import TestEditor from './TestEditor.jsx'
import LiveStamp from './LiveStamp.jsx'
import { ago, day, plural } from './studentsApi.js'
import { EXAM_LABEL, createSeries, deleteSeries, deleteTest, getSeries, listSeries, updateSeries } from './testsApi.js'
import { useLive, useNow } from './useLive.js'

/*
  Admin › Test series (real, API-backed). Shown by Admin.jsx in place of the
  demo #view while the sidebar's "Test series" item is active. Screens: the
  list of series (cards), one series (details + its tests), and the test
  editor for a test inside a series. Series tests are stored only: no student
  sees them yet, so they have no timing, audience or publishing.
*/
const EXAMS = [
  ['', 'None'],
  ['jee', 'JEE'],
  ['neet', 'NEET'],
]

const NOT_SHOWN = 'Tests in a series are stored only for now. No student sees them yet.'

export default function SeriesAdmin({ onCount }) {
  const [screen, setScreen] = useState({ name: 'list' }) // | { name: 'series', id } | { name: 'test', seriesId, seriesTitle, id }
  const { toast, node: toastNode } = useToast()

  function open(next) {
    setScreen(next)
    window.scrollTo(0, 0)
  }

  let body
  if (screen.name === 'series') {
    body = (
      <SeriesPage
        key={screen.id}
        id={screen.id}
        toast={toast}
        onBack={() => open({ name: 'list' })}
        onDeleted={() => open({ name: 'list' })}
        onTest={(id, title) => open({ name: 'test', seriesId: screen.id, seriesTitle: title, id })}
      />
    )
  } else if (screen.name === 'test') {
    const back = () => open({ name: 'series', id: screen.seriesId })
    body = (
      <TestEditor
        key={screen.id || 'new'}
        id={screen.id}
        kind="series"
        seriesId={screen.seriesId}
        backText={'Back to ' + (screen.seriesTitle || 'the series')}
        onBack={back}
        onSaved={(msg) => {
          toast(msg)
          back()
        }}
      />
    )
  } else {
    body = <SeriesList toast={toast} onCount={onCount} onOpen={(id) => open({ name: 'series', id })} />
  }

  return (
    <>
      {body}
      {toastNode}
    </>
  )
}

function ExamSeg({ id, value, onChange }) {
  return (
    <div className="seg" role="group" aria-labelledby={id}>
      {EXAMS.map(([v, l]) => (
        <button key={v || 'none'} type="button" aria-pressed={value === v ? 'true' : 'false'} onClick={() => onChange(v)}>
          {l}
        </button>
      ))}
    </div>
  )
}

/* ---------- List of series ---------- */
function SeriesList({ toast, onCount, onOpen }) {
  const live = useLive(
    () =>
      listSeries().then((list) => {
        if (onCount) onCount(list.length)
        return list
      }),
    'series',
  )
  const [creating, setCreating] = useState(false)
  const now = useNow(30000)
  const list = live.data

  return (
    <>
      <div className="head">
        <div>
          <h1>Test series</h1>
          <p>Group tests into a series for an exam. Add each test from a JSON question paper.</p>
        </div>
        <div className="actions">
          {!creating && (
            <button className="btn btn-primary" type="button" onClick={() => setCreating(true)}>
              New series
            </button>
          )}
        </div>
      </div>

      <div className="alert a-info">
        <span>{NOT_SHOWN}</span>
      </div>

      {creating && (
        <NewSeries
          onCancel={() => setCreating(false)}
          onCreated={(s) => {
            setCreating(false)
            toast(`"${s.title}" created`)
            onOpen(s.id)
          }}
        />
      )}

      {live.error && !list ? (
        <div className="alert a-err" role="alert">
          <span className="ts-grow">Couldn&apos;t load test series. {live.error}</span>
          <button className="btn btn-outline btn-sm" type="button" onClick={live.refresh} disabled={live.loading}>
            {live.loading ? 'Trying…' : 'Try again'}
          </button>
        </div>
      ) : !list ? (
        <div className="card ts-loading">
          <p className="hint">Loading test series…</p>
        </div>
      ) : !list.length ? (
        !creating && (
          <div className="card ts-empty">
            <h2>No test series yet</h2>
            <p className="hint">Create a series, then add its tests one by one from JSON question papers.</p>
            <div>
              <button className="btn btn-primary" type="button" onClick={() => setCreating(true)}>
                Create your first series
              </button>
            </div>
          </div>
        )
      ) : (
        <div className="sg-groups">
          {list.map((s) => (
            <button key={s.id} type="button" className="card sg-group sr-card" onClick={() => onOpen(s.id)}>
              <span className="sr-card-top">
                <span className="sg-group-name">{s.title}</span>
                {s.exam && <span className="sr-exam">{EXAM_LABEL[s.exam] || s.exam}</span>}
              </span>
              <span className="sg-group-desc">{s.description || <span className="sg-dim">No description</span>}</span>
              <span className="sg-group-nums">
                <span>
                  <b>{s.tests}</b> {s.tests === 1 ? 'test' : 'tests'}
                </span>
                <span>
                  <b>{s.questions}</b> {s.questions === 1 ? 'question' : 'questions'}
                </span>
              </span>
              <span className="sg-group-foot">Updated {ago(s.updatedAt, now)}</span>
            </button>
          ))}
        </div>
      )}
    </>
  )
}

function NewSeries({ onCancel, onCreated }) {
  const [title, setTitle] = useState('')
  const [exam, setExam] = useState('')
  const [desc, setDesc] = useState('')
  const [err, setErr] = useState(null)
  const [saving, setSaving] = useState(false)

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    try {
      const s = await createSeries({ title: title.trim(), exam: exam || null, description: desc.trim() })
      onCreated(s)
    } catch (e2) {
      setSaving(false)
      setErr({ field: e2.field, message: e2.message })
    }
  }

  return (
    <form className="card sg-new" onSubmit={save} aria-labelledby="sr-new-h">
      <div className="card-head">
        <h2 id="sr-new-h">New series</h2>
      </div>
      <SeriesFields
        prefix="sr-new"
        value={{ title, exam, description: desc }}
        err={err}
        autoFocus
        onChange={(f) => {
          setTitle(f.title)
          setExam(f.exam)
          setDesc(f.description)
          if (err && err.field === 'title' && f.title !== title) setErr(null)
        }}
      />
      {err && err.field !== 'title' && (
        <div className="alert a-err" role="alert">
          <span>{err.message}</span>
        </div>
      )}
      <div className="sg-form-foot">
        <span className="hint">You can add tests once the series is created.</span>
        <div className="actions">
          <button className="btn btn-outline" type="button" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button className="btn btn-primary" type="submit" disabled={saving || !title.trim()}>
            {saving ? 'Creating…' : 'Create series'}
          </button>
        </div>
      </div>
    </form>
  )
}

/* Name, exam and description: shared by "New series" and the series page. */
function SeriesFields({ prefix, value, err, autoFocus, onChange }) {
  const set = (k) => (v) => onChange({ ...value, [k]: v })
  return (
    <div className="form">
      <div>
        <label className="l" htmlFor={prefix + '-name'}>
          Name
        </label>
        <input
          className="input"
          id={prefix + '-name'}
          value={value.title}
          maxLength={120}
          autoFocus={autoFocus}
          placeholder="e.g. JEE Main 2027 Test Series"
          aria-invalid={err && err.field === 'title' ? 'true' : undefined}
          onChange={(e) => set('title')(e.target.value)}
        />
        {err && err.field === 'title' && <p className="ts-field-err">{err.message}</p>}
      </div>
      <div>
        <span className="l ts-l" id={prefix + '-exam'}>
          Exam
        </span>
        <ExamSeg id={prefix + '-exam'} value={value.exam} onChange={set('exam')} />
      </div>
      <div className="full">
        <label className="l" htmlFor={prefix + '-desc'}>
          Description <span className="ts-opt">optional</span>
        </label>
        <textarea
          className="input sr-desc"
          id={prefix + '-desc'}
          rows={2}
          maxLength={1000}
          value={value.description}
          placeholder="What the series covers, e.g. 6 part tests, 3 half-syllabus and 2 full-syllabus tests"
          onChange={(e) => set('description')(e.target.value)}
        />
      </div>
    </div>
  )
}

/* ---------- One series ---------- */
function SeriesPage({ id, toast, onBack, onDeleted, onTest }) {
  const live = useLive(() => getSeries(id), id)
  const [form, setForm] = useState(null) // { title, exam, description } while editing
  const [formErr, setFormErr] = useState(null)
  const [busy, setBusy] = useState(null)
  const now = useNow(30000)

  const back = <BackButton onClick={onBack}>Back to test series</BackButton>

  if (!live.data) {
    return (
      <>
        <div className="head ts-head sg-head">
          <div>
            {back}
            <h1>Test series</h1>
          </div>
        </div>
        {live.error ? (
          <div className="alert a-err" role="alert">
            <span className="ts-grow">
              {/not found/i.test(live.error) ? 'This series no longer exists. It may have been deleted.' : "Couldn't open this series. " + live.error}
            </span>
            <button className="btn btn-outline btn-sm" type="button" onClick={live.refresh} disabled={live.loading}>
              {live.loading ? 'Trying…' : 'Try again'}
            </button>
          </div>
        ) : (
          <p className="hint">Loading series…</p>
        )}
      </>
    )
  }

  const { series: s, tests } = live.data
  const saved = { title: s.title, exam: s.exam || '', description: s.description || '' }
  const f = form || saved
  const dirty = form && (form.title.trim() !== saved.title || form.exam !== saved.exam || form.description.trim() !== saved.description)
  const questions = tests.reduce((n, t) => n + (t.hasPaper ? t.questionCount || 0 : 0), 0)
  const marks = tests.reduce((n, t) => n + (t.hasPaper ? t.totalMarks || 0 : 0), 0)

  async function saveDetails(e) {
    e.preventDefault()
    setFormErr(null)
    setBusy('details')
    try {
      await updateSeries(s.id, { title: f.title.trim(), exam: f.exam || null, description: f.description.trim() })
      await live.refresh()
      setForm(null)
      toast('Series saved')
    } catch (e2) {
      setFormErr({ field: e2.field, message: e2.message })
    } finally {
      setBusy(null)
    }
  }

  async function removeTest(t) {
    if (!window.confirm(`Delete "${t.title}" from this series?\n\nThis can't be undone.`)) return
    setBusy('t:' + t.id)
    try {
      await deleteTest(t.id)
      await live.refresh()
      toast('Test deleted')
    } catch (e) {
      toast(e.message, 4000)
    } finally {
      setBusy(null)
    }
  }

  async function remove() {
    const msg =
      `Delete the series "${s.title}"?\n\n` +
      (tests.length ? `Its ${plural(tests.length, 'test')} will be deleted too. ` : '') +
      'This can’t be undone.'
    if (!window.confirm(msg)) return
    setBusy('delete')
    try {
      await deleteSeries(s.id)
      toast(`"${s.title}" deleted`)
      onDeleted()
    } catch (e) {
      setBusy(null)
      toast(e.message, 4000)
    }
  }

  return (
    <div className="sg-page">
      <div className="head ts-head sg-head">
        <div>
          {back}
          <h1>{s.title}</h1>
          <p>{s.description || 'No description.'}</p>
        </div>
        <LiveStamp at={live.at} loading={live.loading} error={live.error} onRefresh={live.refresh} />
      </div>

      <div className="alert a-info">
        <span>{NOT_SHOWN}</span>
      </div>

      <div className="stats sg-stats sg-stats-3">
        <div className="card stat">
          <span>Tests</span>
          <b>{tests.length}</b>
          <small>{tests.filter((t) => !t.hasPaper).length ? plural(tests.filter((t) => !t.hasPaper).length, 'test') + ' without a paper' : 'All have a paper'}</small>
        </div>
        <div className="card stat">
          <span>Questions</span>
          <b>{questions}</b>
          <small>{marks} marks in total</small>
        </div>
        <div className="card stat">
          <span>Exam</span>
          <b className="sg-stat-text">{EXAM_LABEL[s.exam] || 'None'}</b>
          <small>Created {day(s.createdAt)}</small>
        </div>
      </div>

      <form className="card sg-card" onSubmit={saveDetails} aria-labelledby="sr-details">
        <div className="card-head">
          <h2 id="sr-details">Details</h2>
          <span className="hint">Updated {ago(s.updatedAt, now)}</span>
        </div>
        <SeriesFields
          prefix="sr-edit"
          value={f}
          err={formErr}
          onChange={(next) => {
            setForm(next)
            if (formErr) setFormErr(null)
          }}
        />
        {formErr && formErr.field !== 'title' && (
          <div className="alert a-err" role="alert">
            <span>{formErr.message}</span>
          </div>
        )}
        {dirty && (
          <div className="sg-form-foot">
            <span className="hint">Unsaved changes</span>
            <div className="actions">
              <button
                className="btn btn-outline"
                type="button"
                onClick={() => {
                  setForm(null)
                  setFormErr(null)
                }}
              >
                Cancel
              </button>
              <button className="btn btn-primary" type="submit" disabled={busy === 'details' || !f.title.trim()}>
                {busy === 'details' ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </form>

      <section className="sect">
        <div className="sect-head sg-sect-head">
          <div>
            <h2>Tests in this series</h2>
            <p>{tests.length ? plural(tests.length, 'test') + ', oldest first.' : 'No tests yet. Add the first one from a JSON question paper.'}</p>
          </div>
          <button className="btn btn-primary btn-sm" type="button" onClick={() => onTest(null, s.title)}>
            Add test
          </button>
        </div>

        {tests.length ? (
          <div className="table-wrap sg-table sr-table">
            <table>
              <thead>
                <tr>
                  <th>Test</th>
                  <th>Paper</th>
                  <th>Updated</th>
                  <th>
                    <span className="sr">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {tests.map((t, i) => (
                  <tr key={t.id}>
                    <td>
                      <b>
                        <span className="sr-n">{i + 1}</span>
                        {t.title}
                      </b>
                      <span className="sub">
                        {EXAM_LABEL[t.exam] ? EXAM_LABEL[t.exam] + ' · ' : ''}
                        {t.subject}
                      </span>
                    </td>
                    <td data-label="Paper">
                      {t.hasPaper ? (
                        <>
                          {plural(t.questionCount, 'question')}
                          <span className="sub">
                            {t.totalMarks} marks · {t.durationMin} min
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="pill p-warn">No paper yet</span>
                          <span className="sub">{t.durationMin} min</span>
                        </>
                      )}
                    </td>
                    <td data-label="Updated">
                      {ago(t.updatedAt, now)}
                      <span className="sub">Added {day(t.createdAt)}</span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-outline btn-sm" type="button" onClick={() => onTest(t.id, s.title)} aria-label={'Edit ' + t.title}>
                          Edit
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          type="button"
                          disabled={busy === 't:' + t.id}
                          onClick={() => removeTest(t)}
                          aria-label={'Delete ' + t.title}
                        >
                          {busy === 't:' + t.id ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card ts-empty sr-empty">
            <h2>No tests in this series yet</h2>
            <p className="hint">Each test needs a title, subject, duration and its question paper as JSON. You can edit or delete it later.</p>
            <div>
              <button className="btn btn-primary" type="button" onClick={() => onTest(null, s.title)}>
                Add the first test
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="card sg-danger">
        <div>
          <h2>Delete this series</h2>
          <p className="hint">The series and {tests.length ? 'its ' + plural(tests.length, 'test') : 'everything in it'} are deleted for good.</p>
        </div>
        <button className="btn btn-danger" type="button" onClick={remove} disabled={busy === 'delete'}>
          {busy === 'delete' ? 'Deleting…' : 'Delete series'}
        </button>
      </section>
    </div>
  )
}
