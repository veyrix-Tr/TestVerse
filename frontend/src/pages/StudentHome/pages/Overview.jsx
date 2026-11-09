import { useState } from 'react'
import { Link } from 'react-router-dom'
import PendingLink from '../../../components/PendingLink.jsx'
import { greet, hms } from '../../../lib/format.js'
import SectionHead from '../SectionHead.jsx'
import { TrendCard } from '../sections/Charts.jsx'
import PageHeader, { Stats } from '../sections/PageHeader.jsx'
import { RecentResults } from '../sections/ResultsSection.jsx'
import { BatchCard, FreePlanCard, TipsCard } from '../sections/SideCards.jsx'
import { LoadError, SkeletonRows } from '../sections/States.jsx'
import { subjectsOf, until, when } from '../fmt.js'
import { TestHero } from '../sections/TestsSection.jsx'
import { heroTest, summaryOf, testHref } from '../useTests.js'

/* One test to do, as a compact row: what it is, when, and the button for it. */
function UpNextRow({ t, now }) {
  const s = t.status
  const href = testHref(t)
  const tries = (t.history || []).length
  let state, action
  if (s === 'in-progress') {
    state = <span className="status status-amber">{hms(Date.parse(t.attempt.deadline) - now)} left</span>
    action = (
      <PendingLink className="btn btn-primary btn-sm" to={href}>
        {tries ? 'Resume retake' : 'Resume'}
      </PendingLink>
    )
  } else if (s === 'open') {
    state = <span className="meta">{t.closesAt ? 'Closes ' + when(t.closesAt) : 'Open now'}</span>
    action = (
      <PendingLink className="btn btn-primary btn-sm" to={href}>
        Start
      </PendingLink>
    )
  } else {
    state = <span className="status status-blue">Opens in {until(Date.parse(t.opensAt) - now)}</span>
    action = (
      <PendingLink className="btn btn-outline btn-sm" to={href}>
        Instructions
      </PendingLink>
    )
  }
  return (
    <li className="row">
      <div className="row-main">
        <span className="row-title">{t.title}</span>
        <span className="meta">{[subjectsOf(t).join(', '), t.questionCount + ' questions', t.durationMin + ' min'].filter(Boolean).join(' · ')}</span>
      </div>
      <div className="row-side">{state}</div>
      <div className="row-action">{action}</div>
    </li>
  )
}

/* "/student": greeting, headline numbers, the next test, and short lists that lead to the full pages. */
export default function Overview({ me, data }) {
  const { status, error, tests, groups, rows, now, reload } = data
  const [today] = useState(() => new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }))
  const ready = status === 'ready'
  const sum = summaryOf(tests, rows)
  const hero = heroTest(groups)
  const next = [...groups['in-progress'], ...groups.open, ...groups.upcoming].filter((t) => t !== hero).slice(0, 3)
  const toDo = groups['in-progress'].length + groups.open.length + groups.upcoming.length

  return (
    <>
      <PageHeader
        eyebrow={today}
        title={greet() + ', ' + me.first}
        desc={
          <>
            {me.examText ? <span>Preparing for {me.examText}</span> : null}
            {me.batch ? <span className="chip chip-gold">{me.batch}</span> : <span className="chip chip-grey">Free access</span>}
          </>
        }
      >
        <Stats
          loading={status === 'loading'}
          items={[
            { label: 'Tests done', v: sum.taken, unit: '/ ' + sum.total },
            { label: 'Attempts', v: sum.attempts },
            { label: 'Best score', v: sum.best, unit: '%', empty: 'No score yet' },
            { label: 'Average score', v: sum.avg, unit: '%', empty: 'No score yet' },
          ]}
        />
      </PageHeader>

      {status === 'error' ? <LoadError error={error} onRetry={() => reload()} /> : <TestHero test={hero} now={now} loading={status === 'loading'} />}

      <div className="duo">
        <section className="section" aria-labelledby="next-title">
          <SectionHead id="next-title" title="Up next" desc="Tests waiting for you after this one.">
            <Link className="text-link" to="/student/tests">
              See all tests
            </Link>
          </SectionHead>
          {status === 'loading' ? (
            <SkeletonRows n={3} />
          ) : !ready ? null : next.length ? (
            <ul className="card rows">
              {next.map((t) => (
                <UpNextRow key={t.id} t={t} now={now} />
              ))}
            </ul>
          ) : (
            <p className="quiet">{toDo ? 'Nothing else lined up after this one.' : tests.length ? 'You’re all caught up. Retake a completed test any time from Your tests.' : 'No tests yet. Your teachers will publish them here.'}</p>
          )}
        </section>

        <section className="section" aria-labelledby="recent-title">
          <SectionHead id="recent-title" title="Recent results" desc="Your latest submitted attempts.">
            <Link className="text-link" to="/student/results">
              See all results
            </Link>
          </SectionHead>
          {status === 'loading' ? (
            <SkeletonRows n={3} />
          ) : !ready ? null : rows.length ? (
            <RecentResults rows={rows.slice(0, 3)} />
          ) : (
            <p className="quiet">No results yet. Submit a test and your score shows up here.</p>
          )}
        </section>
      </div>
    </>
  )
}

/* Overview's right rail: the plan, then the score trend (or tips before the first result). */
export function OverviewRail({ me, data }) {
  const { status, rows, free } = data
  return (
    <>
      {me.subscription ? <BatchCard me={me} /> : <FreePlanCard free={free} />}
      {status === 'loading' ? (
        <section className="card rail-card" aria-busy="true" aria-label="Loading your score trend">
          <span className="skel" style={{ width: '50%', height: 18 }}></span>
          <span className="skel" style={{ height: 120, borderRadius: 10 }}></span>
          <span className="skel" style={{ width: '80%' }}></span>
        </section>
      ) : rows.length ? (
        <TrendCard rows={rows} />
      ) : status === 'ready' ? (
        <TipsCard />
      ) : null}
    </>
  )
}
