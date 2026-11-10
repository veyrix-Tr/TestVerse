import { useEffect, useMemo, useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import './StudentHome.css'
import LogoSprite from '../../components/LogoSprite.jsx'
import { usePageMeta } from '../../lib/hooks.js'
import { clearSession, loadSession } from '../../lib/session.js'
import ResultPage from '../Test/ResultPage.jsx'
import AccountPage from './pages/AccountPage.jsx'
import Overview, { OverviewRail } from './pages/Overview.jsx'
import ResourcesPage from './pages/ResourcesPage.jsx'
import ResultsPage from './pages/ResultsPage.jsx'
import SolutionsPage, { SolutionsRail } from './pages/SolutionsPage.jsx'
import TestsPage from './pages/TestsPage.jsx'
import AnnouncementBanner from './sections/AnnouncementBanner.jsx'
import ComingSoon from './sections/ComingSoon.jsx'
import { SOON } from './soon.js'
import Sidebar from './sections/Sidebar.jsx'
import { groupTests, resultsOf, statusNow, useTests } from './useTests.js'

const EXAMS = { neet: 'NEET', 'jee-main': 'JEE Main', 'jee-advanced': 'JEE Advanced' }

/* Each page under /student/<key>: its screen, an optional right rail, and its <title>. */
const PAGES = {
  '': { Main: Overview, Rail: OverviewRail, title: 'Overview' },
  tests: { Main: TestsPage, title: 'Your tests' },
  results: { Main: ResultsPage, title: 'Results' },
  solutions: { Main: SolutionsPage, Rail: SolutionsRail, title: 'Solutions' },
  resources: { Main: ResourcesPage, title: 'Resources' },
  account: { Main: AccountPage, title: 'Account' },
}

// The dashboard used to be one long page with these sections: old links land on their pages
const OLD_HASHES = { '#tests': '/student/tests', '#results': '/student/results', '#solutions': '/student/solutions', '#top': '/student' }

/* The signed-in student as the pages show them. */
function meOf(user) {
  const name = (user && user.name) || 'Student'
  const exam = user && EXAMS[user.exam]
  const sub = user && user.subscription && user.subscription.status === 'active' ? user.subscription : null
  return {
    name,
    first: name.split(' ')[0],
    email: (user && user.email) || '',
    examName: exam || '',
    examText: exam ? exam + (user.targetYear ? ' ' + user.targetYear : '') : '',
    batch: sub ? sub.batch.name : '',
    subscription: sub,
  }
}

/*
  design/student-home.html -> "/student/:page?". One shell (sidebar + content)
  for every student page, so moving between them keeps the shell and the test
  list mounted: Overview (/student), Your tests, Results, Solutions, Account,
  a test's result (/student/result?test=…&attempt=…, Test/ResultPage.jsx) and
  the coming-soon pages (sections/ComingSoon.jsx). The test list is loaded once
  here and handed to each page.
*/
export default function StudentHome() {
  const location = useLocation()
  const pageKey = useParams().page || ''
  const soon = SOON[pageKey] || null
  const isResult = pageKey === 'result'
  const page = PAGES[pageKey] || null
  const params = new URLSearchParams(location.search)
  usePageMeta({ title: (soon ? soon.eyebrow : isResult ? 'Result' : page ? page.title : 'Overview') + ' — Testverse' })

  const [tick, setTick] = useState(() => Date.now())
  const [sheetOpen, setSheetOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const navigate = useNavigate()
  const { status, tests, offset, error, reload, refresh } = useTests()

  const user = loadSession()
  const me = meOf(user)
  const now = tick + offset
  const groups = useMemo(() => groupTests(tests, now), [tests, now])
  const rows = useMemo(() => resultsOf(tests), [tests])
  const freeTests = tests.filter((t) => t.isFree)
  const free = { total: freeTests.length, done: freeTests.filter((t) => (t.history || []).length).length }
  const counts = { todo: groups.open.length + groups['in-progress'].length, results: rows.length }
  const stale = tests.some((t) => statusNow(t, now).stale)
  const data = { status, error, tests, groups, rows, now, reload, free }

  // 1s ticker for countdowns
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // A test opened, closed or ran out of time: ask the server for the new state
  useEffect(() => {
    if (stale) refresh()
  }, [stale, refresh, tick])

  // A new page (or another result) starts at the top; filters on the same page don't move it
  const scrollKey = location.pathname + (isResult ? location.search : '')
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [scrollKey])

  function logout() {
    if (loggingOut) return
    setLoggingOut(true)
    clearSession()
    navigate('/login', { replace: true, viewTransition: true })
  }

  if (!pageKey && OLD_HASHES[location.hash]) return <Navigate to={OLD_HASHES[location.hash]} replace />
  if (!page && !soon && !isResult) return <Navigate to="/student" replace />

  const Rail = page && page.Rail

  return (
    <div className="tv-studenthome">
      <LogoSprite />

      <Sidebar
        me={me}
        active={isResult ? 'results' : pageKey}
        sheetOpen={sheetOpen}
        setSheetOpen={setSheetOpen}
        counts={counts}
        free={free}
        loggingOut={loggingOut}
        onLogout={logout}
      />

      <div className="shell">
        <div className="content">
          <AnnouncementBanner />
          <main className={'layout' + (Rail ? '' : ' is-wide')} id="main" aria-labelledby={isResult ? 'result-page-title' : soon ? 'soon-title' : 'page-title'}>
            <div className="main-col">
              {soon ? (
                <ComingSoon page={soon} />
              ) : isResult ? (
                <ResultPage testId={params.get('test') || ''} attemptNo={params.get('attempt') || ''} />
              ) : (
                <page.Main me={me} user={user} data={data} onLogout={logout} loggingOut={loggingOut} />
              )}
            </div>

            {Rail ? (
              <aside className="rail" aria-label="More for this page">
                <Rail me={me} data={data} />
              </aside>
            ) : null}
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
