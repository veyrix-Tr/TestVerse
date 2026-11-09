/*
  The header every student page opens with: an optional back link and eyebrow,
  the page title, a one-line description, actions on the right, and anything
  passed as children (the headline numbers) underneath.
*/
export default function PageHeader({ back, eyebrow, title, desc, actions, children }) {
  return (
    <header className="page-head">
      <div className="page-head-row">
        <div className="page-head-text">
          {back}
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h1 id="page-title">{title}</h1>
          {desc ? <div className="page-desc">{desc}</div> : null}
        </div>
        {actions ? <div className="page-head-actions">{actions}</div> : null}
      </div>
      {children}
    </header>
  )
}

/* Headline numbers set inline under a page title. Each item is
   { label, v, unit?, note?, tone? }; `v: null` shimmers while `loading`,
   otherwise shows `empty` (a short note). */
export function Stats({ items, loading }) {
  return (
    <dl className="stats">
      {items.map((s) => (
        <div className="stat" key={s.label}>
          <dt>{s.label}</dt>
          {loading ? (
            <dd aria-busy="true">
              <span className="skel skel-stat"></span>
              <span className="sr">Loading</span>
            </dd>
          ) : s.v != null ? (
            <dd className={s.tone ? 'is-' + s.tone : undefined}>
              {s.v}
              {s.unit ? <span className="unit">{s.unit}</span> : null}
              {s.note ? <span className="stat-note">{s.note}</span> : null}
            </dd>
          ) : (
            <dd className="stat-empty">{s.empty || '—'}</dd>
          )}
        </div>
      ))}
    </dl>
  )
}
