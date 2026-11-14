import { useCallback, useEffect, useState } from 'react'
import { useToast } from '../../lib/useToast.jsx'
import TestEditor from './TestEditor.jsx'
import TestResults from './TestResults.jsx'
import { audienceText } from './studentsApi.js'
import { EXAM_LABEL, deleteTest, listTests, setPublished, when } from './testsApi.js'
import { cached, remember } from './cache.js'

/*
  Admin › Free tests and Admin › Live tests (real, API-backed). Shown by
  Admin.jsx in place of the demo #view while the sidebar's "Free tests" or
  "Live tests" item is active (`kind` = 'free' | 'live'). Two screens in one
  place: the list, the create / edit form (not a modal), and a test's results.
*/
const COPY = {
  free: {
    title: 'Free tests',
    text: 'Open to every student, with or without a batch. Add the question paper as JSON and publish it when it is ready.',
    create: 'Create free test',
    back: 'Back to free tests',
    empty: 'No free tests yet',
    emptyText: 'Free tests are open to every student. Fill in the details, add the question paper as JSON, check the preview and publish.',
  },
  live: {
    title: 'Live tests',
    text: 'Tests for paid students that open at a set time. Choose who can take each one: all paid students, or chosen batches, groups and students.',
    create: 'Create live test',
    back: 'Back to live tests',
    empty: 'No live tests yet',
    emptyText: 'Set a start time, choose who can take it, add the question paper as JSON and publish.',
  },
}

// "JEE " / "NEET " / "" for wording like "Every JEE student".
const examWord = (exam) => (exam === 'jee' ? 'JEE ' : exam === 'neet' ? 'NEET ' : '')

export default function TestsAdmin({ kind = 'free', onCount }) {
  const [screen, setScreen] = useState({ name: 'list' }) // or { name: 'edit', id: null | string } | { name: 'results', id }
  const { toast, node: toastNode } = useToast()

  function open(next) {
    setScreen(next)
    window.scrollTo(0, 0)
  }

  return (
    <>
      {screen.name === 'list' ? (
        <TestsList
          kind={kind}
          onCount={onCount}
          toast={toast}
          onCreate={() => open({ name: 'edit', id: null })}
          onEdit={(id) => open({ name: 'edit', id })}
          onResults={(id) => open({ name: 'results', id })}
        />
      ) : screen.name === 'results' ? (
        <TestResults key={screen.id} id={screen.id} backText={COPY[kind].back} onBack={() => open({ name: 'list' })} />
      ) : (
        <TestEditor
          key={screen.id || 'new'}
          id={screen.id}
          kind={kind}
          backText={COPY[kind].back}
          onBack={() => open({ name: 'list' })}
          onSaved={(msg) => {
            toast(msg)
            open({ name: 'list' })
          }}
        />
      )}
      {toastNode}
    </>
  )
}

/* Where a published test is in its window: Upcoming / Open now / Ended (null when always open). */
function phase(t, now) {
  if (t.closesAt && new Date(t.closesAt).getTime() <= now) return 'Ended'
  if (t.opensAt && new Date(t.opensAt).getTime() > now) return 'Upcoming'
  if (t.opensAt || t.closesAt) return 'Open now'
  return null
}

/* Free tests: a short line about their optional window. */
function freeWindow(t) {
  if (t.opensAt && t.closesAt) return 'Open ' + when(t.opensAt) + ' to ' + when(t.closesAt)
  if (t.opensAt) return 'Opens ' + when(t.opensAt)
  if (t.closesAt) return 'Closes ' + when(t.closesAt)
  return 'Always open'
}

