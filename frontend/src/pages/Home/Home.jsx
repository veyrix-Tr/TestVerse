import { useEffect, useState } from 'react'
import './Home.css'
import LogoSprite from '../../components/LogoSprite.jsx'
import { EXAMS, EXAM_KEY } from '../../data/exams.js'
import { usePageMeta } from '../../lib/hooks.js'
import Analysis from './sections/Analysis.jsx'
import AnnouncementBar from './sections/AnnouncementBar.jsx'
import CbtScreen from './sections/CbtScreen.jsx'
import Faq from './sections/Faq.jsx'
import FinalCta from './sections/FinalCta.jsx'
import Hero from './sections/Hero.jsx'
import Resources from './sections/Resources.jsx'
import HowItWorks from './sections/HowItWorks.jsx'
import SiteFooter from './sections/SiteFooter.jsx'
import SiteHeader from './sections/SiteHeader.jsx'
import TestPlan from './sections/TestPlan.jsx'
import Together from './sections/Together.jsx'
import Why from './sections/Why.jsx'

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

  // New students sign up first (with the chosen exam), then pick their batch
  const signupHref = '/signup' + (exam ? '?exam=' + exam : '')

  return (
    <div className="tv-home">
      <LogoSprite />
      <AnnouncementBar />
      <SiteHeader />

      <main>
        <Hero exam={exam} onChoose={choose} signupHref={signupHref} />

        <Why />

        <TestPlan exam={exam} onChoose={choose} signupHref={signupHref} />

        <CbtScreen exam={exam} />

        <Analysis exam={exam} />

        <HowItWorks />

        <Together />

        <Resources />

        <Faq />

        <FinalCta signupHref={signupHref} />
      </main>

      <SiteFooter />
    </div>
  )
}
