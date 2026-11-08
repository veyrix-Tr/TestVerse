import { useState } from 'react'
import { EXAM, NOTES } from '../../../data/studentDemo.js'
import { greet } from '../../../lib/format.js'
import { usePopover } from '../usePopover.js'

/* Greeting, exam and a few headline numbers, set inline (not boxed). */
export default function PageHeader({ me, done, total }) {
  const { open: alertsOpen, setOpen: setAlertsOpen, ref: alertsRef } = usePopover()
  const [seen, setSeen] = useState(false)
  const unread = seen ? 0 : NOTES.filter((n) => n.unread).length
  const [today] = useState(() => new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }))

  const stats = me.bought
    ? [
        { v: done, unit: '/ ' + total, label: 'Series tests done' },
        { v: '1,284', label: 'Best all-India rank' },
        { v: '75', unit: '%', label: 'Accuracy, last test' },
        { v: '459', unit: '/ 720', label: 'Last live test score' },
      ]
    : [
        { v: '0', unit: '/ ' + total, label: 'Series tests done' },
        { v: 'Free', label: 'All-India live tests' },
      ]

  return (
    <header className="page-head" id="top">
      <div className="page-head-row">
        <div>
          <p className="eyebrow">{today}</p>
          <h1>
            {greet()}, {me.first}
          </h1>
          <p className="page-sub">
            Preparing for {EXAM.label} {EXAM.year}
            <span className={'chip ' + (me.course ? 'chip-gold' : me.bought ? 'chip-blue' : 'chip-grey')}>
              {me.course ? 'Studyverse course student' : me.bought ? 'Testverse series' : 'Free account'}
            </span>
          </p>
        </div>

        <div className="alerts" ref={alertsRef}>
          <button
            className="alerts-btn"
            type="button"
            aria-expanded={alertsOpen ? 'true' : 'false'}
            aria-controls="alerts-panel"
            aria-label={unread ? 'Alerts, ' + unread + ' unread' : 'Alerts'}
            onClick={() => {
              setAlertsOpen(!alertsOpen)
              setSeen(true)
            }}
          >
            Alerts
            {unread ? (
              <span className="count" aria-hidden="true">
                {unread}
              </span>
            ) : null}
          </button>
          <div className="alerts-panel" id="alerts-panel" role="region" aria-label="Notifications" hidden={!alertsOpen}>
            <p className="alerts-title">Notifications</p>
            <ul>
              {NOTES.map((n, i) => (
                <li key={i} className={n.unread ? 'is-unread' : undefined}>
                  <span>{n.text}</span>
                  <time>{n.when}</time>
                </li>
              ))}
            </ul>
          </div>
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
