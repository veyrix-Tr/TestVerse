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
  giveSeries,
  giveTestToStudent,
  gradeText,
  listBatches,
  listGroups,
  pctText,
  plural,
  removeMember,
  setStudentBatch,
  takeSeries,
  takeTestFromStudent,
} from './studentsApi.js'
import { listSeries, listTests } from './testsApi.js'
import LiveStamp from './LiveStamp.jsx'
import { useLive, useNow } from './useLive.js'
import BackButton from '../../components/BackButton.jsx'

/* One student: profile, batch, groups, results, tests in progress and the
   tests given to them directly. */
export default function StudentPage({ id, toast, backText, onBack, onOpenGroup }) {
  const live = useLive(() => Promise.all([getStudent(id), listGroups(), listTests('live'), listBatches(), listSeries()]), id, 'student:' + id)
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
        <BackButton onClick={onBack}>{backText}</BackButton>
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

  const [{ student: s, results, inProgress, assignedTests, series: owned = [] }, groups, tests, batches, allSeries] = live.data
  const st = batchState(s)
  const first = s.name.split(/\s+/)[0]
  const isPaid = !!(s.batch && s.batch.status === 'active') // only paid students join groups
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

  // Free access the admin gives: a batch (switching keeps one), test series
  const ownedIds = new Set(owned.map((x) => x.id))
  const batchOptions = batches.map((b) => {
    const current = isPaid && s.batch.id === b.id
    return { id: b.id, label: b.name, sub: plural(b.students, 'student'), disabled: current, note: current ? 'Current batch' : undefined }
  })
  const seriesOptions = allSeries.map((x) => ({
    id: x.id,
    label: x.title,
    sub: [x.exam ? x.exam.toUpperCase() : 'Any exam', x.price ? '₹' + x.price : 'Free', plural(x.tests || 0, 'test')].join(' · '),
    tag: x.status === 'published' ? { cls: 'p-published', text: 'Published' } : { cls: 'p-draft', text: 'Draft' },
    disabled: ownedIds.has(x.id),
    note: ownedIds.has(x.id) ? 'Already has it' : undefined,
  }))
  const howGot = (x) => (x.byAdmin ? 'Given free' : x.paid ? 'Paid ₹' + x.paid : 'Free') + (x.activatedAt ? ' · ' + day(x.activatedAt) : '')
  function takeBatch() {
    const paidNote = s.batch.paid && !s.batch.byAdmin ? ` They paid ₹${s.batch.paid} for it; refund that from Cashfree if needed.` : ''
    if (!window.confirm(`Take back ${first}'s ${s.batch.name} batch? Its tests stop showing for them.${paidNote}`)) return
    act('batch', () => setStudentBatch(s.id, null), `${s.batch.name} batch taken back`)
  }

  // How many attempts each test has, to label the first one when there are retakes
  const attemptsOf = (results || []).reduce((m, r) => ({ ...m, [r.testId]: (m[r.testId] || 0) + 1 }), {})
  const testsDone = Object.keys(attemptsOf).length
  const retakes = results.length - testsDone

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
          <b>{testsDone}</b>
          <small>
            {retakes ? plural(retakes, 'retake') + ' · ' : ''}
            {inProgress.length ? inProgress.length + ' in progress' : 'None in progress'}
          </small>
        </div>
        <div className="card stat">
          <span>Average score</span>
          <b>{pctText(s.stats.avgPct)}</b>
          <small>{results.length ? 'Across ' + plural(results.length, 'attempt') : 'No results yet'}</small>
        </div>
        <div className="card stat">
          <span>Best score</span>
          <b>{pctText(best)}</b>
          <small>{best != null ? (results.find((r) => r.pct === best) || {}).title : 'No results yet'}</small>
        </div>
        <div className="card stat">
          <span>Last active</span>
          <b className="sg-stat-text">
            {s.stats.lastAt || s.lastLoginAt ? ago(s.stats.lastAt && (!s.lastLoginAt || s.stats.lastAt > s.lastLoginAt) ? s.stats.lastAt : s.lastLoginAt, now) : 'Never'}
          </b>
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
              <div className="sg-title-row">
                <h2>Batch</h2>
                <span className={'pill ' + st.cls}>{st.text}</span>
              </div>
              <OptionPicker
                label={isPaid ? 'Change batch' : 'Give batch'}
                title={(isPaid ? 'Move ' + first + ' to another batch' : 'Give ' + first + ' a batch') + ' (free, no payment)'}
                placeholder="Search batches"
                empty="No batches."
                options={batchOptions}
                busy={busy === 'batch'}
                align="right"
                onPick={(b) => act('batch', () => setStudentBatch(s.id, b.id), `${b.label} batch given to ${first}`)}
              />
            </div>
            {s.batch ? (
              <div className="sg-batch">
                <b>{s.batch.name}</b>
                <span className="hint">
                  {s.batch.status === 'active'
                    ? (s.batch.byAdmin ? 'Given free' : s.batch.paid ? 'Paid ₹' + s.batch.paid : 'Active') +
                      ' since ' +
                      day(s.batch.activatedAt) +
                      '. Tests given to this batch show up for ' +
                      first +
                      '.'
                    : 'Waiting for payment. Tests given to this batch show up once it is active. Give it above to activate it free.'}
                </span>
                {isPaid && (
                  <div>
                    <button className="btn btn-danger btn-sm" type="button" disabled={busy === 'batch'} onClick={takeBatch}>
                      Take back batch
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p className="hint">{first} hasn&apos;t joined a batch yet, so only tests open to everyone or given to them directly show up.</p>
            )}
          </section>

          <section className="card sg-card">
            <div className="card-head">
              <h2>Test series</h2>
              <OptionPicker
                label="Give a series"
                title={'Give ' + first + ' a test series (free, no payment)'}
                placeholder="Search test series"
                empty={allSeries.length ? 'No test series matches.' : 'No test series yet. Create one under Test series.'}
                options={seriesOptions}
                busy={busy === 'series'}
                align="right"
                onPick={(o) => act('series', () => giveSeries(s.id, o.id), `"${o.label}" given to ${first}`)}
              />
            </div>
            {owned.length ? (
              <div>
                {owned.map((x) => (
                  <div className="list-row" key={x.id}>
                    <div>
                      <b>{x.title}</b>
                      <span className="meta">{howGot(x) + (x.status === 'published' ? '' : ' · Not published yet')}</span>
                    </div>
                    <button
                      className="btn btn-danger btn-sm"
                      type="button"
                      disabled={busy === 's:' + x.id}
                      onClick={() => {
                        const paidNote = x.paid && !x.byAdmin ? ` They paid ₹${x.paid} for it; refund that from Cashfree if needed.` : ''
                        if (window.confirm(`Take back "${x.title}" from ${first}?${paidNote}`)) act('s:' + x.id, () => takeSeries(s.id, x.id), `"${x.title}" taken back`)
                      }}
                    >
                      {busy === 's:' + x.id ? 'Taking back…' : 'Take back'}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="hint">No test series yet. Series {first} buys, or you give here, show up under Test series for them.</p>
            )}
          </section>

          <section className="card sg-card">
            <div className="card-head">
              <h2>Groups</h2>
              {isPaid && (
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
              )}
            </div>
            {s.groups.length ? (
              <div className="sg-chips">
                {s.groups.map((g) => (
                  <Chip
                    key={g.id}
                    busy={busy === 'g:' + g.id}
                    removeLabel={'Remove from ' + g.name}
                    onRemove={() => act('g:' + g.id, () => removeMember(g.id, s.id), `${first} removed from "${g.name}"`)}
                  >
                    <button type="button" className="sg-chip-link" onClick={() => onOpenGroup(g.id)}>
                      {g.name}
                    </button>
                  </Chip>
                ))}
              </div>
            ) : (
              <p className="hint">
                {isPaid
                  ? 'Not in any group. Tests given to a group show up for everyone in it.'
                  : `Groups are for paid students. ${first} can join one once their batch is active.`}
              </p>
            )}
          </section>
        </div>
      </div>

      <section className="sect">
        <div className="sect-head">
          <div>
            <h2>Results</h2>
            <p>
              {results.length
                ? `${plural(testsDone, 'test')} submitted${retakes ? ` (${plural(results.length, 'attempt')} including retakes)` : ''}, average ${pctText(s.stats.avgPct)}.`
                : `${first} hasn't submitted a test yet.`}
            </p>
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
                  <tr key={r.testId + ':' + r.attemptNo}>
                    <td>
                      <b>{r.title}</b>
                      <span className="sub">
                        {r.subject}
                        {r.attemptNo > 1 ? ` · Retake · attempt ${r.attemptNo}` : attemptsOf[r.testId] > 1 ? ' · Attempt 1' : ''}
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