function TestsList({ kind, onCount, toast, onCreate, onEdit, onResults }) {
  const copy = COPY[kind]
  const isLive = kind === 'live'
  // Last list for this section shows at once; load() then refreshes it
  const [tests, setTests] = useState(() => (cached('tests:' + kind) ? cached('tests:' + kind).data : null))
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(null) // { id, kind } of the row being changed
  const [retrying, setRetrying] = useState(false)
  const [now] = useState(() => Date.now())

  const load = useCallback(
    () =>
      listTests(kind)
        .then((list) => {
          setError(null)
          setTests(list)
          remember('tests:' + kind, list)
          if (onCount) onCount(list.length)
        })
        .catch((e) => setError(e.message)),
    [kind, onCount],
  )

  useEffect(() => {
    load()
  }, [load])

  async function togglePublish(t) {
    setBusy({ id: t.id, kind: 'publish' })
    try {
      const on = t.status !== 'published'
      await setPublished(t.id, on)
      await load()
      toast(on ? `"${t.title}" is published` : `"${t.title}" moved back to draft`)
    } catch (e) {
      toast(e.message, 4000)
    } finally {
      setBusy(null)
    }
  }

  async function remove(t) {
    const n = t.attempts || 0
    const warn = n
      ? `\n\n${n} student attempt${n === 1 ? '' : 's'} and ${n === 1 ? 'its' : 'their'} results will be deleted too. This can't be undone.`
      : "\n\nThis can't be undone."
    if (!window.confirm(`Delete "${t.title}"?${warn}`)) return
    setBusy({ id: t.id, kind: 'delete' })
    try {
      await deleteTest(t.id)
      await load()
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
          <h1>{copy.title}</h1>
          <p>{copy.text}</p>
        </div>
        <div className="actions">
          <button className="btn btn-primary" type="button" onClick={onCreate}>
            {copy.create}
          </button>
        </div>
      </div>

      {error ? (
        <div className="alert a-err" role="alert">
          <span className="ts-grow">Couldn&apos;t load tests. {error}</span>
          <button
            className="btn btn-outline btn-sm"
            type="button"
            disabled={retrying}
            onClick={() => {
              setRetrying(true)
              load().finally(() => setRetrying(false))
            }}
          >
            {retrying ? 'Trying…' : 'Try again'}
          </button>
        </div>
      ) : tests == null ? (
        <div className="table-wrap ts-loading" aria-busy="true">
          <p className="hint">Loading tests…</p>
        </div>
      ) : tests.length === 0 ? (
        <div className="card ts-empty">
          <h2>{copy.empty}</h2>
          <p className="hint">{copy.emptyText}</p>
          <div>
            <button className="btn btn-primary" type="button" onClick={onCreate}>
              {copy.create}
            </button>
          </div>
        </div>
      ) : (
        <div className={'table-wrap ts-table ' + (isLive ? 'ts-live' : 'ts-freelist')}>
          <table>
            <thead>
              <tr>
                <th>Test</th>
                <th>Paper</th>
                {isLive && <th>Starts / window</th>}
                <th>Status</th>
                {isLive && <th>Given to</th>}
                <th>Attempts</th>
                <th>
                  <span className="sr">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {tests.map((t) => {
                const published = t.status === 'published'
                const ph = published ? phase(t, now) : null
                return (
                  <tr key={t.id}>
                    <td>
                      <b>{t.title}</b>
                      <span className="sub">
                        {EXAM_LABEL[t.exam] ? EXAM_LABEL[t.exam] + ' · ' : ''}
                        {t.subject}
                      </span>
                    </td>
                    <td>
                      {t.hasPaper ? (
                        <>
                          {t.questionCount} questions
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
                    {isLive && (
                      <td className="ts-when" data-label="Starts">
                        {t.opensAt ? (
                          <>
                            {when(t.opensAt)}
                            <span className="sub">{t.closesAt ? 'Closes ' + when(t.closesAt) : 'No closing time'}</span>
                          </>
                        ) : (
                          <>
                            <span className="pill p-warn">No start time</span>
                            <span className="sub">Edit to add one</span>
                          </>
                        )}
                      </td>
                    )}
                    <td className="ts-state">
                      <span className={'pill ' + (published ? 'p-published' : 'p-draft')}>{published ? 'Published' : 'Draft'}</span>
                      {isLive ? ph && <span className="sub">{ph}</span> : <span className="sub">{freeWindow(t)}</span>}
                    </td>
                    {isLive && (
                      <td className="ts-aud" data-label="Given to">
                        {!t.audience || t.audience.mode !== 'custom' ? (
                          <>
                            <span>All paid students</span>
                            <span className="sub">{t.exam ? examWord(t.exam) + 'batches' : 'Every active batch'}</span>
                          </>
                        ) : audienceText(t.audience) === 'Nobody yet' ? (
                          <span className="pill p-warn">Nobody yet</span>
                        ) : (
                          <span title={audienceText(t.audience)}>{audienceText(t.audience, true)}</span>
                        )}
                      </td>
                    )}
                    <td className="ts-att">
                      {t.attempts || 0} started
                      <span className="sub">{t.submitted || 0} submitted</span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-outline btn-sm" type="button" onClick={() => onEdit(t.id)} aria-label={'Edit ' + t.title}>
                          Edit
                        </button>
                        {t.submitted > 0 ? (
                          <button className="btn btn-outline btn-sm" type="button" onClick={() => onResults(t.id)} aria-label={'Results of ' + t.title}>
                            Results
                          </button>
                        ) : null}
                        {published ? (
                          <button className="btn btn-outline btn-sm" type="button" disabled={busy?.id === t.id} onClick={() => togglePublish(t)}>
                            {busy?.id === t.id && busy.kind === 'publish' ? 'Unpublishing…' : 'Unpublish'}
                          </button>
                        ) : (
                          <button
                            className="btn btn-dark btn-sm"
                            type="button"
                            disabled={busy?.id === t.id || !t.hasPaper || (isLive && !t.opensAt)}
                            title={!t.hasPaper ? 'Add the question paper first' : isLive && !t.opensAt ? 'Add a start time first' : undefined}
                            onClick={() => togglePublish(t)}
                          >
                            {busy?.id === t.id && busy.kind === 'publish' ? 'Publishing…' : 'Publish'}
                          </button>
                        )}
                        <button className="btn btn-danger btn-sm" type="button" disabled={busy?.id === t.id} onClick={() => remove(t)} aria-label={'Delete ' + t.title}>
                          {busy?.id === t.id && busy.kind === 'delete' ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
