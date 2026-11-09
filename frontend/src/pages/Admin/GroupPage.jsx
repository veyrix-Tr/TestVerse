import { useState } from 'react'
import { OptionPicker, StudentMultiPicker } from './Pickers.jsx'
import { PctBar } from './StudentPage.jsx'
import {
  addMembers,
  ago,
  batchState,
  day,
  deleteGroup,
  getGroup,
  giveTestToGroup,
  plural,
  removeMember,
  takeTestFromGroup,
  updateGroup,
} from './studentsApi.js'
import { listTests } from './testsApi.js'
import LiveStamp from './LiveStamp.jsx'
import { useLive, useNow } from './useLive.js'
import BackButton from '../../components/BackButton.jsx'

/* One group: name and description, members, tests given, delete. */
export default function GroupPage({ id, toast, backText, onBack, onDeleted, onOpenStudent }) {
  const live = useLive(() => Promise.all([getGroup(id), listTests()]), id)
  const [busy, setBusy] = useState(null)
  const [notice, setNotice] = useState(null)
  const [form, setForm] = useState(null) // { name, description } while editing
  const [formErr, setFormErr] = useState(null)
  const [adding, setAdding] = useState(false)
  const [picked, setPicked] = useState([])
  const now = useNow(30000)

  async function act(key, fn, okMsg) {
    setBusy(key)
    setNotice(null)
    try {
      const r = await fn()
      await live.refresh()
      if (r && r.alreadyOpen) setNotice(r.message)
      else if (okMsg) toast(typeof okMsg === 'function' ? okMsg(r) : okMsg)
      return r
    } catch (e) {
      toast(e.message, 4000)
      return null
    } finally {
      setBusy(null)
    }
  }

  const back = (
    <BackButton onClick={onBack}>
      {backText}
    </BackButton>
  )

  if (!live.data) {
    return (
      <>
        <div className="head ts-head sg-head">
          <div>
            {back}
            <h1>Group</h1>
          </div>
        </div>
        {live.error ? (
          <div className="alert a-err" role="alert">
            <span className="ts-grow">
              {live.error === 'Group not found' ? 'This group no longer exists. It may have been deleted.' : "Couldn't open this group. " + live.error}
            </span>
            <button className="btn btn-outline btn-sm" type="button" onClick={live.refresh}>
              Try again
            </button>
          </div>
        ) : (
          <p className="hint">Loading group…</p>
        )}
      </>
    )
  }

  const [{ group: g, members, tests: given }, tests] = live.data
  const memberIds = new Set(members.map((m) => m.id))
  const givenIds = new Set(given.map((t) => t.id))
  const f = form || { name: g.name, description: g.description || '' }
  const dirty = form && (form.name.trim() !== g.name || form.description.trim() !== (g.description || ''))
  const avgs = members.map((m) => m.stats.avgPct).filter((p) => p != null)
  const groupAvg = avgs.length ? avgs.reduce((a, b) => a + b, 0) / avgs.length : null

  async function saveDetails(e) {
    e.preventDefault()
    setFormErr(null)
    setBusy('details')
    try {
      await updateGroup(g.id, { name: f.name.trim(), description: f.description.trim() })
      await live.refresh()
      setForm(null)
      toast('Group saved')
    } catch (e2) {
      setFormErr({ field: e2.field, message: e2.message })
    } finally {
      setBusy(null)
    }
  }

  async function remove() {
    const msg =
      `Delete the group "${g.name}"?\n\n` +
      `${plural(members.length, 'student')} will leave it` +
      (given.length ? `, and the ${plural(given.length, 'test')} given to this group will no longer show up for them unless they get it another way (everyone, their batch, another group or directly).` : '.') +
      ' Their results are kept. This can’t be undone.'
    if (!window.confirm(msg)) return
    setBusy('delete')
    try {
      await deleteGroup(g.id)
      toast(`"${g.name}" deleted`)
      onDeleted()
    } catch (e) {
      setBusy(null)
      toast(e.message, 4000)
    }
  }

  async function addPicked() {
    const n = picked.length
    const r = await act('add', () => addMembers(g.id, picked.map((s) => s.id)), (x) => (x.added ? plural(x.added, 'student') + ' added' : 'Already in the group'))
    if (r || n === 0) {
      setPicked([])
      setAdding(false)
    }
  }

  const testOptions = tests.map((t) => {
    const open = t.audience && t.audience.mode === 'all'
    return {
      id: t.id,
      label: t.title,
      sub: [t.subject, t.hasPaper ? plural(t.questionCount, 'question') : 'No paper yet', t.durationMin + ' min'].filter(Boolean).join(' · '),
      tag: t.status === 'published' ? { cls: 'p-published', text: 'Published' } : { cls: 'p-draft', text: 'Draft' },
      note: givenIds.has(t.id) ? 'Already given' : open ? 'Already open to all students' : undefined,
      disabled: givenIds.has(t.id),
    }
  })

  return (
    <div className="sg-page">
      <div className="head ts-head sg-head">
        <div>
          {back}
          <h1>{g.name}</h1>
          <p>{g.description || 'No description.'}</p>
        </div>
        <LiveStamp at={live.at} loading={live.loading} error={live.error} onRefresh={live.refresh} />
      </div>

      <div className="stats sg-stats sg-stats-3">
        <div className="card stat">
          <span>Students</span>
          <b>{members.length}</b>
          <small>{members.filter((m) => m.batch && m.batch.status === 'active').length} with an active batch</small>
        </div>
        <div className="card stat">
          <span>Tests given</span>
          <b>{given.length}</b>
          <small>{given.filter((t) => t.status === 'published').length} published</small>
        </div>
        <div className="card stat">
          <span>Average score</span>
          <b>{groupAvg == null ? '–' : Math.round(groupAvg * 10) / 10 + '%'}</b>
          <small>{avgs.length ? 'Of ' + plural(avgs.length, 'student') + ' with results' : 'No results yet'}</small>
        </div>
      </div>

      <form className="card sg-card" onSubmit={saveDetails} aria-labelledby="gp-details">
        <div className="card-head">
          <h2 id="gp-details">Details</h2>
          <span className="hint">Created {day(g.createdAt)} · updated {ago(g.updatedAt, now)}</span>
        </div>
        <div className="form">
          <div>
            <label className="l" htmlFor="gp-name">
              Name
            </label>
            <input
              className="input"
              id="gp-name"
              maxLength={60}
              value={f.name}
              aria-invalid={formErr && formErr.field === 'name' ? 'true' : undefined}
              onChange={(e) => {
                setForm({ ...f, name: e.target.value })
                setFormErr(null)
              }}
            />
            {formErr && formErr.field === 'name' && <p className="ts-field-err">{formErr.message}</p>}
          </div>
          <div>
            <label className="l" htmlFor="gp-desc">
              Description <span className="ts-opt">optional</span>
            </label>
            <input className="input" id="gp-desc" maxLength={300} value={f.description} placeholder="Who is in it and why" onChange={(e) => setForm({ ...f, description: e.target.value })} />
          </div>
        </div>
        {formErr && formErr.field !== 'name' && (
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
              <button className="btn btn-primary" type="submit" disabled={busy === 'details' || !f.name.trim()}>
                {busy === 'details' ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </form>

      <section className="sect">
        <div className="sect-head sg-sect-head">
          <div>
            <h2>Students</h2>
            <p>{members.length ? plural(members.length, 'student') + ' in this group.' : 'Nobody in this group yet.'}</p>
          </div>
          {!adding && (
            <button className="btn btn-primary btn-sm" type="button" onClick={() => setAdding(true)}>
              Add students
            </button>
          )}
        </div>

        {adding && (
          <div className="card sg-card sg-add">
            <div className="card-head">
              <h2>Add students</h2>
            </div>
            <StudentMultiPicker selected={picked} onChange={setPicked} exclude={memberIds} autoFocus />
            <div className="sg-form-foot">
              <span className="hint">{picked.length ? plural(picked.length, 'student') + ' chosen' : 'Tick the students to add.'}</span>
              <div className="actions">
                <button
                  className="btn btn-outline"
                  type="button"
                  onClick={() => {
                    setAdding(false)
                    setPicked([])
                  }}
                >
                  Cancel
                </button>
                <button className="btn btn-primary" type="button" disabled={!picked.length || busy === 'add'} onClick={addPicked}>
                  {busy === 'add' ? 'Adding…' : picked.length ? 'Add ' + plural(picked.length, 'student') : 'Add students'}
                </button>
              </div>
            </div>
          </div>
        )}

        {members.length > 0 && (
          <div className="table-wrap sg-table gm-table">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Batch</th>
                  <th className="num">Tests done</th>
                  <th className="num">Average</th>
                  <th>Added</th>
                  <th>
                    <span className="sr">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const st = batchState(m)
                  return (
                    <tr key={m.id}>
                      <td>
                        <button type="button" className="sg-name" onClick={() => onOpenStudent(m.id)}>
                          {m.name}
                        </button>
                        <span className="sub">{m.email}</span>
                      </td>
                      <td data-label="Batch">
                        {m.batch && <span className="sg-batch-name">{m.batch.name}</span>}
                        <span className={'pill ' + st.cls}>{st.text}</span>
                      </td>
                      <td className="num" data-label="Tests done">
                        {m.stats.submitted}
                      </td>
                      <td className="num" data-label="Average">
                        <PctBar pct={m.stats.avgPct} />
                      </td>
                      <td data-label="Added">{day(m.addedAt)}</td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="btn btn-danger btn-sm"
                            type="button"
                            disabled={busy === 'm:' + m.id}
                            aria-label={'Remove ' + m.name + ' from the group'}
                            onClick={() => act('m:' + m.id, () => removeMember(g.id, m.id), `${m.name} removed`)}
                          >
                            Remove
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
      </section>

      <section className="sect">
        <div className="sect-head sg-sect-head">
          <div>
            <h2>Tests given to this group</h2>
            <p>Everyone in the group can see and take these once they are published.</p>
          </div>
          <OptionPicker
            label="Give a test"
            title="Give a test to this group"
            placeholder="Search tests"
            empty={tests.length ? 'No test matches.' : 'No tests yet. Create one under Tests.'}
            options={testOptions}
            busy={busy === 'give'}
            align="right"
            onPick={(o) => act('give', () => giveTestToGroup(g.id, o.id), `"${o.label}" given to ${g.name}`)}
          />
        </div>
        {notice && (
          <div className="alert a-info" role="status">
            <span className="ts-grow">{notice} Nothing changed.</span>
            <button className="btn btn-outline btn-sm" type="button" onClick={() => setNotice(null)}>
              OK
            </button>
          </div>
        )}
        <div className="card list-card">
          {given.length ? (
            given.map((t) => (
              <div className="list-row" key={t.id}>
                <div>
                  <b>{t.title}</b>
                  <span className="meta">
                    {[t.subject, t.questionCount ? plural(t.questionCount, 'question') : null, t.durationMin + ' min'].filter(Boolean).join(' · ')}
                    {t.audience === 'all' ? ' · Open to everyone right now' : ''}
                  </span>
                </div>
                <div className="sg-row-end">
                  <span className={'pill ' + (t.status === 'published' ? 'p-published' : 'p-draft')}>{t.status === 'published' ? 'Published' : 'Draft'}</span>
                  <button
                    className="btn btn-danger btn-sm"
                    type="button"
                    disabled={busy === 't:' + t.id}
                    onClick={() => act('t:' + t.id, () => takeTestFromGroup(g.id, t.id), `"${t.title}" taken back`)}
                  >
                    Take back
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="hint">No tests given to this group yet.</p>
          )}
        </div>
      </section>

      <section className="card sg-danger">
        <div>
          <h2>Delete this group</h2>
          <p className="hint">Students leave the group and lose access to tests given only through it. Their accounts and results stay.</p>
        </div>
        <button className="btn btn-danger" type="button" onClick={remove} disabled={busy === 'delete'}>
          {busy === 'delete' ? 'Deleting…' : 'Delete group'}
        </button>
      </section>
    </div>
  )
}

