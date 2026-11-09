import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import PageHeader from '../sections/PageHeader.jsx'
import { SolutionsList } from '../sections/SolutionsSection.jsx'
import { Empty, LoadError, SearchBox, Segmented, SkeletonRows } from '../sections/States.jsx'

const hasMistakes = (r) => (r.a.wrong || 0) + (r.a.partial || 0) > 0
const matches = (t, q) => !q || (t.title + ' ' + (t.subject || '')).toLowerCase().includes(q)

const GUIDE = [
  ['Start with your mistakes', 'Open “Review mistakes” to see only the questions you got wrong, with the right answer and a worked solution.'],
  ['Then the skipped ones', 'Questions you left blank are often the quickest marks to win back next time.'],
  ['Read the chapter-wise table', 'Each result shows which chapters cost you marks. Revise those first.'],
  ['Retake to check', 'Retake the test once you’ve revised. Your Results page shows the change.'],
]

/* "/student/solutions": every submitted test, and the way into its worked solutions. */
export default function SolutionsPage({ data }) {
  const { status, error, rows, reload } = data
  const [params, setParams] = useSearchParams()
  const show = params.get('show') === 'mistakes' ? 'mistakes' : 'all'
  // The box keeps its own text (fast typing must not wait for the URL); the URL follows it
  const [query, setQuery] = useState(() => params.get('q') || '')
  const q = query.trim().toLowerCase()

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

  const latest = rows.filter((r) => r.latest && matches(r.test, q))
  const withMistakes = latest.filter(hasMistakes)
  const shown = show === 'mistakes' ? withMistakes : latest
  const total = rows.filter((r) => r.latest).length

  return (
    <>
      <PageHeader
        title="Solutions"
        desc={
          status === 'ready' && total
            ? `Worked solutions for ${total} test${total === 1 ? '' : 's'} you’ve submitted, from your latest attempt at each.`
            : 'Every question of a test you’ve submitted, with the correct answer and a worked solution.'
        }
      />

      {status === 'error' ? (
        <LoadError error={error} onRetry={() => reload()} what="your solutions" />
      ) : status === 'loading' ? (
        <SkeletonRows n={3} />
      ) : !total ? (
        <Empty title="No solutions to show yet" text="Solutions open for a test as soon as you submit it." to="/student/tests" action="See your tests" />
      ) : (
        <section className="section" aria-label="Submitted tests">
          <div className="toolbar">
            <Segmented
              label="Show"
              value={show}
              onChange={(k) => setParam('show', k, 'all')}
              options={[
                { key: 'all', label: 'All', count: latest.length },
                { key: 'mistakes', label: 'Has mistakes', count: withMistakes.length },
              ]}
            />
            <SearchBox label="Search submitted tests" placeholder="Search by title or subject" value={query}
              onChange={(v) => {
                setQuery(v)
                setParam('q', v, '')
              }} />
          </div>
          {shown.length ? (
            <SolutionsList rows={shown} />
          ) : q ? (
            <Empty title={'No tests match “' + query.trim() + '”'} text="Try a different word, or clear the search." action="Clear search" onAction={() => {
                setQuery('')
                setParam('q', '', '')
              }} />
          ) : (
            <Empty title="No mistakes to review" text="Your latest attempt at every test has no wrong answers." action="Show all" onAction={() => setParam('show', 'all', 'all')} />
          )}
        </section>
      )}
    </>
  )
}

/* Solutions' right rail: how to get the most out of them. */
export function SolutionsRail() {
  return (
    <section className="card rail-card" aria-labelledby="guide-title">
      <h2 id="guide-title">How to use solutions</h2>
      <ol className="tips">
        {GUIDE.map(([title, text]) => (
          <li key={title}>
            <b>{title}</b>
            <span>{text}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
