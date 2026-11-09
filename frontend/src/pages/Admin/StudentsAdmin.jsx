import { useCallback, useEffect, useRef, useState } from 'react'
import { useToast } from '../../lib/useToast.jsx'
import GroupPage from './GroupPage.jsx'
import { StudentMultiPicker } from './Pickers.jsx'
import { useDebounced } from './pickerHooks.js'
import StudentPage from './StudentPage.jsx'
import {
  PAGE,
  ago,
  allStudents,
  batchState,
  createGroup,
  day,
  downloadCsv,
  examClass,
  examText,
  gradeText,
  lastActive,
  listBatches,
  listGroups,
  listStudents,
  pctText,
  plural,
} from './studentsApi.js'
import LiveStamp from './LiveStamp.jsx'
import { useLive, useNow } from './useLive.js'

/*
  Admin › Students & groups (real, API-backed). Shown by Admin.jsx in place of
  the demo #view while the sidebar's "Students & groups" item is active.
  Screens: the list (Students | Groups tabs), a student, a group. Every screen
  refreshes itself every 20 s and when the tab regains focus.
*/
export default function StudentsAdmin() {
  const [screen, setScreen] = useState({ name: 'list', tab: 'students' })
  const [filters, setFilters] = useState({ q: '', batch: '', status: '', group: '' })
  const { toast, node: toastNode } = useToast()
  const scrolls = useRef({})

  function open(next) {
    scrolls.current[key(screen)] = window.scrollY
    setScreen({ ...next, back: screen })
    window.scrollTo(0, 0)
  }
  function back() {
    const prev = screen.back || { name: 'list', tab: 'students' }
    setScreen(prev)
    const y = scrolls.current[key(prev)] || 0
    requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, y)))
  }

  let body
  if (screen.name === 'student') {
    body = (
      <StudentPage
        key={screen.id}
        id={screen.id}
        toast={toast}
        backText={screen.back && screen.back.name === 'group' ? 'Back to group' : 'Back to students'}
        onBack={back}
        onOpenGroup={(gid) => open({ name: 'group', id: gid })}
      />
    )
  } else if (screen.name === 'group') {
    body = (
      <GroupPage
        key={screen.id}
        id={screen.id}
        toast={toast}
        backText={screen.back && screen.back.name === 'student' ? 'Back to student' : 'Back to groups'}
        onBack={back}
        onDeleted={() => setScreen({ name: 'list', tab: 'groups' })}
        onOpenStudent={(sid) => open({ name: 'student', id: sid })}
      />
    )
  } else {
    body = (
      <ListScreen
        tab={screen.tab}
        setTab={(tab) => setScreen({ name: 'list', tab })}
        filters={filters}
        setFilters={setFilters}
        toast={toast}
        onOpenStudent={(id) => open({ name: 'student', id })}
        onOpenGroup={(id) => open({ name: 'group', id })}
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

const key = (s) => s.name + ':' + (s.id || s.tab || '')

/* ---------------------------------------------------------------------- */

function ListScreen({ tab, setTab, filters, setFilters, toast, onOpenStudent, onOpenGroup }) {
  const dq = useDebounced(filters.q, 300)
  const query = { ...filters, q: dq }
  const want = useRef(PAGE) // rows to keep loaded across refreshes ("Load more")
  const queryKey = JSON.stringify(query)
  const [more, setMore] = useState(false)

  // runs before useLive's reload below (effects run in order)
  useEffect(() => {
    want.current = PAGE
  }, [queryKey])

  const students = useLive(() => listStudents(JSON.parse(queryKey), 0, Math.min(want.current, 500)), queryKey)
  const groups = useLive(listGroups, 'groups')
  const [batches, setBatches] = useState(null)

  useEffect(() => {
    let live = true
    listBatches()
      .then((b) => live && setBatches(b))
      .catch(() => live && setBatches([]))
    return () => {
      live = false
    }
  }, [])

  async function loadMore() {
    const d = students.data
    if (!d) return
    setMore(true)
    try {
      const r = await listStudents(query, d.students.length, PAGE)
      want.current = d.students.length + r.students.length
      students.setData((cur) => {
        const seen = new Set(cur.students.map((s) => s.id))
        return { ...r, students: [...cur.students, ...r.students.filter((s) => !seen.has(s.id))] }
      })
    } catch (e) {
      toast(e.message, 4000)
    } finally {
      setMore(false)
    }
  }

  const refresh = useCallback(() => {
    students.refresh()
    groups.refresh()
  }, [students, groups])

  const s = students.data && students.data.summary
  const at = students.at && groups.at ? Math.min(students.at, groups.at) : students.at || groups.at

  return (
    <>
      <div className="head sg-head">
        <div>
          <h1>Students &amp; groups</h1>
          <p>Everyone who has signed up, their batch and results. Put students in groups to give them tests together.</p>
        </div>
        <LiveStamp at={at} loading={students.loading || groups.loading} error={students.error || groups.error} onRefresh={refresh} />
      </div>

      <div className="stats sg-stats">
        <Stat label="Students" value={s && s.students} note="Signed up in total" />
        <Stat label="Active batches" value={s && s.activeBatches} note={s ? (s.students ? Math.round((s.activeBatches / s.students) * 100) + '% of students' : 'No students yet') : ''} />
        <Stat label="Joined this week" value={s && s.joinedThisWeek} note="In the last 7 days" />
        <Stat label="Tests submitted" value={s && s.submittedThisWeek} note="In the last 7 days" />
      </div>

      <div className="sg-tabs" role="tablist" aria-label="Students and groups">
        <button type="button" role="tab" id="sg-tab-students" aria-selected={tab === 'students' ? 'true' : 'false'} onClick={() => setTab('students')}>
          Students {s && <span>{s.students}</span>}
        </button>
        <button type="button" role="tab" id="sg-tab-groups" aria-selected={tab === 'groups' ? 'true' : 'false'} onClick={() => setTab('groups')}>
          Groups {groups.data && <span>{groups.data.length}</span>}
        </button>
      </div>

      {tab === 'students' ? (
        <StudentsTab
          live={students}
          filters={filters}
          setFilters={setFilters}
          settled={dq === filters.q}
          batches={batches}
          groups={groups.data}
          onOpen={onOpenStudent}
          onMore={loadMore}
          more={more}
          toast={toast}
        />
      ) : (
        <GroupsTab live={groups} toast={toast} onOpen={onOpenGroup} />
      )}
    </>
  )
}

function Stat({ label, value, note }) {
  return (
    <div className="card stat">
      <span>{label}</span>
      <b>{value == null ? '–' : value.toLocaleString('en-IN')}</b>
      <small>{note}</small>
    </div>
  )
}

/* ---------------------------------------------------------------------- */

function StudentsTab({ live, filters, setFilters, settled, batches, groups, onOpen, onMore, more, toast }) {
  const [exporting, setExporting] = useState(false)
  const now = useNow(30000)
  const d = live.data
  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value, ...(k === 'batch' && e.target.value === 'none' ? { status: '' } : {}) }))
  const filtered = !!(filters.q.trim() || filters.batch || filters.status || filters.group)

  async function exportCsv() {
    setExporting(true)
    try {
      const rows = await allStudents(filters)
      const head = ['Name', 'Email', 'Mobile', 'Batch', 'Batch status', 'Exam', 'Class', 'Target year', 'City', 'State', 'Groups', 'Tests done', 'Average %', 'Last test', 'Last login', 'Joined']
      downloadCsv('testverse-students-' + new Date().toISOString().slice(0, 10) + '.csv', [
        head,
        ...rows.map((s) => [
          s.name,
          s.email,
          s.phone,
          s.batch ? s.batch.name : '',
          s.batch ? (s.batch.status === 'active' ? 'Active' : 'Pending') : 'No batch',
          examText(s.exam),
          gradeText(s.grade),
          s.targetYear || '',
          s.city,
          s.state,
          s.groups.map((g) => g.name).join('; '),
          s.stats.submitted,
          s.stats.avgPct == null ? '' : s.stats.avgPct,
          day(s.stats.lastAt),
          day(s.lastLoginAt),
          day(s.joinedAt),
        ]),
      ])
      toast('Exported ' + plural(rows.length, 'student'))
    } catch (e) {
      toast("Couldn't export. " + e.message, 4000)
    } finally {
      setExporting(false)
    }
  }

  return (
    <section className="sect" aria-labelledby="sg-tab-students">
      <div className="filters sg-filters">
        <label className="sr" htmlFor="sg-q">
          Search students
        </label>
        <input
          className="input search"
          id="sg-q"
          type="search"
          data-live-ok
          value={filters.q}
          placeholder="Search name, email, mobile or city"
          onChange={set('q')}
        />
        <Select id="sg-batch" label="Batch" value={filters.batch} onChange={set('batch')}>
          <option value="">All batches</option>
          {(batches || []).map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
          <option value="none">No batch</option>
        </Select>
        <Select id="sg-status" label="Status" value={filters.batch === 'none' ? 'none' : filters.status} onChange={set('status')} disabled={filters.batch === 'none'}>
          <option value="">Any status</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="none">No batch</option>
        </Select>
        <Select id="sg-group" label="Group" value={filters.group} onChange={set('group')}>
          <option value="">All groups</option>
          {(groups || []).map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </Select>
        <div className="sg-filters-end">
          {filtered && (
            <button className="btn btn-outline btn-sm sg-clear" type="button" onClick={() => setFilters({ q: '', batch: '', status: '', group: '' })}>
              Clear filters
            </button>
          )}
          <button className="btn btn-outline btn-sm" type="button" onClick={exportCsv} disabled={exporting || !d || !d.total}>
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
      </div>

      {live.error && !d ? (
        <div className="alert a-err" role="alert">
          <span className="ts-grow">Couldn&apos;t load students. {live.error}</span>
          <button className="btn btn-outline btn-sm" type="button" onClick={live.refresh}>
            Try again
          </button>
        </div>
      ) : !d ? (
        <div className="table-wrap ts-loading" aria-busy="true">
          <p className="hint">Loading students…</p>
        </div>
      ) : !d.students.length ? (
        <div className="card ts-empty">
          <h2>{filtered ? 'No students match' : 'No students yet'}</h2>
          <p className="hint">
            {filtered
              ? 'Try a different search or clear the filters.'
              : 'Students appear here as soon as they sign up on the website. This page refreshes itself.'}
          </p>
          {filtered && (
            <div>
              <button className="btn btn-outline" type="button" onClick={() => setFilters({ q: '', batch: '', status: '', group: '' })}>
                Clear filters
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          <p className="hint sg-count" aria-live="polite">
            {d.students.length < d.total ? `Showing ${d.students.length} of ${plural(d.total, 'student')}` : plural(d.total, 'student')}
            {filtered ? ' matching' : ''}
            {!settled || live.loading ? <span className="sg-dim"> · updating…</span> : null}
          </p>
          <div className={'table-wrap sg-table st-table' + (!settled ? ' sg-stale' : '')}>
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Mobile</th>
                  <th>Batch</th>
                  <th>Exam · class</th>
                  <th>City</th>
                  <th className="num">Tests</th>
                  <th className="num">Average</th>
                  <th>Last active</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {d.students.map((s) => {
                  const st = batchState(s)
                  const la = lastActive(s)
                  return (
                    <tr key={s.id} className="sg-row" onClick={() => onOpen(s.id)}>
                      <td>
                        <button type="button" className="sg-name" onClick={(e) => (e.stopPropagation(), onOpen(s.id))}>
                          {s.name}
                        </button>
                        <span className="sub">{s.email}</span>
                      </td>
                      <td data-label="Mobile">{s.phone || '–'}</td>
                      <td data-label="Batch">
                        {s.batch && <span className="sg-batch-name">{s.batch.name}</span>}
                        <span className={'pill ' + st.cls}>{st.text}</span>
                      </td>
                      <td data-label="Exam · class">{examClass(s) || '–'}</td>
                      <td data-label="City">{s.city || '–'}</td>
                      <td className="num" data-label="Tests done">
                        {s.stats.submitted}
                      </td>
                      <td className="num" data-label="Average">
                        {pctText(s.stats.avgPct)}
                      </td>
                      <td data-label="Last active">
                        {la ? ago(la.at, now) : <span className="sg-dim">Never</span>}
                        {la && <span className="sub">{la.what === 'Logged in' ? 'Last login' : 'Last test'}</span>}
                      </td>
                      <td data-label="Joined">{day(s.joinedAt)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {d.students.length < d.total && (
            <div className="sg-more">
              <button className="btn btn-outline" type="button" onClick={onMore} disabled={more}>
                {more ? 'Loading…' : `Load ${Math.min(PAGE, d.total - d.students.length)} more`}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  )
}

function Select({ id, label, children, ...rest }) {
  return (
    <div className="sg-select">
      <label className="sr" htmlFor={id}>
        {label}
      </label>
      <select className="input" id={id} data-live-ok {...rest}>
        {children}
      </select>
    </div>
  )
}

/* ---------------------------------------------------------------------- */

function GroupsTab({ live, toast, onOpen }) {
  const [creating, setCreating] = useState(false)
  const now = useNow(30000)
  const list = live.data

  return (
    <section className="sect" aria-labelledby="sg-tab-groups">
      <div className="sect-head">
        <div>
          <p>Groups let you give a test to many students at once, for example a revision batch or students who need extra practice.</p>
        </div>
        {!creating && (
          <button className="btn btn-primary" type="button" onClick={() => setCreating(true)}>
            New group
          </button>
        )}
      </div>

      {creating && (
        <NewGroup
          onCancel={() => setCreating(false)}
          onCreated={(g) => {
            setCreating(false)
            live.refresh()
            toast(`"${g.name}" created with ${plural(g.members, 'student')}`)
          }}
        />
      )}

      {live.error && !list ? (
        <div className="alert a-err" role="alert">
          <span className="ts-grow">Couldn&apos;t load groups. {live.error}</span>
          <button className="btn btn-outline btn-sm" type="button" onClick={live.refresh}>
            Try again
          </button>
        </div>
      ) : !list ? (
        <div className="card ts-loading">
          <p className="hint">Loading groups…</p>
        </div>
      ) : !list.length ? (
        !creating && (
          <div className="card ts-empty">
            <h2>No groups yet</h2>
            <p className="hint">Create a group, add students to it, then give it tests from here or from a test&apos;s “Who can take this test” section.</p>
            <div>
              <button className="btn btn-primary" type="button" onClick={() => setCreating(true)}>
                Create your first group
              </button>
            </div>
          </div>
        )
      ) : (
        <div className="sg-groups">
          {list.map((g) => (
            <button key={g.id} type="button" className="card sg-group" onClick={() => onOpen(g.id)}>
              <span className="sg-group-name">{g.name}</span>
              <span className="sg-group-desc">{g.description || <span className="sg-dim">No description</span>}</span>
              <span className="sg-group-nums">
                <span>
                  <b>{g.members}</b> {g.members === 1 ? 'student' : 'students'}
                </span>
                <span>
                  <b>{g.tests}</b> {g.tests === 1 ? 'test given' : 'tests given'}
                </span>
              </span>
              <span className="sg-group-foot">Updated {ago(g.updatedAt, now)}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

function NewGroup({ onCancel, onCreated }) {
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [picked, setPicked] = useState([])
  const [err, setErr] = useState(null)
  const [saving, setSaving] = useState(false)

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    try {
      const g = await createGroup({ name: name.trim(), description: desc.trim(), studentIds: picked.map((s) => s.id) })
      onCreated(g)
    } catch (e2) {
      setSaving(false)
      setErr({ field: e2.field, message: e2.message })
    }
  }

  return (
    <form className="card sg-new" onSubmit={save} aria-labelledby="sg-new-h">
      <div className="card-head">
        <h2 id="sg-new-h">New group</h2>
      </div>
      <div className="form">
        <div>
          <label className="l" htmlFor="sg-new-name">
            Name
          </label>
          <input
            className="input"
            id="sg-new-name"
            value={name}
            maxLength={60}
            autoFocus
            placeholder="e.g. Revision group"
            aria-invalid={err && err.field === 'name' ? 'true' : undefined}
            onChange={(e) => {
              setName(e.target.value)
              if (err && err.field === 'name') setErr(null)
            }}
          />
          {err && err.field === 'name' && <p className="ts-field-err">{err.message}</p>}
        </div>
        <div>
          <label className="l" htmlFor="sg-new-desc">
            Description <span className="ts-opt">optional</span>
          </label>
          <input className="input" id="sg-new-desc" value={desc} maxLength={300} placeholder="Who is in it and why" onChange={(e) => setDesc(e.target.value)} />
        </div>
        <div className="full">
          <span className="l ts-l">Students</span>
          <StudentMultiPicker selected={picked} onChange={setPicked} />
        </div>
      </div>
      {err && err.field !== 'name' && (
        <div className="alert a-err" role="alert">
          <span>{err.message}</span>
        </div>
      )}
      <div className="sg-form-foot">
        <span className="hint">{picked.length ? plural(picked.length, 'student') + ' will be added.' : 'You can also add students later.'}</span>
        <div className="actions">
          <button className="btn btn-outline" type="button" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button className="btn btn-primary" type="submit" disabled={saving || !name.trim()}>
            {saving ? 'Creating…' : 'Create group'}
          </button>
        </div>
      </div>
    </form>
  )
}
