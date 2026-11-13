import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import './Test.css'
import BackButton from '../../components/BackButton.jsx'
import { api } from '../../lib/api.js'
import { getToken, loadSession } from '../../lib/session.js'
import ResultView from './sections/ResultView.jsx'
import SubmittedDialog from './sections/SubmittedDialog.jsx'
import { attemptOf, flatten, paperOf } from './testData.js'

/*
  A submitted test's result and analysis inside the student dashboard
  ("/student/result?test=<id>[&attempt=n]"). Loads GET /tests/:id/result and
  renders the same ResultView the test page uses, without its own top bar.
  The wrapper carries the test page's style scope (.tv-test).
  "#solutions" opens it at the question review; "#mistakes" there too,
  showing only the wrong answers. Arriving straight from submitting
  (location.state.submitted) opens the "Test submitted" pop-up once.
*/
export default function ResultPage({ testId, attemptNo }) {
  const location = useLocation()
  const notice = location.state?.notice || null
  const hash = location.hash
  const navigate = useNavigate()
  // Just submitted: the pop-up shows once, then the state is cleared so a reload doesn't bring it back
  const [submitted] = useState(() => location.state?.submitted || null)
  const [popup, setPopup] = useState(!!submitted)
  useEffect(() => {
    if (location.state?.submitted) navigate(location.pathname + location.search + location.hash, { replace: true, state: null })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on arrival
  }, [])
  const [state, setState] = useState({ status: 'loading' })
  const [reviewFilter, setReviewFilter] = useState('all')

  useEffect(() => {
    let live = true
    setState({ status: 'loading' })
    setReviewFilter(hash === '#mistakes' ? 'wrong' : 'all')
    if (!testId) {
      setState({ status: 'error', error: 'Open a result from your dashboard.' })
      return undefined
    }
    const path = '/tests/' + encodeURIComponent(testId) + '/result' + (attemptNo ? '?attempt=' + encodeURIComponent(attemptNo) : '')
    api(path, { token: getToken() })
      .then((d) => {
        if (!live) return
        const paper = paperOf(d.test)
        const flat = flatten(paper)
        setState({
          status: 'ready',
          paper,
          flat,
          attempt: attemptOf(d.attempt, null, flat.length),
          meta: {
            history: d.history || [],
            canRetake: !!d.canRetake,
            inProgress: !!d.inProgress,
            attemptNo: d.attempt.attemptNo || 1,
            settings: d.settings || null,
            paperAt: d.paperAt || null,
          },
        })
      })
      .catch((e) => {
        if (!live) return
        const error = e.status === 404 ? 'This test doesn’t exist or isn’t available to you any more.' : e.status === 409 ? 'You haven’t submitted this test yet.' : e.message
        setState({ status: 'error', error })
      })
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the hash only sets the first filter
  }, [testId, attemptNo])

  // Opened at its solutions: once the result is in, scroll to the questions list
  const ready = state.status === 'ready'
  useEffect(() => {
    if (!ready || (hash !== '#solutions' && hash !== '#mistakes')) return undefined
    const id = setTimeout(() => {
      const el = document.getElementById('rv-t')
      const block = el && el.closest('section')
      if (block) block.scrollIntoView({ block: 'start' })
    }, 0)
    return () => clearTimeout(id)
  }, [ready, hash])

  return (
    <section className="result-page" aria-labelledby="result-page-title" aria-busy={state.status === 'loading' ? 'true' : 'false'}>
      <div className="result-page-head">
        <BackButton to="/student/results">Back to results</BackButton>
        <h1 id="result-page-title" className="sr">
          Result
        </h1>
      </div>

      {notice && state.status === 'ready' ? (
        <p className="result-notice" role="status">
          {notice}
        </p>
      ) : null}

      {state.status === 'loading' ? (
        <div className="result-skel" aria-hidden="true">
          <span className="skel skel-hero"></span>
          <div className="result-skel-row">
            <span className="skel"></span>
            <span className="skel"></span>
            <span className="skel"></span>
            <span className="skel"></span>
          </div>
          <span className="skel skel-block"></span>
        </div>
      ) : state.status === 'error' ? (
        <div className="card state-card" role="alert">
          <div>
            <h3>Couldn’t open this result</h3>
            <p className="meta">{state.error}</p>
          </div>
        </div>
      ) : (
        <div className="tv-test result-embed">
          <ResultView embedded paper={state.paper} flat={state.flat} attempt={state.attempt} meta={state.meta} reviewFilter={reviewFilter} setReviewFilter={setReviewFilter} />
          {submitted ? (
            <SubmittedDialog
              open={popup}
              onClose={() => setPopup(false)}
              first={((loadSession() || {}).name || '').split(' ')[0]}
              email={(loadSession() || {}).email || ''}
              auto={submitted.auto}
              testId={testId}
              paperAt={state.meta.paperAt}
              reportNotice={!state.meta.settings || state.meta.settings.reportNotice !== false}
            />
          ) : null}
        </div>
      )}
    </section>
  )
}
