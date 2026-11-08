import { Link } from 'react-router-dom'
import { SETTINGS, liveState } from '../../../data/studentDemo.js'
import { fmt, pad } from '../../../lib/format.js'
import SectionHead from '../SectionHead.jsx'

const time = (iso) => fmt(iso, { hour: 'numeric', minute: '2-digit' })

/* The one loud element on the dashboard: the live test now, or the next one. */
export function LiveHero({ hero, now, onRegister }) {
  if (!hero) return null
  const start = new Date(hero.start).getTime()
  const isOpen = liveState(hero) === 'open'
  const entryEnd = start + hero.window * 60000
  const left = Math.max(0, Math.floor((entryEnd - now) / 1000))
  const cd = Math.max(0, Math.floor((start - now) / 1000))

  return (
    <section className={'hero' + (isOpen ? ' is-live' : '')} aria-labelledby="hero-title">
      <div className="hero-main">
        <p className="hero-eyebrow">
          {isOpen ? (
            <>
              <span className="live-dot" aria-hidden="true"></span>Live now · All-India live test
            </>
          ) : (
            'Next all-India live test'
          )}
        </p>
        <h2 id="hero-title">{hero.title}</h2>
        <p className="hero-meta">
          {hero.meta} · {isOpen ? 'Started ' + time(hero.start) : fmt(hero.start)}
        </p>
        <div className="hero-actions">
          {isOpen ? (
            hero.registered ? (
              <Link className="btn btn-gold btn-lg" to={'/test?test=' + hero.id}>
                Start live test
              </Link>
            ) : (
              <button className="btn btn-gold btn-lg" type="button" onClick={() => onRegister(hero.id)}>
                Register and start
              </button>
            )
          ) : hero.registered ? null : (
            <button className="btn btn-gold btn-lg" type="button" onClick={() => onRegister(hero.id)}>
              Register free
            </button>
          )}
          <span className="hero-note">
            {hero.registered ? 'You’re registered. ' : ''}
            {isOpen ? 'Your all-India rank comes out after the test closes.' : hero.registered ? 'We’ll remind you before it starts.' : 'Free for every student.'}
          </span>
        </div>
      </div>

      {isOpen ? (
        <div className="hero-clock" role="timer" aria-label="Time left to enter the test">
          <span className="clock-label">Entry closes in</span>
          <span className="clock-big">
            {pad(Math.floor(left / 60))}:{pad(left % 60)}
          </span>
          <span className="clock-sub">Enter by {time(new Date(entryEnd).toISOString())}</span>
        </div>
      ) : (
        <div className="hero-clock" role="timer" aria-label="Time until the test starts">
          <span className="clock-label">Starts in</span>
          <div className="clock-segs">
            {[
              [Math.floor(cd / 86400), 'days'],
              [pad(Math.floor((cd % 86400) / 3600)), 'hrs'],
              [pad(Math.floor((cd % 3600) / 60)), 'min'],
              [pad(cd % 60), 'sec'],
            ].map(([v, l]) => (
              <span className="seg" key={l}>
                <b>{v}</b>
                <small>{l}</small>
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

/* Upcoming live tests as tiles; the announcement becomes the section description. */
export function UpcomingLive({ rest, onRegister }) {
  return (
    <section className="section" id="live" aria-labelledby="live-title">
      <SectionHead id="live-title" title="Upcoming live tests" desc={SETTINGS.announcement}>
        <a className="text-link" href="#live">
          Full calendar
        </a>
      </SectionHead>
      {rest.length ? (
        <ul className="grid live-grid">
          {rest.map((t) => {
            const d = new Date(t.start)
            return (
              <li className="card live-card" key={t.id}>
                <div className="live-date">
                  <b>{d.getDate()}</b>
                  <span>
                    {d.toLocaleString('en-IN', { month: 'short' })}
                    <br />
                    {d.toLocaleString('en-IN', { weekday: 'long' })}
                  </span>
                </div>
                <div className="live-body">
                  <h3>{t.title}</h3>
                  <p className="meta">
                    {time(t.start)} · {t.meta}
                  </p>
                </div>
                <div className="live-foot">
                  {t.registered ? (
                    <span className="status status-green">Registered</span>
                  ) : (
                    <button className="btn btn-outline btn-sm" type="button" onClick={() => onRegister(t.id)}>
                      Register
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="empty">No more live tests scheduled yet. We’ll add the next one soon.</p>
      )}
    </section>
  )
}
