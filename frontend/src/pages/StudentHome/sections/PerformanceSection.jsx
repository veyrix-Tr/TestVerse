import { RESULTS, SUBJECT_ACC, WEAK } from '../../../data/studentDemo.js'
import SectionHead from '../SectionHead.jsx'

const Y_MIN = 50
const Y_MAX = 80
const TICKS = [80, 70, 60, 50]

function shortName(test) {
  return test.replace('NEET Full Syllabus Live Test', 'Live test').replace('Half Syllabus Test', 'Half').replace('Part Test', 'Part')
}

function TrendChart() {
  const pts = RESULTS.slice()
    .reverse()
    .map((r, i, all) => {
      const p = Math.round((r.score / r.max) * 100)
      const v = Math.min(Y_MAX, Math.max(Y_MIN, p))
      return { r, p, x: 6 + (i * 88) / (all.length - 1), y: (1 - (v - Y_MIN) / (Y_MAX - Y_MIN)) * 100 }
    })
  const last = pts[pts.length - 1]
  const prev = pts[pts.length - 2]
  const best = Math.max(...pts.map((d) => d.p))
  const delta = last.p - prev.p
  const line = pts.map((d) => d.x + ',' + d.y).join(' ')

  return (
    <div className="card chart-card trend-card">
      <div className="chart-head">
        <div>
          <h3>Score by test</h3>
          <p className="meta">Percentage of maximum marks, oldest to latest</p>
        </div>
        <div className="kpi">
          <b>{last.p}%</b>
          <span className={delta < 0 ? 'down' : 'up'}>
            {delta < 0 ? 'Down ' + -delta : 'Up ' + delta} pts from {shortName(prev.r.test)} · best {best}%
          </span>
        </div>
      </div>
      <div className="trend" role="img" aria-label={'Score percentage by test: ' + pts.map((d) => d.r.test + ' ' + d.p + '%').join(', ')}>
        <div className="trend-plot">
          {TICKS.map((t) => (
            <div className="trend-grid" key={t} style={{ top: ((Y_MAX - t) / (Y_MAX - Y_MIN)) * 100 + '%' }}>
              <span>{t}%</span>
            </div>
          ))}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="sh-trend-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="var(--blue)" stopOpacity="0.18" />
                <stop offset="1" stopColor="var(--blue)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon points={pts[0].x + ',100 ' + line + ' ' + last.x + ',100'} fill="url(#sh-trend-fill)" />
            <polyline points={line} fill="none" stroke="var(--blue)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
          {pts.map((d, i) => (
            <span key={d.r.test} className={'trend-pt' + (i === pts.length - 1 ? ' is-last' : '')} style={{ left: d.x + '%', top: d.y + '%' }}>
              <span className="trend-val">{d.p}%</span>
            </span>
          ))}
        </div>
        <div className="trend-x" aria-hidden="true">
          {pts.map((d) => (
            <span key={d.r.test} style={{ left: d.x + '%' }}>
              {shortName(d.r.test)}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function SubjectChart() {
  const weakest = Math.min(...SUBJECT_ACC.map(([, v]) => v))
  return (
    <div className="card chart-card">
      <div className="chart-head">
        <div>
          <h3>Accuracy by subject</h3>
          <p className="meta">Correct answers out of attempted, all tests</p>
        </div>
      </div>
      <ul className="hbars">
        {SUBJECT_ACC.map(([label, pct]) => (
          <li key={label} className={pct === weakest ? 'is-weak' : undefined}>
            <span className="hbar-label">
              {label}
              {pct === weakest ? <span className="hbar-flag">Needs work</span> : null}
            </span>
            <span className="hbar-track" aria-hidden="true">
              <i style={{ width: pct + '%' }}></i>
            </span>
            <b>{pct}%</b>
          </li>
        ))}
      </ul>
    </div>
  )
}

function WeakChapters() {
  return (
    <div className="card chart-card">
      <div className="chart-head">
        <div>
          <h3>Chapters losing you marks</h3>
          <p className="meta">Lowest share of correct answers</p>
        </div>
      </div>
      <ol className="weak">
        {WEAK.map(([label, pct]) => (
          <li key={label}>
            <span>{label}</span>
            <b>{pct.replace(' correct', '')}</b>
          </li>
        ))}
      </ol>
      <a className="text-link" href="#videos">
        Ask for a video solution on these
      </a>
    </div>
  )
}

/* Performance: the trend gets the full row; subjects and weak chapters share the next. */
export default function PerformanceSection() {
  return (
    <section className="section" id="performance" aria-labelledby="perf-title">
      <SectionHead id="perf-title" title="Your performance" desc="Where your marks come from, and where they slip away." />
      <div className="perf">
        <TrendChart />
        <SubjectChart />
        <WeakChapters />
      </div>
    </section>
  )
}
