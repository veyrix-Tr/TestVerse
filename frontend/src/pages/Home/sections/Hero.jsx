import { useState } from 'react'
import { Link } from 'react-router-dom'
import { EXAMS } from '../../../data/exams.js'
import { useCountdown } from '../../../lib/hooks.js'
import { pad } from '../../../lib/format.js'
import ExamSwitch from './ExamSwitch.jsx'
import AuthLink from '../../../components/AuthLink.jsx'

const TRACK = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'H1', 'H2', 'H3', 'F1', 'F2']
const DONE = 7
const OFFSETS = [-13, -8, -10, -5, -2, -6, 0]

function latestPct(score) {
  const m = /^(\d+)\s*\/\s*(\d+)$/.exec(score || '')
  return m ? Math.round((Number(m[1]) / Number(m[2])) * 100) : 61
}

/* Score trend across the tests taken so far (a data chart, not decoration). */
function TrendChart({ pct }) {
  const pts = OFFSETS.map((o) => pct + o)
  const W = 520
  const H = 130
  const min = 35
  const max = 80
  const x = (i) => 12 + (i * (W - 24)) / (TRACK.length - 1)
  const y = (v) => H - 14 - ((v - min) / (max - min)) * (H - 28)
  const line = pts.map((v, i) => `${x(i)},${y(v)}`).join(' ')
  const area = `${x(0)},${H} ${line} ${x(pts.length - 1)},${H}`
  return (
    <svg className="trend" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`Score trend, latest ${pct}%`}>
      <defs>
        <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--blue)" stopOpacity="0.22" />
          <stop offset="1" stopColor="var(--blue)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[45, 60, 75].map((g) => (
        <line key={g} x1="0" x2={W} y1={y(g)} y2={y(g)} className="trend-grid" />
      ))}
      <polygon points={area} fill="url(#trend-fill)" />
      <polyline points={line} className="trend-line" />
      {pts.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r={i === pts.length - 1 ? 5 : 3} className={i === pts.length - 1 ? 'trend-last' : 'trend-dot'} />
      ))}
    </svg>
  )
}

/* Product preview: the student's plan dashboard, built in HTML/CSS. */
function PlanPreview({ exam }) {
  const ex = EXAMS[exam || 'neet']
  const pct = latestPct(ex.sample.score)
  return (
    <figure className="preview" aria-label="Example of a student's test plan dashboard">
      <div className="preview-window">
        <div className="pw-bar">
          <span>Your {ex.label} plan</span>
          <em>
            {DONE} of {TRACK.length} tests done
          </em>
        </div>
        <div className="pw-stats">
          <div>
            <small>Latest score</small>
            <b>{ex.sample.score}</b>
          </div>
          <div>
            <small>Accuracy</small>
            <b>{ex.sample.acc}</b>
          </div>
          <div>
            <small>Trend</small>
            <b className="up">+13 pts</b>
          </div>
        </div>
        <div className="pw-chart">
          <div className="pw-label">Score across your plan, %</div>
          <TrendChart pct={pct} />
          <div className="pw-track" aria-hidden="true">
            {TRACK.map((t, i) => (
              <span key={t} className={i < DONE ? 'done' : i === DONE ? 'next' : ''}>
                {t}
              </span>
            ))}
          </div>
        </div>
        <div className="pw-next">
          <div>
            <small>Up next</small>
            <b>Half Syllabus Test 2</b>
            <span>{ex.specs.half}</span>
          </div>
                  </div>
      </div>
      <div className="preview-float" aria-hidden="true">
        <small>All-India rank</small>
        <b>1,284</b>
        <span>Up 312 since the last live test</span>
      </div>
    </figure>
  )
}

function Countdown({ iso }) {
  const { d, h, m, s, done } = useCountdown(iso)
  const cells = [
    [done ? '00' : String(d), 'days'],
    [pad(h), 'hrs'],
    [pad(m), 'min'],
    [pad(s), 'sec'],
  ]
  return (
    <div className="countdown" aria-label="Time until the live test starts">
      {cells.map(([v, l]) => (
        <div key={l}>
          <b>{v}</b>
          <span>{l}</span>
        </div>
      ))}
    </div>
  )
}

function LiveStrip({ exam }) {
  const ex = exam ? EXAMS[exam] : null
  // The first live test that hasn't started yet (or the last one, once all have).
  const [now] = useState(() => Date.now())
  const upcoming = ex ? ex.live.filter((t) => new Date(t.start).getTime() > now) : []
  const list = upcoming.length ? upcoming : ex ? ex.live.slice(-1) : []
  const next = list[0] || null
  return (
    <div className="live-strip">
      <div className="wrap live-row">
        {next ? (
          <>
            <div className="live-main">
              <small>Next all-India live test, free for everyone</small>
              <strong data-live-title>{next.name}</strong>
              <span>
                {next.day} {next.when.split(',')[0]}, {next.meta}
              </span>
            </div>
            <Countdown key={next.start} iso={next.start} />
            <div className="live-more">
              {list.slice(1, 3).map((t) => (
                <div key={t.start}>
                  <b>
                    {t.day} {t.when.split(',')[0]}
                  </b>
                  <span>{t.name.replace(ex.label + ' ', '')}</span>
                </div>
              ))}
              <a href={'/live-tests?exam=' + exam} data-live-link>
                Full live test calendar
              </a>
            </div>
          </>
        ) : (
          <div className="live-empty">
            <small>All-India live tests</small>
            <p>Free for everyone, with a real all-India rank. Choose your exam above to see the next one and its countdown.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Hero({ exam, onChoose, signupHref }) {
  return (
    <section className="hero on-navy">
      <div className="wrap hero-grid">
        <div className="hero-copy">
          <p className="hero-eyebrow">The complete test plan for NEET and JEE</p>
          <h1>
            From your first chapter <span>to the final exam.</span>
          </h1>
          <p className="hero-lede">
            11 tests in the right order, set by experienced faculty and taken on a real CBT screen. Plus free all-India live tests, so you always know where you stand.
          </p>
          <div className="hero-switch">
            <span id="hero-switch-label">I'm preparing for</span>
            <ExamSwitch exam={exam} onChoose={onChoose} labelledBy="hero-switch-label" tone="navy" />
          </div>
          <div className="hero-ctas">
            <Link className="btn btn-gold btn-lg" to={signupHref} data-signup>
              Get the test series
            </Link>
            <a className="btn btn-ghost btn-lg" href="#plan">
              See what's included
            </a>
          </div>
          <p className="hero-note">
            In a Studyverse course? <AuthLink to="/login">Log in with the same account</AuthLink>
          </p>
        </div>
        <PlanPreview exam={exam} />
      </div>
      <LiveStrip exam={exam} />
    </section>
  )
}
