import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './StudentHome.css'
import LogoSprite from '../../components/LogoSprite.jsx'
import { usePageMeta } from '../../lib/hooks.js'
import { clearSession, loadSession } from '../../lib/session.js'
import PageHeader from './sections/PageHeader.jsx'
import Sidebar from './sections/Sidebar.jsx'
import SideCards from './sections/SideCards.jsx'
import TestsSection, { TestHero } from './sections/TestsSection.jsx'
import { groupTests, heroTest, statusNow, useTests } from './useTests.js'

const SPY = ['top', 'tests']
const EXAMS = { neet: 'NEET', 'jee-main': 'JEE Main', 'jee-advanced': 'JEE Advanced' }

/* The signed-in student as the dashboard shows them. */
function meOf(user) {
  const name = (user && user.name) || 'Student'
  const exam = user && EXAMS[user.exam]
  const sub = user && user.subscription && user.subscription.status === 'active' ? user.subscription : null
  return {
    name,
    first: name.split(' ')[0],
    email: (user && user.email) || '',
    examText: exam ? exam + (user.targetYear ? ' ' + user.targetYear : '') : '',
    batch: sub ? sub.batch.name : '',
    subscription: sub,
  }
}

/* Headline numbers, all from the real test list. */
function statsOf(status, tests, groups) {
  if (status !== 'ready') {
    return [
      { v: '—', label: 'Tests done' },
      { v: '—', label: 'Available now' },
      { v: '—', label: 'Average score' },
      { v: '—', label: 'Last score' },
    ]
  }
  const done = groups.done
  const pcts = done.filter((t) => t.attempt.maxScore > 0).map((t) => (t.attempt.score / t.attempt.maxScore) * 100)
  const last = done[0]
  return [
    { v: done.length, unit: '/ ' + tests.length, label: 'Tests done' },
    { v: groups.open.length + groups['in-progress'].length, label: 'Available now' },
    pcts.length ? { v: Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length), unit: '%', label: 'Average score' } : { v: '—', label: 'Average score' },
    last ? { v: last.attempt.score, unit: '/ ' + last.attempt.maxScore, label: 'Last score' } : { v: '—', label: 'Last score' },
  ]
}

/* design/student-home.html -> route "/student" */
export default function StudentHome() {
  usePageMeta({ title: 'My Testverse — Dashboard' })

  const [tick, setTick] = useState(() => Date.now())
  const [sheetOpen, setSheetOpen] = useState(false)
  const [active, setActive] = useState('top')
  const routerNavigate = useNavigate()
  const { status, tests, offset, error, reload, refresh } = useTests()

  const me = meOf(loadSession())
  const now = tick + offset
  const groups = useMemo(() => groupTests(tests, now), [tests, now])
  const hero = heroTest(groups)
  const stale = tests.some((t) => statusNow(t, now).stale)

  // 1s ticker for countdowns
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // A test opened, closed or ran out of time: ask the server for the new state
  useEffect(() => {
    if (stale) refresh()
  }, [stale, refresh, tick])

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
  }, [])

  function navigate(id) {
    setActive(id)
    setSheetOpen(false)
  }

  return (
    <div className="tv-studenthome">
      <LogoSprite />

      <Sidebar
        me={me}
        active={active}
        onNavigate={navigate}
        sheetOpen={sheetOpen}
        setSheetOpen={setSheetOpen}
        onLogout={() => {
          clearSession()
          routerNavigate('/login', { replace: true, viewTransition: true })
        }}
      />

      <div className="shell">
        <div className="content">
          <main className="layout" id="main">
            <div className="main-col">
              <PageHeader me={me} stats={statsOf(status, tests, groups)} />

              <TestHero test={hero} now={now} />

              <TestsSection status={status} error={error} groups={groups} total={tests.length} now={now} onRetry={() => reload()} />
            </div>

            <aside className="rail" aria-label="Solutions and your batch">
              <SideCards me={me} latestDone={groups.done[0] || null} />
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
    </div>
  )
}
