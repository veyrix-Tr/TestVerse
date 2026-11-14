import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../../lib/api.js'
import { getToken } from '../../../lib/session.js'
import { LockIcon, unlockText } from './afterTest.jsx'

/*
  A test's leaderboard (GET /api/tests/:id/leaderboard), styled by Test.css, so
  it renders inside a .tv-test wrapper: the result page, and the dashboard's
  Leaderboard page.

  Ranks come from everyone's FIRST attempt; retakes never move the board. A
  student who retook the test is told where that retake would stand. Other
  students show by first name only. A live test's board opens when it closes.

  compact: the result page's version — the top 10 plus the student's own row,
  and a link to the full board.
*/

/* "2 h 41 min", "46 min 12 s", "52 s" */
export function timeText(ms) {
  const s = Math.max(0, Math.round((ms || 0) / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h) return h + ' h' + (m ? ' ' + m + ' min' : '')
  if (m) return m + ' min' + (s % 60 ? ' ' + (s % 60) + ' s' : '')
  return s + ' s'
}

const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

const TrophyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M8 21h8" />
    <path d="M12 17v4" />
    <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
    <path d="M17 6h3v2a3 3 0 0 1-3 3" />
    <path d="M7 6H4v2a3 3 0 0 0 3 3" />
  </svg>
)

function Row({ r }) {
  return (
    <li className={'lb-row' + (r.isYou ? ' is-you' : '') + (r.rank <= 3 ? ' is-top is-top-' + r.rank : '')} aria-current={r.isYou ? 'true' : undefined}>
      <span className="lb-rank">
        {r.rank <= 3 ? <span className="lb-medal" aria-hidden="true">{r.rank}</span> : r.rank}
        {r.rank <= 3 ? <span className="sr">Rank {r.rank}</span> : null}
      </span>
      <span className="lb-name">
        {r.name}
        {r.isYou ? <span className="lb-you">You</span> : null}
      </span>
      <span className="lb-score">
        <b>{r.score}</b>
        <small>/{r.maxScore}</small>
      </span>
      <span className="lb-acc">{r.accuracy == null ? '—' : r.accuracy + '%'}</span>
      <span className="lb-time">{timeText(r.timeMs)}</span>
    </li>
  )
}

export default function Leaderboard({ testId, compact = false, fullHref }) {
  const [state, setState] = useState({ status: 'loading' })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let live = true
    setState({ status: 'loading' })
    api('/tests/' + encodeURIComponent(testId) + '/leaderboard?limit=' + (compact ? 10 : 100), { token: getToken() })
      .then((d) => live && setState({ status: 'ready', ...d }))
      .catch((e) => {
        if (!live) return
        if (e.status === 403 && e.data && e.data.unlocksAt) setState({ status: 'locked', unlocksAt: e.data.unlocksAt })
        else if (e.status === 409) setState({ status: 'none' })
        else setState({ status: 'error', error: e.message })
      })
    return () => {
      live = false
    }
  }, [testId, compact, tick])

  if (state.status === 'loading') {
    return (
      <div className="panel lb-panel" aria-busy="true">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="lb-skel"></span>
        ))}
      </div>
    )
  }
  if (state.status === 'locked') {
    return (
      <div className="panel lb-panel lb-state">
        <span className="lb-state-ic">
          <LockIcon />
        </span>
        <div>
          <b>The leaderboard opens at {unlockText(state.unlocksAt)}</b>
          <p>This live test is still open for other students, so ranks are hidden until it closes for everyone.</p>
        </div>
      </div>
    )
  }
  if (state.status === 'none') {
    return (
      <div className="panel lb-panel lb-state">
        <span className="lb-state-ic">
          <TrophyIcon />
        </span>
        <div>
          <b>Take this test to see the leaderboard</b>
          <p>Ranks show once you’ve submitted it.</p>
        </div>
      </div>
    )
  }
  if (state.status === 'error') {
    return (
      <div className="panel lb-panel lb-state" role="alert">
        <div>
          <b>Couldn’t load the leaderboard</b>
          <p>{state.error}</p>
        </div>
        <button className="btn btn-outline btn-sm" type="button" onClick={() => setTick((t) => t + 1)}>
          Try again
        </button>
      </div>
    )
  }

  const { top, me, total, retake } = state
  const meShown = me && top.some((r) => r.isYou)
  const pctAhead = me && total > 1 ? Math.round(((total - me.rank) / (total - 1)) * 100) : null

  return (
    <div className="lb">
      {me ? (
        <div className="lb-me">
          <div className="lb-me-rank">
            <span>Your rank</span>
            <b>
              #{me.rank}
              <small> of {total}</small>
            </b>
          </div>
          <p className="lb-me-text">
            {me.rank === 1
              ? total > 1
                ? 'Top of the board. Every other student scored lower or took longer.'
                : 'You’re the first to finish this test. Others will appear here as they submit.'
              : pctAhead > 0
                ? 'Ahead of ' + pctAhead + '% of the ' + total + ' students who took it, on your first attempt.'
                : (total - 1) + ' student' + (total - 1 === 1 ? '' : 's') + ' finished ahead of you on their first attempt. Plenty of room to climb in the next test.'}
          </p>
          {retake ? (
            <p className="lb-retake">
              Your retake (attempt {retake.attemptNo}) scored <b>{retake.score}/{retake.maxScore}</b>, which would place you <b>{ordinal(retake.wouldRank)}</b>. The board only counts first attempts, so your rank stays #{me.rank}.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="panel lb-panel">
        <div className="lb-head" aria-hidden="true">
          <span>Rank</span>
          <span>Student</span>
          <span className="lb-score">Score</span>
          <span className="lb-acc">Accuracy</span>
          <span className="lb-time">Time</span>
        </div>
        <ol className="lb-list" aria-label={'Leaderboard, ' + total + ' students'}>
          {top.map((r, i) => (
            <Row key={i} r={r} />
          ))}
          {me && !meShown ? (
            <>
              <li className="lb-gap" aria-hidden="true">
                ···
              </li>
              <Row r={me} />
            </>
          ) : null}
        </ol>
        <div className="lb-foot">
          <span>
            {total > top.length ? 'Top ' + top.length + ' of ' + total + ' students' : total + ' student' + (total === 1 ? '' : 's')} · first attempts only · ties go to the faster time
          </span>
          {compact && fullHref ? (
            <Link className="lb-more" to={fullHref}>
              Full leaderboard →
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  )
}
