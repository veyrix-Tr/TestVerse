import { Link } from 'react-router-dom'
import PendingLink from '../../../components/PendingLink.jsx'
import { fmt } from '../../../lib/format.js'
import { day } from '../fmt.js'
import { accuracyOf, pctOf, resultHref, signed, testHref } from '../useTests.js'

const dayShort = (iso) => fmt(iso, { day: 'numeric', month: 'short' })

/* Change in marks from the previous attempt at the same test. */
export function Delta({ v, quiet }) {
  if (v == null) return quiet ? null : <span className="delta">—</span>
  if (v === 0) return <span className="delta">No change</span>
  return <span className={'delta ' + (v > 0 ? 'up' : 'down')}>{signed(v) + ' marks'}</span>
}

/* Overview: the latest few attempts as compact rows. */
export function RecentResults({ rows }) {
  return (
    <ul className="card rows">
      {rows.map(({ test: t, a, delta }) => (
        <li className="row" key={t.id + '-' + a.attemptNo}>
          <div className="row-main">
            <Link className="row-title" to={resultHref(t, a)}>
              {t.title}
            </Link>
            <span className="meta">
              {dayShort(a.submittedAt)}
              {a.attemptNo > 1 ? ' · attempt ' + a.attemptNo : ''}
            </span>
          </div>
          <div className="row-score">
            <b>
              {pctOf(a)}
              <small>%</small>
            </b>
            <span className="meta">
              {a.score} / {a.maxScore}
            </span>
          </div>
          <div className="row-side">
            <Delta v={delta} quiet />
          </div>
        </li>
      ))}
    </ul>
  )
}

/* Results page: every attempt as a table (stacked cards on phones). */
export function AttemptsTable({ rows }) {
  return (
    <div className="card table-wrap">
      <table className="atable">
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Test</th>
            <th scope="col" className="num">
              Score
            </th>
            <th scope="col" className="num">
              Percent
            </th>
            <th scope="col">Change</th>
            <th scope="col" className="num">
              Accuracy
            </th>
            <th scope="col">Answers</th>
            <th scope="col">
              <span className="sr">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ test: t, a, latest, delta }) => {
            const acc = accuracyOf(a)
            const tries = (t.history || []).length
            return (
              <tr key={t.id + '-' + a.attemptNo}>
                <td className="a-date" data-label="Date">
                  {day(a.submittedAt)}
                </td>
                <td className="a-test">
                  <Link to={resultHref(t, a)}>{t.title}</Link>
                  <span className="meta">
                    Attempt {a.attemptNo}
                    {tries > 1 ? ' of ' + tries : ''}
                    {latest && tries > 1 ? <span className="chip chip-blue">Latest</span> : null}
                  </span>
                </td>
                <td className="num a-score" data-label="Score">
                  <b>{a.score}</b>
                  <span className="muted"> / {a.maxScore}</span>
                </td>
                <td className="num" data-label="Percent">
                  <b>{pctOf(a)}%</b>
                </td>
                <td data-label="Change">
                  <Delta v={delta} />
                </td>
                <td className="num" data-label="Accuracy">
                  {acc == null ? <span className="muted">—</span> : acc + '%'}
                </td>
                <td data-label="Answers">
                  <span className="ans-split">
                    <span className="s-c" title="Correct">
                      {a.correct || 0}
                      <span className="sr"> correct</span>
                    </span>
                    <span className="s-w" title="Wrong">
                      {(a.wrong || 0) + (a.partial || 0)}
                      <span className="sr"> wrong</span>
                    </span>
                    <span className="s-s" title="Skipped">
                      {a.skipped || 0}
                      <span className="sr"> skipped</span>
                    </span>
                  </span>
                </td>
                <td className="a-actions">
                  <div>
                    <PendingLink className="btn btn-outline btn-sm" to={resultHref(t, a)}>
                      View result
                    </PendingLink>
                    {latest && t.canRetake ? (
                      <PendingLink className="btn btn-primary btn-sm" to={testHref(t) + '&retake=1'}>
                        Retake
                      </PendingLink>
                    ) : null}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
