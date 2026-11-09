import { ago } from './studentsApi.js'
import { useNow } from './useLive.js'

/* "Updated just now" + Refresh button */
export default function LiveStamp({ at, loading, error, onRefresh }) {
  const now = useNow()
  const secs = at ? Math.max(0, Math.round((now - at) / 1000)) : null
  const text = loading && at == null ? 'Loading…' : secs == null ? '' : secs < 10 ? 'Updated just now' : secs < 60 ? `Updated ${secs}s ago` : 'Updated ' + ago(at, now)
  return (
    <div className="sg-live">
      <span className={'sg-live-text' + (error && at ? ' bad' : '')} aria-live="polite">
        {error && at ? "Couldn't refresh. " + text.replace('Updated', 'Last updated') : text}
      </span>
      <button className="btn btn-outline btn-sm" type="button" onClick={onRefresh} disabled={loading}>
        Refresh
      </button>
    </div>
  )
}
