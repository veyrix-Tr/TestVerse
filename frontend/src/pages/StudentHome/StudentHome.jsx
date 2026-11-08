import { useEffect, useState } from 'react'
import './StudentHome.css'
import LogoSprite from '../../components/LogoSprite.jsx'
import { ASSIGNED, EXAM, LIVE, MODES, RESULTS, REQUESTS, SERIES, SETTINGS, SUBJECT_ACC, WEAK, liveState } from '../../data/studentDemo.js'
import { fmt, greet } from '../../lib/format.js'
import { usePageMeta } from '../../lib/hooks.js'
import { useToast } from '../../lib/useToast.jsx'
import LiveSection from './sections/LiveSection.jsx'
import SeriesSection from './sections/SeriesSection.jsx'
import SideCards from './sections/SideCards.jsx'
import StudentHeader from './sections/StudentHeader.jsx'
import VideoDialog from './sections/VideoDialog.jsx'
import { Link } from 'react-router-dom'

const initialModes = Object.fromEntries(Object.entries(MODES).map(([k, v]) => [k, { ...v }]))
const initialLive = LIVE.map((t) => ({ ...t }))
const initialRequests = REQUESTS.map((r) => ({ ...r }))

function barColor(v) {
  return v >= 75 ? 'var(--green)' : v >= 68 ? 'var(--blue)' : 'var(--orange)'
}

