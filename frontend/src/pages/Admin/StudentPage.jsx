import { useState } from 'react'
import { Chip, OptionPicker } from './Pickers.jsx'
import {
  addMembers,
  ago,
  batchState,
  day,
  dayTime,
  duration,
  examText,
  getStudent,
  giveTestToStudent,
  gradeText,
  listGroups,
  pctText,
  plural,
  removeMember,
  takeTestFromStudent,
} from './studentsApi.js'
import { listTests } from './testsApi.js'
import LiveStamp from './LiveStamp.jsx'
import { useLive, useNow } from './useLive.js'
import BackButton from '../../components/BackButton.jsx'

/* One student: profile, batch, groups, results, tests in progress and the
   tests given to them directly. */
export default function StudentPage({ id, toast, backText, onBack, onOpenGroup }) {
  const live = useLive(() => Promise.all([getStudent(id), listGroups(), listTests('live')]), id)
  const [busy, setBusy] = useState(null)
  const [notice, setNotice] = useState(null)
  const now = useNow(30000)

  async function act(key, fn, okMsg) {
    setBusy(key)
    setNotice(null)
    try {
      const r = await fn()
      await live.refresh()
      if (r && r.alreadyOpen) setNotice(r.message)
      else if (okMsg) toast(typeof okMsg === 'function' ? okMsg(r) : okMsg)
    } catch (e) {
      toast(e.message, 4000)
    } finally {
      setBusy(null)
    }
  }

  const head = (title, sub, right) => (
    <div className="head ts-head sg-head">
      <div>
        <BackButton onClick={onBack}>
          {backText}
        </BackButton>
        <h1>{title}</h1>
        {sub}
      </div>
      {right}
    </div>
  )

  if (!live.data) {
    return (
      <>
        {head('Student')}
        {live.error ? (
          <div className="alert a-err" role="alert">
            <span className="ts-grow">Couldn&apos;t open this student. {live.error}</span>
            <button className="btn btn-outline btn-sm" type="button" onClick={live.refresh} disabled={live.loading}>
              {live.loading ? 'Trying…' : 'Try again'}
            </button>
          </div>
        ) : (
          <p className="hint">Loading student…</p>
        )}
      </>
    )
  }

  const [{ student: s, results, inProgress, assignedTests }, groups, tests] = live.data
  const st = batchState(s)
  const first = s.name.split(/\s+/)[0]
  const inGroups = new Set(s.groups.map((g) => g.id))
  const assigned = new Set(assignedTests.map((t) => t.id))
  const best = results.reduce((m, r) => (r.pct != null && (m == null || r.pct > m) ? r.pct : m), null)

  const groupOptions = groups.map((g) => ({
    id: g.id,
    label: g.name,
    sub: plural(g.members, 'student') + (g.tests ? ' · ' + plural(g.tests, 'test') : ''),
    disabled: inGroups.has(g.id),
    note: inGroups.has(g.id) ? 'Already in' : undefined,
  }))

  const testOptions = tests.map((t) => {
    const open = t.audience && t.audience.mode === 'all'
    return {
      id: t.id,
      label: t.title,
      sub: [t.subject, t.hasPaper ? plural(t.questionCount, 'question') : 'No paper yet', t.durationMin + ' min'].filter(Boolean).join(' · '),
      tag: t.status === 'published' ? { cls: 'p-published', text: 'Published' } : { cls: 'p-draft', text: 'Draft' },
      note: assigned.has(t.id) ? 'Already given' : open ? 'Already open to all students' : undefined,
      disabled: assigned.has(t.id),
      test: t,
    }
  })

  return (
    <div className="sg-page">
      {head(
        s.name,
        <p>
          {[s.email, s.phone].filter(Boolean).join(' · ')}
          {!s.isActive && <span className="pill p-off sg-inline-pill">Blocked</span>}
        </p>,
        <LiveStamp at={live.at} loading={live.loading} error={live.error} onRefresh={live.refresh} />,
      )}

      <div className="stats sg-stats">
        <div className="card stat">
          <span>Tests submitted</span>
          <b>{results.length}</b>
          <small>{inProgress.length ? inProgress.length + ' in progress' : 'None in progress'}</small>
        </div>
        <div className="card stat">
          <span>Average score</span>
          <b>{pctText(s.stats.avgPct)}</b>
          <small>{results.length ? 'Across ' + plural(results.length, 'test') : 'No results yet'}</small>
        </div>
        <div className="card stat">
          <span>Best score</span>
          <b>{pctText(best)}</b>
          <small>{best != null ? (results.find((r) => r.pct === best) || {}).title : 'No results yet'}</small>
        </div>
        <div className="card stat">
          <span>Last active</span>
          <b className="sg-stat-text">{s.stats.lastAt || s.lastLoginAt ? ago(s.stats.lastAt && (!s.lastLoginAt || s.stats.lastAt > s.lastLoginAt) ? s.stats.lastAt : s.lastLoginAt, now) : 'Never'}</b>
          <small>{s.stats.lastAt ? 'Last test ' + day(s.stats.lastAt) : 'No test yet'}</small>
        </div>
      </div>

      <div className="sg-cols">
        <section className="card sg-card">
          <div className="card-head">
            <h2>Profile</h2>
          </div>
          <div className="summary-list">
            <Row k="Email" v={s.email} />
            <Row k="Mobile" v={s.phone} />
            <Row k="Exam" v={examText(s.exam)} />
            <Row k="Class" v={gradeText(s.grade)} />
            <Row k="Target year" v={s.targetYear} />
            <Row k="City" v={[s.city, s.state].filter(Boolean).join(', ')} />
            <Row k="Joined" v={dayTime(s.joinedAt)} />
            <Row k="Last login" v={s.lastLoginAt ? dayTime(s.lastLoginAt) : 'Never'} />
          </div>
        </section>

        <div className="sg-stack">
          <section className="card sg-card">
            <div className="card-head">
              <h2>Batch</h2>
              <span className={'pill ' + st.cls}>{st.text}</span>
            </div>
            {s.batch ? (
              <div className="sg-batch">
                <b>{s.batch.name}</b>
                <span className="hint">
                  {s.batch.status === 'active'
                    ? 'Active since ' + day(s.batch.activatedAt) + '. Tests given to this batch show up for ' + first + '.'
                    : 'Waiting for payment. Tests given to this batch show up once it is active.'}
                </span>
              </div>
            ) : (
              <p className="hint">{first} hasn&apos;t joined a batch yet, so only tests open to everyone or given to them directly show up.</p>
            )}
          </section>

          <section className="card sg-card">
            <div className="card-head">
              <h2>Groups</h2>
              <OptionPicker
                label="Add to group"
                title={'Add ' + first + ' to a group'}
                placeholder="Search groups"
                empty={groups.length ? 'No group matches.' : 'No groups yet. Create one in the Groups tab.'}
                options={groupOptions}
                busy={busy === 'group'}
                align="right"
                onPick={(g) => act('group', () => addMembers(g.id, [s.id]), `${first} added to "${g.label}"`)}
              />
            </div>
            {s.groups.length ? (
              <div className="sg-chips">
                {s.groups.map((g) => (
                  <Chip key={g.id} busy={busy === 'g:' + g.id} removeLabel={'Remove from ' + g.name} onRemove={() => act('g:' + g.id, () => removeMember(g.id, s.id), `${first} removed from "${g.name}"`)}>
                    <button type="button" className="sg-chip-link" onClick={() => onOpenGroup(g.id)}>
                      {g.name}
                    </button>
                  </Chip>
                ))}
              </div>
            ) : (
              <p className="hint">Not in any group. Tests given to a group show up for everyone in it.</p>
            )}
          </section>
        </div>
      </div>

      <section className="sect">
        <div className="sect-head">
          <div>
            <h2>Results</h2>
            <p>{results.length ? `${plural(results.length, 'test')} submitted, average ${pctText(s.stats.avgPct)}.` : `${first} hasn't submitted a test yet.`}</p>
          </div>
        </div>
        {results.length > 0 && (
          <div className="table-wrap sg-table rs-table">
            <table>
              <thead>
                <tr>
                  <th>Test</th>
                  <th>Submitted</th>
                  <th className="num">Score</th>
                  <th className="num">Percent</th>
                  <th>Correct · wrong · skipped</th>
                  <th>Time taken</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.testId}>
                    <td>
                      <b>{r.title}</b>
                      <span className="sub">
                        {r.subject}
                        {r.autoSubmitted ? ' · Submitted automatically when time ran out' : ''}
                      </span>
                    </td>
                    <td data-label="Submitted">{dayTime(r.submittedAt)}</td>
                    <td className="num" data-label="Score">
                      <b>{r.score}</b>
                      <span className="sg-dim"> / {r.maxScore}</span>
                    </td>
                    <td className="num" data-label="Percent">
                      <PctBar pct={r.pct} />
                    </td>
                    <td data-label="Correct · wrong · skipped">
                      <span className="sg-cws">
                        <span className="ok">{r.correct}</span>
                        <span className="bad">{r.wrong}</span>
                        <span>{r.skipped}</span>
                      </span>
                      {r.partial ? <span className="sub">{r.partial} partly correct</span> : null}
                    </td>
                    <td data-label="Time taken">{duration(r.timeTakenMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {inProgress.length > 0 && (
        <section className="sect">
          <div className="sect-head">
            <div>
              <h2>In progress</h2>
              <p>Started but not submitted. They are submitted automatically when the time runs out.</p>
            </div>
          </div>
          <div className="card list-card">
            {inProgress.map((a) => {
              const left = new Date(a.deadline).getTime() - now
              return (
                <div className="list-row" key={a.testId}>
                  <div>
                    <b>{a.title}</b>
                    <span className="meta">Started {dayTime(a.startedAt)}</span>
                  </div>
                  <span className={'pill ' + (left > 0 ? 'p-scheduled' : 'p-draft')}>{left > 0 ? duration(left) + ' left' : 'Time up'}</span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <section className="sect">
        <div className="sect-head sg-sect-head">
          <div>
            <h2>Tests given to {first}</h2>
            <p>Given to this student directly. Tests open to everyone, or given to their batch or a group they&apos;re in, show up without this.</p>
          </div>
          <OptionPicker
            label="Give a test"
            title={'Give a test to ' + first}
            placeholder="Search tests"
            empty={tests.length ? 'No test matches.' : 'No live tests yet. Create one under Live tests.'}
            options={testOptions}
            busy={busy === 'assign'}
            align="right"
            onPick={(o) => act('assign', () => giveTestToStudent(s.id, o.id), `"${o.label}" given to ${first}`)}
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
          {assignedTests.length ? (
            assignedTests.map((t) => (
              <div className="list-row" key={t.id}>
                <div>
                  <b>{t.title}</b>
                  <span className="meta">{[t.subject, t.questionCount ? plural(t.questionCount, 'question') : null, t.durationMin + ' min'].filter(Boolean).join(' · ')}</span>
                </div>
                <div className="sg-row-end">
                  <span className={'pill ' + (t.status === 'published' ? 'p-published' : 'p-draft')}>{t.status === 'published' ? 'Published' : 'Draft'}</span>
                  <button
                    className="btn btn-danger btn-sm"
                    type="button"
                    disabled={busy === 't:' + t.id}
                    onClick={() => act('t:' + t.id, () => takeTestFromStudent(s.id, t.id), `"${t.title}" taken back`)}
                  >
                    {busy === 't:' + t.id ? 'Taking back…' : 'Take back'}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="hint">No tests given directly.</p>
          )}
        </div>
      </section>
    </div>
  )
}

function Row({ k, v }) {
  return (
    <div>
      <span>{k}</span>
      <span>{v == null || v === '' ? '–' : v}</span>
    </div>
  )
}

export function PctBar({ pct }) {
  if (pct == null) return <span className="sg-dim">–</span>
  const w = Math.max(0, Math.min(100, pct))
  return (
    <span className="sg-pct">
      <span className="sg-pct-n">{pctText(pct)}</span>
      <span className="sg-pct-bar" aria-hidden="true">
        <span style={{ width: w + '%' }} className={pct >= 60 ? 'hi' : pct >= 35 ? 'mid' : 'lo'}></span>
      </span>
    </span>
  )
}
