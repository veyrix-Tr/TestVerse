import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import PageHeader from '../sections/PageHeader.jsx'
import { Empty, LoadError, SearchBox, Segmented } from '../sections/States.jsx'
import { TestCard } from '../sections/TestsSection.jsx'
import { GROUPS } from '../useTests.js'

// Filters over the groups in useTests.GROUPS; "To do" is what can be done right now
const FILTERS = [
  { key: 'all', label: 'All', groups: ['in-progress', 'open', 'upcoming', 'done', 'closed'] },
  { key: 'todo', label: 'To do', groups: ['in-progress', 'open'] },
  { key: 'in-progress', label: 'In progress', groups: ['in-progress'] },
  { key: 'upcoming', label: 'Upcoming', groups: ['upcoming'] },
  { key: 'done', label: 'Completed', groups: ['done'] },
  { key: 'closed', label: 'Closed', groups: ['closed'] },
]

const EMPTY = {
  todo: ['You’re all caught up', 'Nothing to take right now. Upcoming tests appear here once they open.'],
  'in-progress': ['Nothing in progress', 'A test you’ve started but not submitted shows up here.'],
  upcoming: ['Nothing scheduled', 'Tests with a start time show up here before they open.'],
  done: ['Nothing completed yet', 'Finish a test and it shows up here with your score.'],
  closed: ['Nothing closed', 'Tests that close before you start them show up here.'],
}

const matches = (t, q) => !q || (t.title + ' ' + (t.subject || '')).toLowerCase().includes(q)

/* "/student/tests": every test for this student, grouped by what they can do with it. */
export default function TestsPage({ me, data }) {
  const { status, error, tests, groups, now, reload } = data
  const [params, setParams] = useSearchParams()
  const show = FILTERS.some((f) => f.key === params.get('show')) ? params.get('show') : 'all'
  // The box keeps its own text (fast typing must not wait for the URL); the URL follows it
  const [query, setQuery] = useState(() => params.get('q') || '')
  const q = query.trim().toLowerCase()
  const filter = FILTERS.find((f) => f.key === show)

  function setParam(key, value, fallback) {
    setParams(
      (p) => {
        const next = new URLSearchParams(p)
        if (!value || value === fallback) next.delete(key)
        else next.set(key, value)
        return next
      },
      { replace: true, preventScrollReset: true },
    )
  }

  const found = Object.fromEntries(GROUPS.map((g) => [g.key, groups[g.key].filter((t) => matches(t, q))]))
  const count = (f) => f.groups.reduce((n, k) => n + found[k].length, 0)
  const shown = GROUPS.filter((g) => filter.groups.includes(g.key) && found[g.key].length)
  const todo = groups['in-progress'].length + groups.open.length

  const desc =
    status !== 'ready'
      ? me.subscription
        ? 'Tests published for your batch, with your score once you finish.'
        : 'Your free full-length mocks, on the real exam pattern.'
      : `${tests.length} test${tests.length === 1 ? '' : 's'} · ${todo} to do · ${groups.upcoming.length} upcoming · ${groups.done.length} completed`

  return (
    <>
      <PageHeader title="Your tests" desc={desc} />

      {status === 'error' ? (
        <LoadError error={error} onRetry={() => reload()} />
      ) : status === 'loading' ? (
        <ul className="tcards" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <li key={i} className="tcard is-skeleton">
              <span></span>
              <span></span>
              <span></span>
            </li>
          ))}
        </ul>
      ) : !tests.length ? (
        <Empty title="No tests yet" text={me.subscription ? 'Your teachers will publish them here.' : 'Your free mocks will appear here.'} />
      ) : (
        <section className="section" aria-label="Tests">
          <div className="toolbar">
            <Segmented label="Show tests" value={show} onChange={(k) => setParam('show', k, 'all')} options={FILTERS.map((f) => ({ key: f.key, label: f.label, count: count(f) }))} />
            <SearchBox label="Search tests" placeholder="Search by title or subject" value={query}
              onChange={(v) => {
                setQuery(v)
                setParam('q', v, '')
              }} />
          </div>

          {shown.length ? (
            <div className="groups">
              {shown.map((g) => (
                <section className="group" key={g.key} aria-labelledby={'g-' + g.key}>
                  <div className="group-head">
                    <h2 id={'g-' + g.key}>
                      {g.title}
                      <span className="group-count">{found[g.key].length}</span>
                    </h2>
                    <p>{g.desc}</p>
                  </div>
                  <ul className="tcards">
                    {found[g.key].map((t) => (
                      <TestCard key={t.id} t={t} now={now} />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          ) : q ? (
            <Empty title={'No tests match “' + query.trim() + '”'} text="Try a different word, or clear the search." action="Clear search" onAction={() => {
                setQuery('')
                setParam('q', '', '')
              }} />
          ) : (
            <Empty title={EMPTY[show][0]} text={EMPTY[show][1]} action="Show all tests" onAction={() => setParam('show', 'all', 'all')} />
          )}
        </section>
      )}
    </>
  )
}
