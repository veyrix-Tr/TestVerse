import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import './StudentHome.css'
import LogoSprite from '../../components/LogoSprite.jsx'
import { ASSIGNED, LIVE, MODES, REQUESTS, SERIES, SETTINGS, liveState } from '../../data/studentDemo.js'
import { fmt } from '../../lib/format.js'
import { usePageMeta } from '../../lib/hooks.js'
import { useToast } from '../../lib/useToast.jsx'
import SectionHead from './SectionHead.jsx'
import { LiveHero, UpcomingLive } from './sections/LiveSection.jsx'
import PageHeader from './sections/PageHeader.jsx'
import PerformanceSection from './sections/PerformanceSection.jsx'
import ResultsSection from './sections/ResultsSection.jsx'
import SeriesSection from './sections/SeriesSection.jsx'
import Sidebar from './sections/Sidebar.jsx'
import SideCards from './sections/SideCards.jsx'
import VideoDialog from './sections/VideoDialog.jsx'

const initialModes = Object.fromEntries(Object.entries(MODES).map(([k, v]) => [k, { ...v }]))
const initialLive = LIVE.map((t) => ({ ...t }))
const initialRequests = REQUESTS.map((r) => ({ ...r }))
const TOTAL = SERIES.length
const SPY = ['top', 'series', 'live', 'results']

function pickLive(live) {
  const open = live.find((t) => liveState(t) === 'open')
  const next = live.filter((t) => liveState(t) === 'upcoming').sort((a, b) => new Date(a.start) - new Date(b.start))
  const hero = open || next[0]
  return { hero, rest: next.filter((t) => t !== hero) }
}

/* design/student-home.html -> route "/student" */
export default function StudentHome() {
  usePageMeta({ title: 'My Testverse — Dashboard' })

  const [mode, setMode] = useState('course')
  const [modes, setModes] = useState(initialModes)
  const [live, setLive] = useState(initialLive)
  const [requests, setRequests] = useState(initialRequests)
  const [now, setNow] = useState(() => Date.now())
  const [sheetOpen, setSheetOpen] = useState(false)
  const [active, setActive] = useState('top')
  const [videoOpen, setVideoOpen] = useState(false)
  const { toast, node } = useToast()

  const me = modes[mode]
  const limit = me.course ? SETTINGS.videoLimit.course : SETTINGS.videoLimit.direct
  const videoLeft = Math.max(0, limit - me.videosUsed)
  const done = SERIES.filter((t) => t.status === 'done').length
  const { hero, rest } = pickLive(live)

  // 1s ticker for countdowns / entry windows
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // Highlight the nav item for the section in view
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return undefined
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id)
        })
      },
      { rootMargin: '-30% 0px -60% 0px' },
    )
    SPY.forEach((id) => {
      const el = document.getElementById(id)
      if (el) io.observe(el)
    })
    return () => io.disconnect()
  }, [mode])

  function navigate(id) {
    setActive(id)
    setSheetOpen(false)
  }

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

  return (
    <div className="tv-studenthome">
      <LogoSprite />

      <Sidebar me={me} active={active} onNavigate={navigate} sheetOpen={sheetOpen} setSheetOpen={setSheetOpen} onLogout={() => toast('Logged out (demo)')} />

      <div className="shell">
        <div className="content">
          <main className="layout" id="main">
            <div className="main-col">
              <PageHeader me={me} done={done} total={TOTAL} />

              <LiveHero hero={hero} now={now} onRegister={register} />

              {me.course && ASSIGNED.length ? (
                <section className="section" id="assigned" aria-labelledby="assigned-title">
                  <SectionHead id="assigned-title" title="Assigned to you" desc="Personal and batch tests from your Studyverse teachers." />
                  <ul className="grid assigned-grid">
                    {ASSIGNED.map((a) => {
                      const hrs = (new Date(a.due).getTime() - now) / 36e5
                      return (
                        <li className="card assigned-card" key={a.id}>
                          <div className="assigned-top">
                            <span className="meta">{a.from}</span>
                            {hrs < 24 ? <span className="status status-amber">Due in {Math.max(1, Math.round(hrs))} h</span> : null}
                          </div>
                          <h3>{a.title}</h3>
                          <p className="meta">
                            {a.meta} · due {fmt(a.due)}
                          </p>
                          <Link className="btn btn-dark btn-sm" to={'/test?test=' + a.id}>
                            Start test
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              ) : null}

              <SeriesSection me={me} done={done} total={TOTAL} />

              <UpcomingLive rest={rest} onRegister={register} />

              {me.bought ? (
                <>
                  <ResultsSection />
                  <PerformanceSection />
                </>
              ) : null}
            </div>

            <aside className="rail" aria-label="Video solutions, referrals and sharing">
              <SideCards me={me} requests={requests} videoLeft={videoLeft} onOpenVideo={() => setVideoOpen(true)} onCopyCode={copyCode} />
            </aside>
          </main>

          <footer className="foot">
            <span>© 2026 Studyverse</span>
            <nav aria-label="Legal">
              <a href="/terms">Terms</a>
              <a href="/privacy">Privacy</a>
              <a href="/refunds">Refund policy</a>
              <a href="/contact">Contact</a>
            </nav>
          </footer>
        </div>
      </div>

      <div className="demo" role="region" aria-label="Demo controls">
        <b>Demo: view as</b>
        <div className="demo-seg">
          {['course', 'direct', 'new'].map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m ? 'true' : 'false'}
              onClick={() => {
                setMode(m)
                window.scrollTo(0, 0)
              }}
            >
              <span className="long">{m === 'course' ? 'Course (LMS) student' : m === 'direct' ? 'Direct student' : 'New, not bought yet'}</span>
              <span className="short">{m === 'course' ? 'Course student' : m === 'direct' ? 'Direct' : 'New student'}</span>
            </button>
          ))}
        </div>
        <span className="demo-note">Sample data only</span>
      </div>

      {/* Mounted only while open, so every request starts with fresh fields. */}
      {videoOpen ? <VideoDialog onClose={() => setVideoOpen(false)} me={me} onSend={sendVideo} /> : null}

      {node}
    </div>
  )
}
