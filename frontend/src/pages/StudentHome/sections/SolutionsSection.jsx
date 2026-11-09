import PendingLink from '../../../components/PendingLink.jsx'
import { day } from '../fmt.js'
import { pctOf, resultHref } from '../useTests.js'

/* One row per finished test (its latest attempt): what's left to learn from it, and the way into its solutions. */
export function SolutionsList({ rows }) {
  return (
    <ul className="card rows sol-rows">
      {rows.map(({ test: t, a }) => {
        const tries = (t.history || []).length
        const wrong = (a.wrong || 0) + (a.partial || 0)
        const skipped = a.skipped || 0
        return (
          <li className="row sol-row" key={t.id}>
            <div className="row-main">
              <span className="row-title">{t.title}</span>
              <span className="meta">
                {t.questionCount} questions · last attempted {day(a.submittedAt)}
                {tries > 1 ? ' · ' + tries + ' attempts' : ''}
              </span>
            </div>
            <dl className="sol-stats">
              <div>
                <dt>Latest score</dt>
                <dd>
                  <b>{a.score}</b>
                  <span className="muted"> / {a.maxScore}</span>
                  <span className="muted"> · {pctOf(a)}%</span>
                </dd>
              </div>
              <div>
                <dt>Wrong</dt>
                <dd className={wrong ? 'is-wrong' : undefined}>{wrong}</dd>
              </div>
              <div>
                <dt>Skipped</dt>
                <dd>{skipped}</dd>
              </div>
            </dl>
            <div className="row-action">
              {wrong ? (
                <PendingLink className="btn btn-outline btn-sm" to={resultHref(t, a, 'mistakes')}>
                  Review mistakes
                </PendingLink>
              ) : null}
              <PendingLink className="btn btn-primary btn-sm" to={resultHref(t, a, 'solutions')}>
                Open solutions
              </PendingLink>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
