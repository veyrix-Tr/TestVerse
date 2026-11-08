import { useCallback, useEffect, useState } from 'react'
import { useToast } from '../../lib/useToast.jsx'
import TestEditor from './TestEditor.jsx'
import { EXAM_LABEL, deleteTest, listTests, setPublished, when } from './testsApi.js'

/*
  Admin › Tests (real, API-backed). Shown by Admin.jsx in place of the demo
  #view while the sidebar's "Tests" item is active. Two screens in one place:
  the list, and the create / edit form (not a modal).
*/
export default function TestsAdmin({ onCount }) {
  const [screen, setScreen] = useState({ name: 'list' }) // or { name: 'edit', id: null | string }
  const { toast, node: toastNode } = useToast()

  function open(next) {
    setScreen(next)
    window.scrollTo(0, 0)
  }

  return (
    <>
      {screen.name === 'list' ? (
        <TestsList onCount={onCount} toast={toast} onCreate={() => open({ name: 'edit', id: null })} onEdit={(id) => open({ name: 'edit', id })} />
      ) : (
        <TestEditor
          key={screen.id || 'new'}
          id={screen.id}
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

function windowText(t) {
  if (t.opensAt && t.closesAt) return [when(t.opensAt), 'to ' + when(t.closesAt)]
  if (t.opensAt) return ['Opens ' + when(t.opensAt), 'No closing time']
  if (t.closesAt) return ['Open now', 'Closes ' + when(t.closesAt)]
  return ['Always open', null]
}

function TestsList({ onCount, toast, onCreate, onEdit }) {
  const [tests, setTests] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(null) // id of the row being changed

  const load = useCallback(
    () =>
      listTests()
        .then((list) => {
          setError(null)
          setTests(list)
          if (onCount) onCount(list.length)
        })
        .catch((e) => setError(e.message)),
    [onCount],
  )

  useEffect(() => {
    load()
  }, [load])

  async function togglePublish(t) {
    setBusy(t.id)
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
    setBusy(t.id)
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
          <h1>Tests</h1>
          <p>Create a test from a JSON question paper, then publish it when it is ready for students.</p>
        </div>
        <div className="actions">
          <button className="btn btn-primary" type="button" onClick={onCreate}>
            Create test
          </button>
        </div>
      </div>

      {error ? (
        <div className="alert a-err" role="alert">
          <span className="ts-grow">Couldn&apos;t load tests. {error}</span>
          <button className="btn btn-outline btn-sm" type="button" onClick={load}>
            Try again
          </button>
        </div>
      ) : tests == null ? (
        <div className="table-wrap ts-loading" aria-busy="true">
          <p className="hint">Loading tests…</p>
        </div>
      ) : tests.length === 0 ? (
        <div className="card ts-empty">
          <h2>No tests yet</h2>
          <p className="hint">Fill in the details, paste or upload the question paper as JSON, check the preview and publish.</p>
          <div>
            <button className="btn btn-primary" type="button" onClick={onCreate}>
              Create your first test
            </button>
          </div>
        </div>
      ) : (
        <div className="table-wrap ts-table">
          <table>
            <thead>
              <tr>
                <th>Test</th>
                <th>Paper</th>
                <th>Window</th>
                <th>Status</th>
                <th>Attempts</th>
                <th>
                  <span className="sr">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {tests.map((t) => {
                const [w1, w2] = windowText(t)
                const published = t.status === 'published'
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
                    <td>
                      {w1}
                      {w2 && <span className="sub">{w2}</span>}
                    </td>
                    <td>
                      <span className={'pill ' + (published ? 'p-published' : 'p-draft')}>{published ? 'Published' : 'Draft'}</span>
                    </td>
                    <td>
                      {t.attempts || 0} started
                      <span className="sub">{t.submitted || 0} submitted</span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-outline btn-sm" type="button" onClick={() => onEdit(t.id)} aria-label={'Edit ' + t.title}>
                          Edit
                        </button>
                        {published ? (
                          <button className="btn btn-outline btn-sm" type="button" disabled={busy === t.id} onClick={() => togglePublish(t)}>
                            Unpublish
                          </button>
                        ) : (
                          <button
                            className="btn btn-dark btn-sm"
                            type="button"
                            disabled={busy === t.id || !t.hasPaper}
                            title={t.hasPaper ? undefined : 'Add the question paper first'}
                            onClick={() => togglePublish(t)}
                          >
                            Publish
                          </button>
                        )}
                        <button className="btn btn-danger btn-sm" type="button" disabled={busy === t.id} onClick={() => remove(t)} aria-label={'Delete ' + t.title}>
                          Delete
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
