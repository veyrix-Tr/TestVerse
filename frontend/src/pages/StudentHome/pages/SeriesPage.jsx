import { useCallback, useEffect, useState } from 'react'
import BackButton from '../../../components/BackButton.jsx'
import { api } from '../../../lib/api.js'
import { getToken } from '../../../lib/session.js'
import { useToast } from '../../../lib/useToast.jsx'
import { scopeOf, subjectsOf } from '../fmt.js'
import PageHeader, { Stats } from '../sections/PageHeader.jsx'
import { Empty, LoadError } from '../sections/States.jsx'
import { TestCard } from '../sections/TestsSection.jsx'

const EXAM_LABEL = { jee: 'JEE', neet: 'NEET' }

/*
  /student/test-series — the series on sale, what you already own, and the
  inside of one: its tests with your attempt state. A one-time payment buys a
  series (price 0 = free); until the payment gateway is wired in, the server
  activates the purchase at once when MOCK_PAYMENTS=true (see backend
  seriesController.js). The tests themselves open on the normal CBT screen,
  and once bought they also appear under "Your tests".
*/
export default function SeriesPage({ data }) {
  const { toast, node } = useToast()
  const [list, setList] = useState({ status: 'loading', series: null, error: null })
  const [openId, setOpenId] = useState(null) // the series being looked at, or null
  const [detail, setDetail] = useState({ id: null, status: 'idle', series: null, tests: null, error: null })
  const [reloadKey, setReloadKey] = useState(0) // bump to refetch the open series
  const [buying, setBuying] = useState(null) // series id while a purchase runs
  const [filter, setFilter] = useState('all') // the open series' test filter: 'all' or a scope

  const load = useCallback(() => {
    api('/series', { token: getToken() })
      .then((d) => setList({ status: 'ready', series: d.series, error: null }))
      .catch((e) => setList((s) => (s.series ? { ...s, error: e.message } : { status: 'ready', series: null, error: e.message })))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  /* The inside of one series: fetched whenever the open id (or a refetch) changes.
     While the answer isn't in yet, `detail.id !== openId` reads as loading. */
  useEffect(() => {
    if (!openId) return
    let live = true
    api('/series/' + encodeURIComponent(openId), { token: getToken() })
      .then((d) => live && setDetail({ id: openId, status: 'ready', series: d.series, tests: d.tests, error: null }))
      .catch((e) => live && setDetail({ id: openId, status: 'ready', series: null, tests: null, error: e.message }))
    return () => {
      live = false
    }
  }, [openId, reloadKey])

  /* One-time purchase: free series (or MOCK_PAYMENTS=true) activate at once */
  async function buy(s) {
    if (buying) return
    setBuying(s.id)
    try {
      await api('/series/' + encodeURIComponent(s.id) + '/orders', { method: 'POST', token: getToken() })
      toast(s.price ? 'Purchased — the series is yours now' : 'Unlocked — the series is yours')
      load() // the catalog shows it as owned
      setReloadKey((k) => k + 1) // an open detail picks up ownership too
      if (data && data.reload) data.reload() // "Your tests" gains its tests at once
    } catch (e) {
      toast(e.message, 6000)
    } finally {
      setBuying(null)
    }
  }

  const back = <BackButton
      onClick={() => {
        setOpenId(null)
        setFilter('all')
      }}
    >Back to test series</BackButton>
  const skeleton = (
    <ul className="tcards" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <li key={i} className="tcard is-skeleton">
          <span></span>
          <span></span>
          <span></span>
        </li>
      ))}
    </ul>
  )

  /* ---------- One series: its tests, buyable or yours ---------- */
  if (openId) {
    const loading = detail.id !== openId || detail.status === 'loading'
    const s = loading ? null : detail.series
    const owned = !!(s && s.owned)
    const tests = (s && detail.tests) || []
    const done = tests.filter((t) => t.status === 'done').length
    const scopes = [...new Set(tests.map(scopeOf))].sort((a, b) => (a === 'Full syllabus' ? -1 : b === 'Full syllabus' ? 1 : a.localeCompare(b)))
    const active = filter !== 'all' && scopes.includes(filter) ? filter : 'all'
    const shown = active === 'all' ? tests : tests.filter((t) => scopeOf(t) === active)
    const tabs =
      scopes.length > 1 ? (
        <div className="filter-tabs sr-tabs" role="group" aria-label="Filter tests by subject">
          {['all', ...scopes].map((v) => (
            <button key={v} type="button" aria-pressed={active === v ? 'true' : 'false'} onClick={() => setFilter(v)}>
              {v === 'all' ? 'All' : v}
              <span>{v === 'all' ? tests.length : tests.filter((t) => scopeOf(t) === v).length}</span>
            </button>
          ))}
        </div>
      ) : null

    return (
      <>
        <PageHeader
          back={back}
          eyebrow="Test series"
          title={(s && s.title) || 'Test series'}
          desc={(s && s.description) || undefined}
          actions={
            s ? (
              <div className="sr-buy">
                <span className="sr-price">
                  {s.price ? '₹' + s.price : 'Free'}
                  {s.price ? <small> one-time</small> : null}
                </span>
                {owned ? (
                  <span className="status status-green">Yours</span>
                ) : (
                  <button className="btn btn-gold" type="button" disabled={buying === s.id} onClick={() => buy(s)}>
                    {buying === s.id ? '…' : s.price ? 'Buy ₹' + s.price : 'Get this series'}
                  </button>
                )}
              </div>
            ) : null
          }
        >
          {s ? (
            <Stats
              items={[
                { label: 'Tests', v: s.tests },
                { label: 'Questions', v: s.questions },
                { label: 'Marks', v: s.marks },
              ]}
            />
          ) : null}
        </PageHeader>

        {owned && tests.length ? (
          <div className="sr-progress" aria-label="Your progress">
            <div>
              <b>
                {done} of {tests.length}
              </b>{' '}
              tests completed
            </div>
            <span className="tile-bar" aria-hidden="true">
              <i style={{ width: Math.round((done / tests.length) * 100) + '%' }}></i>
            </span>
          </div>
        ) : null}

        {loading ? (
          skeleton
        ) : detail.error ? (
          <LoadError error={detail.error} onRetry={() => setReloadKey((k) => k + 1)} what="this series" />
        ) : !s ? (
          skeleton
        ) : !owned ? (
          <>
            <div className="card state-card sr-unlock">
              <div>
                <h3>Buy the series to open its tests</h3>
                <p className="meta">You can see what&apos;s inside first — each test opens on the normal exam screen once the series is yours.</p>
              </div>
              <button className="btn btn-gold" type="button" disabled={buying === s.id} onClick={() => buy(s)}>
                {buying === s.id ? '…' : s.price ? 'Buy ₹' + s.price : 'Get this series'}
              </button>
            </div>
            {tabs}
            <ul className="sr-locked">
              {shown.map((t) => (
                <li key={t.id}>
                  <span className="sr-n" aria-hidden="true">
                    {tests.indexOf(t) + 1}
                  </span>
                  <span className="sr-locked-text">
                    <b>{t.title}</b>
                    <span>
                      <i className={'subj-tag' + (scopeOf(t) === 'Full syllabus' ? ' is-full' : '')}>{scopeOf(t)}</i>{' '}
                      {subjectsOf(t).length > 1 ? subjectsOf(t).join(' · ') + ' · ' : ''}
                      {t.questionCount ? t.questionCount + ' questions · ' : ''} {t.durationMin} min · {t.totalMarks} marks
                    </span>
                  </span>
                  <svg className="sr-lock" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="4" y="11" width="16" height="10" rx="2" />
                    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                  </svg>
                </li>
              ))}
            </ul>
          </>
        ) : !tests.length ? (
          <Empty title="No tests yet" text="The first test of this series will appear here as soon as it's added." />
        ) : (
          <section className="section" aria-label="Tests in this series">
            {tabs}
            <ul className="tcards">
              {shown.map((t) => (
                <TestCard key={t.id} t={{ ...t, seriesTitle: null }} now={data ? data.now : 0} />
              ))}
            </ul>
          </section>
        )}
        {node}
      </>
    )
  }

  /* ---------- The catalog: series on sale ---------- */
  return (
    <>
      <PageHeader
        title="Test series"
        desc={
          list.series
            ? list.series.length
              ? `${list.series.length} series on sale · buy once, keep yours`
              : 'Complete series you buy once and take at your own pace.'
            : 'Complete series you buy once and take at your own pace — on top of the tests your teachers give you.'
        }
      />

      {list.error && !list.series ? (
        <LoadError error={list.error} onRetry={load} what="test series" />
      ) : !list.series ? (
        skeleton
      ) : !list.series.length ? (
        <Empty title="No test series on sale yet" text="New series from your teachers appear here as soon as they're published." />
      ) : (
        <>
          {[
            ['Your series', list.series.filter((s) => s.owned)],
            [list.series.some((s) => s.owned) ? 'More series' : null, list.series.filter((s) => !s.owned)],
          ].map(([head, items]) =>
            items.length ? (
              <section className="section sr-group" key={head || 'all'} aria-label={head || 'Test series'}>
                {head ? <h2 className="sr-group-head">{head}</h2> : null}
                <ul className="tcards sr-cards">
                  {items.map((s) => (
                    <SeriesCard key={s.id} s={s} buying={buying === s.id} onBuy={() => buy(s)} onOpen={() => setOpenId(s.id)} />
                  ))}
                </ul>
              </section>
            ) : null,
          )}
        </>
      )}
      {node}
    </>
  )
}

