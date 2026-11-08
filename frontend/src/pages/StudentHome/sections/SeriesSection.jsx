import { Link } from 'react-router-dom'
import { EXAM, SERIES } from '../../../data/studentDemo.js'
import SectionHead from '../SectionHead.jsx'

const STAGES = [
  ['part', 'Part tests', 'A few chapters from each subject'],
  ['half', 'Half syllabus', 'Class 11, then Class 12 in two halves'],
  ['full', 'Full syllabus', 'Complete syllabus in the exam pattern'],
]

function shortName(t) {
  return { part: 'Part ', half: 'Half ', full: 'Full ' }[t.kind] + t.n
}

function Tile({ t, me, suggested }) {
  let cls = 'tile'
  let status
  if (!me.bought) {
    cls += ' is-locked'
    status = <span className="tile-status muted">Locked</span>
  } else if (t.status === 'done') {
    cls += ' is-done'
    const p = Math.round((t.score / t.max) * 100)
    status = (
      <span className="tile-score">
        <b>
          {t.score}
          <small> / {t.max}</small>
        </b>
        <span className="tile-bar" aria-hidden="true">
          <i style={{ width: p + '%' }}></i>
        </span>
      </span>
    )
  } else if (t.status === 'progress') {
    cls += ' is-progress'
    status = <span className="status status-amber">Resume · {t.left}</span>
  } else if (t.status === 'soon') {
    cls += ' is-locked'
    status = <span className="tile-status muted">Coming soon</span>
  } else if (t === suggested) {
    cls += ' is-next'
    status = <span className="status status-blue">Suggested next</span>
  } else {
    status = <span className="tile-status">Available</span>
  }

  const body = (
    <>
      <span className="tile-name">{shortName(t)}</span>
      <span className="tile-chapters">{t.chapters}</span>
      {status}
    </>
  )

  if (!me.bought || t.status === 'soon') return <li className={cls}>{body}</li>
  const href = t.status === 'done' ? '/test?test=' + t.id + '&view=result' : '/test?test=' + t.id
  return (
    <li>
      <Link className={cls} to={href} aria-label={t.title + (t.status === 'done' ? ', score ' + t.score + ' of ' + t.max + ', view result' : '')}>
        {body}
      </Link>
    </li>
  )
}

/* The 11-test series: progress, what to do next, then the three stages. */
export default function SeriesSection({ me, done, total }) {
  const suggested = SERIES.find((t) => t.status === 'progress') || SERIES.find((t) => t.status === 'open')
  const pct = Math.round((done / total) * 100)

  return (
    <section className="section" id="series" aria-labelledby="series-title">
      <SectionHead
        id="series-title"
        title={'My ' + EXAM.label + ' test series'}
        desc={me.bought ? done + ' of ' + total + ' tests done. Open any finished test to see its analysis.' : '6 part tests, 3 half-syllabus tests and 2 full-syllabus tests.'}
      >
        {me.bought ? (
          <div className="series-progress">
            <span className="series-pct">{pct}%</span>
            <div className="bar" role="progressbar" aria-valuemin="0" aria-valuemax={total} aria-valuenow={done} aria-label="Test series progress">
              <i style={{ width: pct + '%' }}></i>
            </div>
          </div>
        ) : null}
      </SectionHead>

      {me.bought && suggested ? (
        <div className="card next-card">
          <div className="next-text">
            <p className="eyebrow">{suggested.status === 'progress' ? 'Pick up where you left off' : 'Up next'}</p>
            <h3>{suggested.title}</h3>
            <p className="meta">
              {suggested.chapters}
              {suggested.status === 'progress' ? ' · ' + suggested.left : ''}
            </p>
          </div>
          <Link className="btn btn-primary" to={'/test?test=' + suggested.id}>
            {suggested.status === 'progress' ? 'Resume test' : 'Start ' + suggested.title}
          </Link>
        </div>
      ) : null}

      {!me.bought ? (
        <div className="card buy-card">
          <div className="next-text">
            <p className="eyebrow">Unlock the full series</p>
            <h3>Get all 11 tests for {EXAM.label}</h3>
            <p className="meta">Full analysis and solutions for every test. Coupon and referral codes accepted. All-India live tests stay free for you.</p>
          </div>
          <Link className="btn btn-primary" to={'/checkout?exam=' + EXAM.id}>
            Get the test series
          </Link>
        </div>
      ) : null}

      <div className="stages">
        {STAGES.map(([kind, title, desc]) => {
          const list = SERIES.filter((t) => t.kind === kind)
          const n = list.filter((t) => t.status === 'done').length
          return (
            <div className={'stage stage-' + kind} key={kind}>
              <div className="stage-head">
                <h3>{title}</h3>
                <span>{me.bought ? n + ' of ' + list.length + ' done' : list.length + ' tests'}</span>
                <span className="stage-desc">{desc}</span>
              </div>
              <ul className="tiles">
                {list.map((t) => (
                  <Tile key={t.id} t={t} me={me} suggested={suggested} />
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </section>
  )
}
