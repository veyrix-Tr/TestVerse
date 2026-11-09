import { useState } from 'react'
import { greet } from '../../../lib/format.js'

/* Greeting, exam and a few headline numbers from the real test list, set inline (not boxed). */
export default function PageHeader({ me, stats }) {
  const [today] = useState(() => new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }))

  return (
    <header className="page-head" id="top">
      <div className="page-head-row">
        <div>
          <p className="eyebrow">{today}</p>
          <h1>
            {greet()}, {me.first}
          </h1>
          <p className="page-sub">
            {me.examText ? 'Preparing for ' + me.examText : null}
            {me.batch ? <span className="chip chip-gold">{me.batch}</span> : <span className="chip chip-grey">Free access</span>}
          </p>
        </div>
      </div>

      <dl className="stats">
        {stats.map((s) => (
          <div className="stat" key={s.label}>
            <dt>{s.label}</dt>
            <dd>
              {s.v}
              {s.unit ? <span className="unit">{s.unit}</span> : null}
            </dd>
          </div>
        ))}
      </dl>
    </header>
  )
}