/* One series as a card: what it is, what's inside, and the price. */
function SeriesCard({ s, buying, onBuy, onOpen }) {
  const mix = s.mix || { full: 0, subjects: [] }
  return (
    <li>
      <article className={'tcard is-series' + (s.owned ? ' is-owned' : '')} aria-labelledby={'sr-' + s.id}>
        <div className="tc-badges">
          {EXAM_LABEL[s.exam] ? <span className="chip chip-grey">{EXAM_LABEL[s.exam]}</span> : null}
          {s.owned ? <span className="status status-green">Yours</span> : !s.price ? <span className="chip chip-gold">Free</span> : null}
        </div>

        <h3 className="tc-title" id={'sr-' + s.id}>
          <button type="button" className="sr-title-btn" onClick={onOpen}>
            {s.title}
          </button>
        </h3>
        {s.description ? <p className="tc-subjects sr-desc">{s.description}</p> : null}

        {mix.full || mix.subjects.length ? (
          <ul className="sr-mix" aria-label="What's inside">
            {mix.full ? (
              <li className="subj-tag is-full">
                {mix.full} full syllabus
              </li>
            ) : null}
            {mix.subjects.map((x) => (
              <li key={x.name} className="subj-tag">
                {x.name} · {x.tests}
              </li>
            ))}
          </ul>
        ) : null}

        <dl className="tc-facts">
          <div>
            <dt>Tests</dt>
            <dd>{s.tests}</dd>
          </div>
          <div>
            <dt>Questions</dt>
            <dd>{s.questions}</dd>
          </div>
          <div>
            <dt>Marks</dt>
            <dd>{s.marks}</dd>
          </div>
        </dl>

        <div className="tc-foot">
          {s.owned ? (
            <span className="tc-when">Bought · open any time</span>
          ) : (
            <span className="sr-price">
              {s.price ? '₹' + s.price : 'Free'}
              {s.price ? <small> one-time</small> : null}
            </span>
          )}
          <div className="tc-actions">
            {s.owned ? (
              <button className="btn btn-primary btn-sm" type="button" onClick={onOpen}>
                Open series
              </button>
            ) : (
              <>
                <button className="btn btn-outline btn-sm" type="button" onClick={onOpen}>
                  View tests
                </button>
                <button className="btn btn-gold btn-sm" type="button" onClick={onBuy} disabled={buying}>
                  {buying ? '…' : s.price ? 'Buy now' : 'Get free'}
                </button>
              </>
            )}
          </div>
        </div>
      </article>
    </li>
  )
}
