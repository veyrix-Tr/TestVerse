import { useState } from 'react'
import { Link } from 'react-router-dom'

/* Shimmering placeholder rows while a list loads. */
export function SkeletonRows({ n = 3 }) {
  return (
    <ul className="card rows" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <li className="row is-skeleton" key={i}>
          <span className="skel" style={{ width: '45%', height: 16 }}></span>
          <span className="skel" style={{ width: '70%' }}></span>
          <span className="skel" style={{ width: 120, height: 36, borderRadius: 9 }}></span>
        </li>
      ))}
    </ul>
  )
}

/* The test list couldn't be loaded: say so and offer a retry. */
export function LoadError({ error, onRetry, what = 'your tests' }) {
  const [retrying, setRetrying] = useState(false)
  return (
    <div className="card state-card" role="alert">
      <div>
        <h3>Couldn’t load {what}</h3>
        <p className="meta">{error || 'Check your connection and try again.'}</p>
      </div>
      <button
        className="btn btn-outline"
        type="button"
        disabled={retrying}
        onClick={async () => {
          setRetrying(true)
          await onRetry()
          setRetrying(false)
        }}
      >
        {retrying ? 'Trying again…' : 'Try again'}
      </button>
    </div>
  )
}

/* Nothing to show yet: a dashed panel with a title, a line and an optional action. */
export function Empty({ title, text, to, action, onAction }) {
  return (
    <div className="card state-card is-empty">
      <div>
        <h3>{title}</h3>
        {text ? <p className="meta">{text}</p> : null}
      </div>
      {to ? (
        <Link className="btn btn-outline" to={to}>
          {action}
        </Link>
      ) : onAction ? (
        <button className="btn btn-outline" type="button" onClick={onAction}>
          {action}
        </button>
      ) : null}
    </div>
  )
}

/* Search box used above lists. */
export function SearchBox({ value, onChange, label, placeholder }) {
  return (
    <label className="search">
      <span className="sr">{label}</span>
      <input className="input" type="search" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} autoComplete="off" spellCheck="false" />
    </label>
  )
}

/* Segmented control: [{ key, label, count }] with one pressed. */
export function Segmented({ options, value, onChange, label }) {
  return (
    <div className="filter-tabs" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.key} type="button" aria-pressed={value === o.key ? 'true' : 'false'} onClick={() => onChange(o.key)}>
          {o.label}
          {o.count != null ? <span>{o.count}</span> : null}
        </button>
      ))}
    </div>
  )
}
