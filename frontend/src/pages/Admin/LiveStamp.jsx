import { ago } from './studentsApi.js'
import { useNow } from './useLive.js'

/* "Updated just now" + Refresh button. When a refresh fails the timestamp
   stays where it is (the data on screen is still the last good copy) and only
   a small dot plus a "Retry" label change — no alarming sentence. The actual
   error sits in the tooltip. */
export default function LiveStamp({ at, loading, error, onRefresh }) {
  const now = useNow()
  const secs = at ? Math.max(0, Math.round((now - at) / 1000)) : null
  const text = loading && at == null ? 'Loading…' : secs == null ? '' : secs < 10 ? 'Updated just now' : secs < 60 ? `Updated ${secs}s ago` : 'Updated ' + ago(at, now)
  const stale = Boolean(error && at)
  return (
    <div className="sg-live">
      <span className={'sg-live-text' + (stale ? ' stale' : '')} aria-live="polite" title={stale ? error : undefined}>
        {stale && <i className="sg-live-dot" aria-hidden="true" />}
        {stale ? text.replace('Updated', 'Last updated') : text}
      </span>
      <button className="btn btn-outline btn-sm" type="button" onClick={onRefresh} disabled={loading}>
        {loading ? 'Refreshing…' : stale ? 'Retry' : 'Refresh'}
      </button>
    </div>
  )
}
