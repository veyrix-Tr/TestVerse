import { useState } from 'react'
import BackButton from '../../components/BackButton.jsx'
import { useToast } from '../../lib/useToast.jsx'
import AudienceEditor from './AudienceEditor.jsx'
import TestEditor from './TestEditor.jsx'
import LiveStamp from './LiveStamp.jsx'
import { ago, audienceBody, audienceFrom, day, plural } from './studentsApi.js'
import { EXAM_LABEL, createSeries, deleteSeries, deleteTest, getSeries, listSeries, publishSeries, reorderSeriesTests, unpublishSeries, updateSeries } from './testsApi.js'
import { useLive, useNow } from './useLive.js'

/*
  Admin › Test series (real, API-backed). Shown by Admin.jsx in place of the
  demo #view while the sidebar's "Test series" item is active. Screens: the
  list of series (a tree: each series is a root, its tests its children), one
  series (details, price, audience, publish + the same tests as an ordered
  outline), and the test editor for a test inside a series. Publishing makes
  the series visible and buyable in the student's Test series sidebar; its
  tests then belong to whoever bought it (backend lib/access.js).
*/
const EXAMS = [
  ['', 'None'],
  ['jee', 'JEE'],
  ['neet', 'NEET'],
]

const HINT_LIST = 'Set a price and an audience, then publish a series — students buy it from Test series in their sidebar.'
const HINT_PAGE =
  'Published series show up in the student’s Test series sidebar at the price you set. Students buy it once (0 = free) and its tests open for them.'

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
    body = (
      <SeriesList
        toast={toast}
        onCount={onCount}
        onOpen={(id) => open({ name: 'series', id })}
        onTest={(seriesId, seriesTitle, id) => open({ name: 'test', seriesId, seriesTitle, id })}
      />
    )
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

