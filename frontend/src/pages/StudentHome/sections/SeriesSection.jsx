import { EXAM, SERIES } from '../../../data/studentDemo.js'

function shortName(t) {
  return { part: 'Part ', half: 'Half ', full: 'Full ' }[t.kind] + t.n
}

/* design/student-home.html seriesSection() — 11 tiles + progress + next bar */
export default function SeriesSection({ me, done }) {
  const suggested = SERIES.find((t) => t.status === 'progress') || SERIES.find((t) => t.status === 'open')

  function tile(t) {
    if (!me.bought)
      return (
        <div className="tile locked" key={t.id}>
          <b>{shortName(t)}</b>
          <span>Locked</span>
        </div>
      )
    let cls = 'tile'
    let label
    if (t.status === 'done') {
      cls += ' done'
      label = t.score + ' / ' + t.max
    } else if (t.status === 'progress') {
      cls += ' prog'
      label = 'Resume · ' + t.left
    } else if (t.status === 'soon') {
      cls += ' locked'
      label = 'Coming soon'
    } else {
      label = 'Available'
      if (t === suggested) {
        cls += ' next'
        label = 'Suggested next'
      }
    }
    if (t === suggested && t.status === 'progress') label = 'Resume · ' + t.left
    if (t.status === 'soon')
      return (
        <div className={cls} key={t.id}>
          <b>{shortName(t)}</b>
          <span>{label}</span>
        </div>
      )
    const href = t.status === 'done' ? '/test?test=' + t.id + '&view=result' : '/test?test=' + t.id
    return (
      <a className={cls} href={href} title={t.chapters} style={{ textDecoration: 'none' }} key={t.id}>
        <b>{shortName(t)}</b>
        <span>{label}</span>
      </a>
    )
  }

  function stage(kind, title, n) {
    return (
      <div className={'stage stage-' + kind} key={kind}>
        <h3>
          {title} ({n})
        </h3>
        <div className="tiles">{SERIES.filter((t) => t.kind === kind).map(tile)}</div>
      </div>
    )
  }

  return (
    <section className="card" id="series">
      <div className="card-head">
        <h2>
          My {EXAM.label} test series
        </h2>
        <span className="meta">{me.bought ? done + ' of 11 done' : '11 tests'}</span>
      </div>
      {me.bought ? (
        <div className="progress" role="progressbar" aria-valuemin="0" aria-valuemax="11" aria-valuenow={done} aria-label="Test series progress">
          <i style={{ width: Math.round((done / 11) * 100) + '%' }}></i>
        </div>
      ) : null}
      <div className="track">
        {stage('part', 'Part tests', 6)}
        {stage('half', 'Half syllabus', 3)}
        {stage('full', 'Full syllabus', 2)}
      </div>
      {me.bought && suggested ? (
        <div className="next-bar">
          <p>
            <b style={{ color: 'var(--ink)' }}>{suggested.title}</b> · {suggested.chapters}
          </p>
          <a className="btn btn-primary" href={'/test?test=' + suggested.id}>
            {suggested.status === 'progress' ? 'Resume test' : 'Start ' + suggested.title}
          </a>
        </div>
      ) : null}
      {!me.bought ? (
        <div className="locked-box">
          <b>
            Get all 11 tests for {EXAM.label}
          </b>
          <span className="hint">6 part tests, 3 half-syllabus tests and 2 full-syllabus tests, with full analysis and solutions. Coupon and referral codes accepted.</span>
          <a className="btn btn-primary" href={'/checkout?exam=' + EXAM.id}>
            Get the test series
          </a>
          <span className="hint">All-India live tests are open to you now. Register above.</span>
        </div>
      ) : null}
    </section>
  )
}
