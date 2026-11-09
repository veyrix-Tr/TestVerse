import { Link, useSearchParams } from 'react-router-dom'
import { BestBars, ScoreTrend } from '../sections/Charts.jsx'
import PageHeader, { Stats } from '../sections/PageHeader.jsx'
import { AttemptsTable } from '../sections/ResultsSection.jsx'
import { Empty, LoadError, SkeletonRows } from '../sections/States.jsx'
import { pctOf, signed, summaryOf } from '../useTests.js'

const SORTS = [
  { key: 'newest', label: 'Newest first', by: () => 0 },
  { key: 'best', label: 'Best score first', by: (x, y) => (pctOf(y.a) || 0) - (pctOf(x.a) || 0) },
  { key: 'worst', label: 'Lowest score first', by: (x, y) => (pctOf(x.a) || 0) - (pctOf(y.a) || 0) },
]

/* "/student/results": headline numbers, the score trend, best per test, and every attempt. */
export default function ResultsPage({ data }) {
  const { status, error, tests, rows, reload } = data
  const [params, setParams] = useSearchParams()
  const sum = summaryOf(tests, rows)
  const taken = tests.filter((t) => (t.history || []).length)
  const testId = taken.some((t) => t.id === params.get('test')) ? params.get('test') : ''
  const sort = SORTS.find((s) => s.key === params.get('sort')) || SORTS[0]
  // rows arrive newest first, so a stable sort keeps ties newest first
  const shown = rows.filter((r) => !testId || r.test.id === testId).sort(sort.by)

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

  return (
    <>
      <PageHeader
        title="Results"
        desc="Every attempt you’ve submitted: how you scored, how it’s changing, and where to look next."
        actions={
          rows.length ? (
            <Link className="btn btn-outline" to="/student/solutions">
              Go to solutions
            </Link>
          ) : null
        }
      >
        {status === 'error' ? null : (
          <Stats
            loading={status === 'loading'}
            items={[
              { label: 'Tests taken', v: sum.taken, unit: '/ ' + sum.total },
              { label: 'Attempts', v: sum.attempts },
              { label: 'Average score', v: sum.avg, unit: '%', empty: 'No score yet' },
              { label: 'Best score', v: sum.best, unit: '%', empty: 'No score yet' },
              { label: 'Since first attempt', v: sum.change == null ? null : signed(sum.change), unit: sum.change == null ? '' : 'pts', tone: sum.change > 0 ? 'up' : sum.change < 0 ? 'down' : '', empty: 'Needs two attempts' },
            ]}
          />
        )}
      </PageHeader>

      {status === 'error' ? (
        <LoadError error={error} onRetry={() => reload()} what="your results" />
      ) : status === 'loading' ? (
        <>
          <span className="skel skel-chart" aria-hidden="true"></span>
          <SkeletonRows n={4} />
        </>
      ) : !rows.length ? (
        <Empty title="No results yet" text="Submit your first test and your score, accuracy and solutions show up here." to="/student/tests" action="See your tests" />
      ) : (
        <>
          <section className="section" aria-labelledby="charts-title">
            <h2 className="sr" id="charts-title">
              Charts
            </h2>
            <div className="charts">
              <ScoreTrend rows={rows} />
              <BestBars tests={taken} />
            </div>
          </section>

          <section className="section" aria-labelledby="attempts-title">
            <div className="sec-head">
              <div className="sec-head-text">
                <h2 id="attempts-title">All attempts</h2>
                <p>
                  {shown.length} of {rows.length} attempt{rows.length === 1 ? '' : 's'}. Open one for every question with its solution.
                </p>
              </div>
              <div className="sec-head-action filters">
                <label className="field">
                  <span>Test</span>
                  <select className="input" value={testId} onChange={(e) => setParam('test', e.target.value, '')}>
                    <option value="">All tests</option>
                    {taken.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Sort</span>
                  <select className="input" value={sort.key} onChange={(e) => setParam('sort', e.target.value, 'newest')}>
                    {SORTS.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            <p className="legend ans-split" aria-hidden="true">
              <span className="s-c">Correct</span>
              <span className="s-w">Wrong</span>
              <span className="s-s">Skipped</span>
            </p>
            <AttemptsTable rows={shown} />
          </section>
        </>
      )}
    </>
  )
}
