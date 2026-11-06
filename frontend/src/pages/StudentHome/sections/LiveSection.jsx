import { liveState } from '../../../data/studentDemo.js'
import { fmt, pad } from '../../../lib/format.js'

/* design/student-home.html liveSection() — live hero + upcoming list */
export default function LiveSection({ live, now, onRegister }) {
  const open = live.filter((t) => liveState(t) === 'open')[0]
  const next = live
    .filter((t) => liveState(t) === 'upcoming')
    .sort((a, b) => new Date(a.start) - new Date(b.start))
  const hero = open || next[0]
  const rest = next.filter((t) => t !== hero)

  return (
    <section id="live" style={{ display: 'grid', gap: '14px' }}>
      {hero ? <LiveHero hero={hero} now={now} onRegister={onRegister} /> : null}

      {rest.length ? (
        <div className="card">
          <div className="card-head">
            <h2>Upcoming live tests</h2>
            <a href="#calendar">Full calendar</a>
          </div>
          <div className="upcoming">
            {rest.map((t) => {
              const d = new Date(t.start)
              return (
                <div className="up" key={t.id}>
                  <div className="date">
                    <b>{d.getDate()}</b>
                    <span>
                      {d.toLocaleString('en-IN', { month: 'short' })}, {d.toLocaleString('en-IN', { weekday: 'short' })}
                    </span>
                  </div>
                  <div>
                    <strong>{t.title}</strong>
                    <em>
                      {fmt(t.start, { hour: 'numeric', minute: '2-digit' })} · {t.meta}
                    </em>
                  </div>
                  {t.registered ? (
                    <span className="pill p-done">Registered</span>
                  ) : (
                    <button className="btn btn-outline btn-sm" type="button" data-register={t.id} onClick={() => onRegister(t.id)}>
                      Register
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ) : null}
    </section>
  )
}

function LiveHero({ hero, now, onRegister }) {
  const isOpen = liveState(hero) === 'open'
  const entryEnd = new Date(new Date(hero.start).getTime() + hero.window * 60000)
  const left = Math.max(0, Math.floor((new Date(hero.start).getTime() + hero.window * 60000 - now) / 1000))
  const cd = Math.max(0, Math.floor((new Date(hero.start).getTime() - now) / 1000))

  return (
    <div className="live">
      <div>
        <small>
          {isOpen ? (
            <>
              <span className="pulse" aria-hidden="true"></span>Live now
            </>
          ) : (
            'Next all-India live test'
          )}
        </small>
        <h2>{hero.title}</h2>
        <p>
          {hero.meta} · {fmt(hero.start)}
          {isOpen ? ' · Enter by ' + fmt(entryEnd.toISOString(), { hour: 'numeric', minute: '2-digit' }) : ''}
        </p>
      </div>
      <div className="live-actions">
        {isOpen ? (
          <>
            {hero.registered ? (
              <a className="btn btn-gold" href={'/test?test=' + hero.id}>
                Start live test
              </a>
            ) : (
              <button className="btn btn-gold" type="button" data-register={hero.id} onClick={() => onRegister(hero.id)}>
                Register and start
              </button>
            )}
            <span style={{ fontSize: '13px', color: '#C9D0EC' }}>
              Entry closes in <b>{Math.floor(left / 60)} min {pad(left % 60)} s</b>
            </span>
          </>
        ) : (
          <>
            <div className="countdown" data-count-to={hero.start} aria-label="Time until the test starts">
              <div>
                <b>{Math.floor(cd / 86400)}</b>
                <span>days</span>
              </div>
              <div>
                <b>{pad(Math.floor((cd % 86400) / 3600))}</b>
                <span>hrs</span>
              </div>
              <div>
                <b>{pad(Math.floor((cd % 3600) / 60))}</b>
                <span>min</span>
              </div>
              <div>
                <b>{pad(cd % 60)}</b>
                <span>sec</span>
              </div>
            </div>
            {hero.registered ? (
              <span style={{ fontSize: '13px', color: 'var(--gold)' }}>✓ You’re registered. We’ll remind you.</span>
            ) : (
              <button className="btn btn-gold" type="button" data-register={hero.id} onClick={() => onRegister(hero.id)}>
                Register free
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