/* ---------- List of series (the tree: a series root with its tests inside) ---------- */
function SeriesList({ toast, onCount, onOpen, onTest }) {
  const live = useLive(
    () =>
      listSeries().then((list) => {
        if (onCount) onCount(list.length)
        return list
      }),
    'series',
    'series:list',
  )
  const [creating, setCreating] = useState(false)
  const [openId, setOpenId] = useState(null) // the expanded root, one at a time
  const [kids, setKids] = useState({}) // seriesId -> { status: 'loading' | 'ready' | 'error', tests, error }
  const [busy, setBusy] = useState(null) // 'del:<testId>' while a child is deleted
  const now = useNow(30000)
  const list = live.data

  /* The children of a root: load them the first time it is expanded */
  function loadKids(id) {
    setKids((k) => ({ ...k, [id]: { status: 'loading' } }))
    getSeries(id)
      .then(({ tests }) => setKids((k) => ({ ...k, [id]: { status: 'ready', tests } })))
      .catch((e) => setKids((k) => ({ ...k, [id]: { status: 'error', error: e.message } })))
  }

  function toggle(s) {
    const next = openId === s.id ? null : s.id
    setOpenId(next)
    if (next && !kids[next]) loadKids(s.id)
  }

  async function removeTest(s, t) {
    if (!window.confirm(`Delete "${t.title}" from "${s.title}"?\n\nThis can't be undone.`)) return
    setBusy('del:' + t.id)
    try {
      await deleteTest(t.id)
      loadKids(s.id) // picks up the new order and counts
      live.refresh()
      toast('Test deleted')
    } catch (e) {
      toast(e.message, 4000)
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <div className="head">
        <div>
          <h1>Test series</h1>
          <p>Group tests into a series for an exam. Open a series to put its tests in order, each from a JSON question paper.</p>
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
        <span>{HINT_LIST}</span>
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
        <div className="tree">
          {list.map((s) => {
            const open = openId === s.id
            const k = kids[s.id]
            return (
              <div className="card tree-root" key={s.id}>
                <div className="tree-head">
                  <button
                    type="button"
                    className="tree-toggle"
                    aria-expanded={open}
                    aria-controls={'tree-kids-' + s.id}
                    aria-label={(open ? 'Hide' : 'Show') + ' the tests in ' + s.title}
                    onClick={() => toggle(s)}
                  >
                    <svg viewBox="0 0 12 12" aria-hidden="true">
                      <path d="M4 2.5 8 6l-4 3.5" />
                    </svg>
                  </button>
                  <button type="button" className="tree-title" onClick={() => onOpen(s.id)}>
                    <span className="tree-title-row">
                      <span className="sg-group-name">{s.title}</span>
                      {s.exam && <span className="sr-exam">{EXAM_LABEL[s.exam] || s.exam}</span>}
                      <span className={'pill ' + (s.status === 'published' ? 'p-published' : 'p-draft')}>
                        {s.status === 'published' ? 'Published' : 'Draft'}
                      </span>
                    </span>
                    {s.description && <span className="tree-desc">{s.description}</span>}
                    <span className="tree-meta">
                      <span>
                        <b>{s.tests}</b> {s.tests === 1 ? 'test' : 'tests'}
                      </span>
                      <span>
                        <b>{s.ready}</b> of {s.tests} ready
                      </span>
                      <span>
                        <b>{s.questions}</b> {s.questions === 1 ? 'question' : 'questions'}
                      </span>
                      <span className="tree-price">
                        {s.price == null ? 'No price yet' : s.price === 0 ? 'Free' : '₹' + s.price}
                      </span>
                      <span className="tree-updated">Updated {ago(s.updatedAt, now)}</span>
                    </span>
                  </button>
                </div>

                {open && (
                  <ul className="tree-kids" id={'tree-kids-' + s.id}>
                    {!k || k.status === 'loading' ? (
                      <li className="tree-node tree-note">
                        <span className="hint">Loading tests…</span>
                      </li>
                    ) : k.status === 'error' ? (
                      <li className="tree-node tree-note">
                        <span className="hint">Couldn&apos;t load the tests. {k.error}</span>
                        <button className="btn btn-outline btn-sm" type="button" onClick={() => loadKids(s.id)}>
                          Try again
                        </button>
                      </li>
                    ) : k.tests.length ? (
                      k.tests.map((t, i) => (
                        <TestNode
                          key={t.id}
                          t={t}
                          pos={i + 1}
                          busy={busy === 'del:' + t.id}
                          onOpen={() => onTest(s.id, s.title, t.id)}
                          onDelete={() => removeTest(s, t)}
                        />
                      ))
                    ) : (
                      <li className="tree-node tree-note">
                        <span className="hint">No tests in this series yet. Add the first one from a JSON question paper.</span>
                      </li>
                    )}
                    <li className="tree-add">
                      <button className="btn btn-outline btn-sm" type="button" onClick={() => onTest(s.id, s.title, null)}>
                        Add test
                      </button>
                    </li>
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

/*
  One test as a tree node. The row itself opens the editor; the actions sit
  beside it (a button can't nest another). `onMove` is only passed where the
  order can change — the series page.
*/
function TestNode({ t, pos, busy, moveBusy, onOpen, onDelete, onMove, canUp, canDown }) {
  return (
    <li className="tree-node">
      <button type="button" className="tree-node-main" onClick={onOpen} aria-label={'Edit ' + t.title}>
        <span className="sr-n" aria-hidden="true">
          {pos}
        </span>
        <span className="tree-node-text">
          <b>{t.title}</b>
          <span className="sub">
            {EXAM_LABEL[t.exam] ? EXAM_LABEL[t.exam] + ' · ' : ''}
            {t.durationMin} min
          </span>
        </span>
        {t.subject ? <span className={'subj-tag' + (/[,&/+]| and /i.test(t.subject) ? ' is-full' : '')}>{/[,&/+]| and /i.test(t.subject) ? 'Full syllabus' : t.subject}</span> : null}
        <span className={'pill ' + (t.hasPaper ? 'p-published' : 'p-warn')}>{t.hasPaper ? 'Ready' : 'No paper yet'}</span>
      </button>
      <div className="tree-node-acts">
        {onMove && (
          <>
            <button
              className="btn btn-outline btn-sm tree-move"
              type="button"
              disabled={busy || moveBusy || !canUp}
              onClick={() => onMove(-1)}
              aria-label={'Move ' + t.title + ' up'}
              title="Move up"
            >
              ↑
            </button>
            <button
              className="btn btn-outline btn-sm tree-move"
              type="button"
              disabled={busy || moveBusy || !canDown}
              onClick={() => onMove(1)}
              aria-label={'Move ' + t.title + ' down'}
              title="Move down"
            >
              ↓
            </button>
          </>
        )}
        <button className="btn btn-danger btn-sm" type="button" disabled={busy || moveBusy} onClick={onDelete} aria-label={'Delete ' + t.title}>
          {busy ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </li>
  )
}

function NewSeries({ onCancel, onCreated }) {
  const [title, setTitle] = useState('')
  const [exam, setExam] = useState('')
  const [desc, setDesc] = useState('')
  const [price, setPrice] = useState('')
  const [err, setErr] = useState(null)
  const [saving, setSaving] = useState(false)

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    try {
      const s = await createSeries({ title: title.trim(), exam: exam || null, description: desc.trim(), price: price.trim() })
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
        value={{ title, exam, description: desc, price }}
        err={err}
        autoFocus
        onChange={(f) => {
          setTitle(f.title)
          setExam(f.exam)
          setDesc(f.description)
          setPrice(f.price)
          if (err && (err.field === 'title' || err.field === 'price') && f.title !== title) setErr(null)
        }}
      />
      {err && err.field !== 'title' && err.field !== 'price' && (
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

/* Name, exam, price and description: shared by "New series" and the series page. */
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
      <div>
        <label className="l" htmlFor={prefix + '-price'}>
          Price (₹) <span className="ts-opt">one-time</span>
        </label>
        <input
          className="input"
          id={prefix + '-price'}
          type="number"
          min="0"
          step="1"
          inputMode="numeric"
          value={value.price}
          placeholder="e.g. 499"
          aria-invalid={err && err.field === 'price' ? 'true' : undefined}
          onChange={(e) => set('price')(e.target.value)}
        />
        {err && err.field === 'price' ? (
          <p className="ts-field-err">{err.message}</p>
        ) : (
          <p className="hint">One-time payment for the whole series · 0 = free · needed to publish.</p>
        )}
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
  const live = useLive(() => getSeries(id), id, 'series:' + id)
  const [form, setForm] = useState(null) // { title, exam, description, price, audience } while editing
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
  const saved = {
    title:     s.title,
    exam:      s.exam || '',
    description: s.description || '',
    price:     s.price == null ? '' : String(s.price),
    audience:  audienceFrom(s.audience),
  }
  const f = form || saved
  const dirty =
    form &&
    (form.title.trim() !== saved.title ||
      form.exam !== saved.exam ||
      form.description.trim() !== saved.description ||
      String(form.price).trim() !== saved.price ||
      JSON.stringify(audienceBody(form.audience)) !== JSON.stringify(audienceBody(saved.audience)))
  const questions = tests.reduce((n, t) => n + (t.hasPaper ? t.questionCount || 0 : 0), 0)
  const marks = tests.reduce((n, t) => n + (t.hasPaper ? t.totalMarks || 0 : 0), 0)
  const ready = tests.filter((t) => t.hasPaper).length

  async function saveDetails(e) {
    e.preventDefault()
    setFormErr(null)
    setBusy('details')
    try {
      await updateSeries(s.id, {
        title:       f.title.trim(),
        exam:        f.exam || null,
        description: f.description.trim(),
        price:       String(f.price).trim(),
        audience:    audienceBody(f.audience),
      })
      await live.refresh()
      setForm(null)
      toast('Series saved')
    } catch (e2) {
      setFormErr({ field: e2.field, message: e2.message })
    } finally {
      setBusy(null)
    }
  }

  /* Publish: needs a price and at least one test with a paper (server checks) */
  async function publish() {
    setBusy('publish')
    try {
      await publishSeries(s.id)
      await live.refresh()
      toast('Series published — students can buy it now')
    } catch (e) {
      toast(e.message, 5000)
    } finally {
      setBusy(null)
    }
  }

  async function unpublish() {
    setBusy('unpublish')
    try {
      await unpublishSeries(s.id)
      await live.refresh()
      toast('Series unpublished — hidden from students again')
    } catch (e) {
      toast(e.message, 5000)
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

  /* Swap a test with its neighbour in the tree and save the new order */
  async function move(i, dir) {
    const j = i + dir
    if (j < 0 || j >= tests.length) return
    const ids = tests.map((t) => t.id)
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    setBusy('move:' + tests[i].id)
    try {
      await reorderSeriesTests(s.id, ids)
      await live.refresh()
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
        <span>{HINT_PAGE}</span>
      </div>

      <div className="stats sg-stats sg-stats-3">
        <div className="card stat">
          <span>Tests</span>
          <b>{tests.length}</b>
          <small>{ready === tests.length ? 'All have a paper' : ready + ' of ' + tests.length + ' have a paper'}</small>
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

      <form className="sg-form" onSubmit={saveDetails} aria-labelledby="sr-details">
        <div className="card sg-card">
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
              if (formErr && formErr.field !== 'audience') setFormErr(null)
            }}
          />
          {formErr && formErr.field !== 'title' && formErr.field !== 'price' && formErr.field !== 'audience' && (
            <div className="alert a-err" role="alert">
              <span>{formErr.message}</span>
            </div>
          )}
        </div>

        <section className="sect" aria-labelledby="sr-audience">
          <div className="sect-head sg-sect-head">
            <div>
              <h2 id="sr-audience">Who can see and buy</h2>
              <p>Everyone of the exam, or only the batches, groups and students you choose. Applies to the listing and the purchase — you can change it at any time.</p>
            </div>
          </div>
          <AudienceEditor
            context="series"
            value={f.audience}
            error={formErr && formErr.field === 'audience' ? formErr.message : null}
            onChange={(a) => {
              setForm({ ...f, audience: a })
              if (formErr) setFormErr(null)
            }}
          />
        </section>

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

      {s.status !== 'published' && (
        <div className="card sr-checklist" aria-label="Before you publish">
          <h3>Before you publish</h3>
          <ul>
            {[
              [s.price != null, s.price != null ? (s.price ? 'Price set: ₹' + s.price : 'Price set: Free') : 'Set a price (0 makes it free)'],
              [ready > 0, ready ? plural(ready, 'test') + ' ready with a question paper' : 'Add at least one test with a question paper'],
              [!dirty, dirty ? 'Save your changes to the details above' : 'Details saved'],
            ].map(([ok, text]) => (
              <li key={text} className={ok ? 'is-ok' : 'is-todo'}>
                <span aria-hidden="true">{ok ? '✓' : '•'}</span>
                {text}
              </li>
            ))}
          </ul>
          <p className="hint">Once published, the series appears under Test series for its audience. You can unpublish it any time.</p>
        </div>
      )}

      <section className="sect">
        <div className="sect-head sg-sect-head">
          <div>
            <h2>Tests in this series</h2>
            <p>
              {tests.length
                ? plural(tests.length, 'test') + ' in order, ' + ready + ' of ' + tests.length + ' with a paper. Use ↑ ↓ to change the order.'
                : 'No tests yet. Add the first one from a JSON question paper.'}{' '}
              {s.status === 'published'
                ? 'Students who buy the series can take these tests.'
                : 'They open up for students only once the series is published.'}
            </p>
          </div>
          <div className="actions">
            {s.status === 'published' ? (
              <>
                <span className="pill p-published">{s.publishedAt ? 'Published ' + day(s.publishedAt) : 'Published'}</span>
                <button className="btn btn-outline btn-sm" type="button" onClick={unpublish} disabled={busy === 'unpublish'}>
                  {busy === 'unpublish' ? 'Unpublishing…' : 'Unpublish'}
                </button>
                <button className="btn btn-primary btn-sm" type="button" onClick={() => onTest(null, s.title)}>
                  Add test
                </button>
              </>
            ) : (
              <>
                <button className="btn btn-primary btn-sm" type="button" onClick={publish} disabled={busy === 'publish'}>
                  {busy === 'publish' ? 'Publishing…' : 'Publish series'}
                </button>
                <button className="btn btn-outline btn-sm" type="button" onClick={() => onTest(null, s.title)}>
                  Add test
                </button>
              </>
            )}
          </div>
        </div>

        {tests.length ? (
          <ul className="tree tree-outline">
            {tests.map((t, i) => (
              <TestNode
                key={t.id}
                t={t}
                pos={i + 1}
                busy={busy === 't:' + t.id}
                moveBusy={!!busy && busy.startsWith('move:')}
                canUp={i > 0}
                canDown={i < tests.length - 1}
                onMove={(dir) => move(i, dir)}
                onOpen={() => onTest(t.id, s.title)}
                onDelete={() => removeTest(t)}
              />
            ))}
          </ul>
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