/* design/student-home.html -> route "/student" */
export default function StudentHome() {
  usePageMeta({ title: 'My Testverse — Home' })

  const [mode, setMode] = useState('course')
  const [modes, setModes] = useState(initialModes)
  const [live, setLive] = useState(initialLive)
  const [requests, setRequests] = useState(initialRequests)
  const [now, setNow] = useState(() => Date.now())
  const [notesOpen, setNotesOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [dot, setDot] = useState(true)
  const [announceHidden, setAnnounceHidden] = useState(false)
  const [videoOpen, setVideoOpen] = useState(false)
  const { toast, node } = useToast()

  const me = modes[mode]
  const limit = me.course ? SETTINGS.videoLimit.course : SETTINGS.videoLimit.direct
  const videoLeft = Math.max(0, limit - me.videosUsed)
  const done = SERIES.filter((t) => t.status === 'done').length

  // 1s ticker for countdowns / entry windows (the design runs setInterval(tick, 1000))
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  function register(id) {
    const t = live.find((x) => x.id === id)
    setLive((list) => list.map((x) => (x.id === id ? { ...x, registered: true } : x)))
    toast(liveState(t) === 'open' ? 'Registered. Opening the test…' : 'Registered for ' + t.title + '. We’ll remind you before it starts.')
  }

  function copyCode() {
    const link = 'https://testverse.in/?ref=' + me.code
    ;(navigator.clipboard ? navigator.clipboard.writeText(link) : Promise.reject()).then(
      () => toast('Referral link copied'),
      () => toast('Your link: ' + link),
    )
  }

  function sendVideo({ subject, chapter, note }) {
    setModes((m) => ({ ...m, [mode]: { ...m[mode], videosUsed: m[mode].videosUsed + 1 } }))
    setRequests((r) => [{ text: (chapter.trim() || 'Your question') + (note.trim() ? ': ' + note.trim() : ''), subject, status: 'new', when: new Date().toISOString() }, ...r])
    setVideoOpen(false)
    toast('Request sent. We’ll send your video within ' + SETTINGS.videoHours + ' hours.')
  }

  const trend = RESULTS.slice().reverse()

  return (
    <div className="tv-studenthome">
      <LogoSprite />

      <StudentHeader
        me={me}
        dot={dot}
        notesOpen={notesOpen}
        menuOpen={menuOpen}
        setNotesOpen={(v) => {
          setNotesOpen(v)
          if (v) setDot(false)
        }}
        setMenuOpen={setMenuOpen}
        onLogout={() => toast('Logged out (demo)')}
      />

      <div className="announce" id="announce" hidden={announceHidden}>
        <div className="in">
          <span id="announce-text">{SETTINGS.announcement}</span>
          <button type="button" id="announce-x" aria-label="Dismiss announcement" onClick={() => setAnnounceHidden(true)}>
            Dismiss
          </button>
        </div>
      </div>

      <main className="page" id="page">
        <div className="col">
          {/* Greeting + stats */}
          <section className="hello">
            <div>
              <h1>
                {greet()}, {me.first}
              </h1>
              <p>
                <span>
                  {EXAM.label} {EXAM.year}
                </span>
                {me.course ? <span className="tag tag-course">Studyverse course student</span> : <span className="tag tag-direct">Testverse</span>}
              </p>
            </div>
            <div className="stats">
              <div className="stat">
                <b>{me.bought ? done + ' / 11' : '—'}</b>
                <span>series tests done</span>
              </div>
              <div className="stat">
                <b>{me.bought ? '1,284' : '—'}</b>
                <span>best all-India rank</span>
              </div>
              <div className="stat">
                <b>{me.bought ? '75%' : '—'}</b>
                <span>accuracy, last test</span>
              </div>
            </div>
          </section>

          {/* Live */}
          <LiveSection live={live} now={now} onRegister={register} />

          {/* Assigned (course students only) */}
          {me.course && ASSIGNED.length ? (
            <section className="card">
              <div className="card-head">
                <h2>Assigned to you</h2>
                <span className="meta">Personal and batch tests from your teachers</span>
              </div>
              <div className="assigned">
                {ASSIGNED.map((a) => {
                  const hrs = (new Date(a.due).getTime() - now) / 36e5
                  return (
                    <div className="as" key={a.id}>
                      <div>
                        <strong>
                          {a.title}
                          {hrs < 24 ? <span className="pill p-new">Due today</span> : null}
                        </strong>
                        <span>
                          {a.from} · {a.meta} · due {fmt(a.due)}
                        </span>
                      </div>
                      <Link className="btn btn-dark btn-sm" to={'/test?test=' + a.id}>
                        Start test
                      </Link>
                    </div>
                  )
                })}
              </div>
            </section>
          ) : null}

          {/* Series */}
          <SeriesSection me={me} done={done} />

          {/* Results + performance */}
          {me.bought ? (
            <>
              <section className="card" id="results">
                <div className="card-head">
                  <h2>Recent results</h2>
                  <a href="#results">All results</a>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Test</th>
                        <th>Score</th>
                        <th>Accuracy</th>
                        <th>Rank</th>
                        <th>
                          <span className="sr">Action</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {RESULTS.slice(0, 4).map((r, i) => (
                        <tr key={i}>
                          <td>
                            <b>{r.test}</b>
                            <span className="sub">
                              {fmt(r.when, { day: 'numeric', month: 'short' })}
                              {r.live ? ' · Live' : ''}
                            </span>
                          </td>
                          <td>
                            {r.score} / {r.max}
                          </td>
                          <td>{r.acc}%</td>
                          <td>{r.rank ? r.rank : <span className="hint">—</span>}</td>
                          <td style={{ textAlign: 'right' }}>
                            <Link className="btn btn-outline btn-sm" to="/test?test=P4&view=result">
                              View analysis
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="card">
                <div className="card-head">
                  <h2>Your performance</h2>
                  <span className="meta">Across all tests</span>
                </div>
                <div className="perf">
                  <div>
                    <div className="hint" style={{ marginBottom: '4px' }}>
                      Score % by test
                    </div>
                    <div
                      className="chart"
                      role="img"
                      aria-label={'Score percentage by test: ' + trend.map((r) => r.test + ' ' + Math.round((r.score / r.max) * 100) + '%').join(', ')}
                    >
                      {trend.map((r) => {
                        const p = Math.round((r.score / r.max) * 100)
                        const short = r.test.replace('NEET Full Syllabus Live Test', 'Live 1').replace('Half Syllabus Test', 'Half').replace('Part Test', 'Part')
                        return (
                          <div key={r.test}>
                            <b>{p}%</b>
                            <i style={{ height: Math.round(p * 1.1) + 'px' }}></i>
                            <span>{short}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <div>
                    <div className="hint" style={{ marginBottom: '8px' }}>
                      Accuracy by subject
                    </div>
                    <div className="bars">
                      {SUBJECT_ACC.map(([label, pct]) => (
                        <div className="bar" key={label}>
                          <span>{label}</span>
                          <div>
                            <i style={{ width: pct + '%', background: barColor(pct) }}></i>
                          </div>
                          <b>{pct}%</b>
                        </div>
                      ))}
                    </div>
                    <div className="weak">
                      <div className="hint" style={{ background: 'none', padding: 0 }}>
                        Chapters losing you the most marks
                      </div>
                      {WEAK.map(([label, pct]) => (
                        <div key={label}>
                          <span>{label}</span>
                          <span>{pct}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            </>
          ) : null}
        </div>

        <aside className="col" aria-label="More">
          <SideCards me={me} requests={requests} videoLeft={videoLeft} onOpenVideo={() => setVideoOpen(true)} onCopyCode={copyCode} />
        </aside>
      </main>

      <footer className="foot">
        <span>© 2026 Studyverse</span>
        <a href="/terms">Terms</a>
        <a href="/privacy">Privacy</a>
        <a href="/refunds">Refund policy</a>
        <a href="/contact">Contact</a>
      </footer>

      <div className="demo" role="region" aria-label="Demo controls">
        <div className="in">
          <b>Demo: view as</b>
          {['course', 'direct', 'new'].map((m) => (
            <button
              key={m}
              type="button"
              data-demo={m}
              aria-pressed={mode === m ? 'true' : 'false'}
              onClick={() => {
                setMode(m)
                window.scrollTo(0, 0)
              }}
            >
              {m === 'course' ? 'Course (LMS) student' : m === 'direct' ? 'Direct student' : 'New, not bought yet'}
            </button>
          ))}
          <span style={{ marginLeft: 'auto' }}>Sample data only</span>
        </div>
      </div>

      {/* Mounted only while open, so every request starts with fresh fields
          (the design resets them in openVideo()). */}
      {videoOpen ? <VideoDialog onClose={() => setVideoOpen(false)} me={me} onSend={sendVideo} /> : null}

      {node}
    </div>
  )
}
