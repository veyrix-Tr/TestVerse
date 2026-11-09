/* Admin sections that aren't built yet, keyed by their sidebar view. */
const TITLES = { analysis: 'Analysis', requests: 'Video requests' }

/* The main area for an admin section that's coming soon: one big message on a navy panel. */
export default function AdminComingSoon({ view }) {
  const name = TITLES[view]
  if (!name) return null
  return (
    <section className="soon-big" aria-labelledby="soon-big-title">
      <span className="soon-orbit o1" aria-hidden="true"></span>
      <span className="soon-orbit o2" aria-hidden="true"></span>
      <span className="soon-orbit o3" aria-hidden="true"></span>
      <div className="soon-in">
        <span className="soon-name">
          <i aria-hidden="true"></i>
          {name} · In the works
        </span>
        <h1 id="soon-big-title">
          Coming <em>soon</em>
        </h1>
        <p>We’re putting the finishing touches on {name.toLowerCase()}. It will show up right here when it’s ready.</p>
      </div>
    </section>
  )
}
