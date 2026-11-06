import { useEffect, useState } from 'react'
import './Home.css'
import LogoSprite from '../../components/LogoSprite.jsx'
import { EXAMS, EXAM_KEY } from '../../data/exams.js'
import { usePageMeta } from '../../lib/hooks.js'
import Analysis from './sections/Analysis.jsx'
import CbtScreen from './sections/CbtScreen.jsx'
import Faq from './sections/Faq.jsx'
import FinalCta from './sections/FinalCta.jsx'
import Hero from './sections/Hero.jsx'
import HowItWorks from './sections/HowItWorks.jsx'
import ParentsDuo from './sections/ParentsDuo.jsx'
import Refer from './sections/Refer.jsx'
import SiteFooter from './sections/SiteFooter.jsx'
import SiteHeader from './sections/SiteHeader.jsx'
import TestPlan from './sections/TestPlan.jsx'

/*
  design/testverse-home.html -> route "/"
  The whole page shares one chosen exam (hero switch + test plan + CBT
  illustration + sample report), remembered in localStorage and in the URL hash
  (#neet, #jee-main, #jee-advanced), exactly like the design script.
*/
export default function Home() {
  usePageMeta({
    title: 'Testverse by Studyverse — NEET & JEE live tests and test series',
    description:
      'A complete test plan for NEET, JEE Main and JEE Advanced: 6 part tests, 3 half-syllabus tests and 2 full-syllabus tests, plus all-India live tests. Real CBT screen, rank and full analysis. By Studyverse.',
  })

  const refCode = (new URLSearchParams(window.location.search).get('ref') || '').trim().toUpperCase()
  const [exam, setExam] = useState(null)

  // The design sets `html { scroll-behavior: smooth }` (scoped CSS can't reach
  // <html>, so the class lives in the global stylesheet).
  useEffect(() => {
    document.documentElement.classList.add('smooth-scroll')
    return () => document.documentElement.classList.remove('smooth-scroll')
  }, [])

  function choose(id, remember) {
    if (!EXAMS[id]) return
    setExam(id)
    if (remember) {
      try {
        localStorage.setItem(EXAM_KEY, id)
      } catch {
        /* ignore */
      }
      try {
        window.history.replaceState(null, '', '#' + id)
      } catch {
        /* not allowed in some previews */
      }
    }
  }

  // Footer links (#neet …) and links shared as #neet etc.
  useEffect(() => {
    const fromHash = () => {
      const h = window.location.hash.replace('#', '')
      if (EXAMS[h]) {
        choose(h, true)
        const plan = document.getElementById('plan')
        if (plan) plan.scrollIntoView()
        return true
      }
      return false
    }
    window.addEventListener('hashchange', fromHash)
    if (!fromHash()) {
      let saved = null
      try {
        saved = localStorage.getItem(EXAM_KEY)
      } catch {
        /* ignore */
      }
      if (saved && EXAMS[saved]) choose(saved, false)
    }
    return () => window.removeEventListener('hashchange', fromHash)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const signupHref =
    '/checkout' + (refCode || exam ? '?' + [exam ? 'exam=' + exam : '', refCode ? 'ref=' + encodeURIComponent(refCode) : ''].filter(Boolean).join('&') : '')

  return (
    <div className="tv-home">
      <LogoSprite />
      <SiteHeader />

      <div className="ref-banner" data-ref-banner hidden={!refCode}>
        <div className="wrap">
          <span>
            Your friend's referral code <b data-ref-code>{refCode}</b> will be applied at checkout: <b>[REFERRAL DISCOUNT]</b> off your test series.
          </span>
        </div>
      </div>

      <main>
        <Hero exam={exam} onChoose={choose} signupHref={signupHref} />

        <section id="why" className="section" aria-labelledby="why-title">
          <div className="wrap">
            <div className="section-head">
              <h2 id="why-title">Why students choose Testverse</h2>
              <p>Lots of apps have a test series. Here's what's different about ours.</p>
            </div>
            <div className="why">
              <div>
                <h3>A plan, not a pile of tests</h3>
                <p>11 tests in a set order: part tests as you finish chapters, half-syllabus tests to join them up, then two full papers to rehearse the real exam. You always know which test comes next.</p>
              </div>
              <div>
                <h3>Papers set by real faculty</h3>
                <p>Every paper is set and checked by Studyverse faculty [with X+ years of NEET and JEE teaching], matched to the current exam pattern and level.</p>
              </div>
              <div>
                <h3>Analysis that tells you what to fix</h3>
                <p>Not just a score. Chapter-wise accuracy, time per question, marks lost to guessing, and a full solution for every question.</p>
              </div>
              <div>
                <h3>A teacher when you need one</h3>
                <p>If your scores stop improving, a Studyverse teacher can review your test data with you. Same account, so nothing starts from zero.</p>
              </div>
            </div>
          </div>
        </section>

        <TestPlan exam={exam} onChoose={choose} signupHref={signupHref} />

        <CbtScreen exam={exam} />

        <Analysis exam={exam} />

        <HowItWorks />

        <Refer />

        <ParentsDuo />

        <Faq />

        <FinalCta signupHref={signupHref} />
      </main>

      <SiteFooter />
    </div>
  )
}
