import { useEffect, useState } from 'react'
import { useRouteError } from 'react-router-dom'
import { isStaleBuild, reloadOnce } from '../lib/reloadOnce.js'
import './RouteError.css'

/*
  Shown when a page can't open. A tab left open across a deploy just reloads
  itself into the new version (lib/reloadOnce.js); anything else gets a plain
  message with a way back, instead of React Router's developer screen.
*/
export default function RouteError() {
  const error = useRouteError()
  const stale = isStaleBuild(error)
  const [reloading, setReloading] = useState(stale)

  useEffect(() => {
    if (!stale) console.error(error)
    else if (!reloadOnce()) setReloading(false)
  }, [stale, error])

  if (reloading) {
    return (
      <main className="route-error" aria-busy="true">
        <p className="route-error-msg">Loading the latest version of Testverse…</p>
      </main>
    )
  }
  return (
    <main className="route-error">
      <div className="route-error-card">
        <h1>{stale ? 'A new version of Testverse is ready' : 'Something went wrong'}</h1>
        <p>
          {stale
            ? 'Reload the page to continue. Your answers and progress are saved.'
            : 'This page couldn’t open. Reload it, or go back to the homepage. Your answers and progress are saved.'}
        </p>
        <div className="route-error-actions">
          <button type="button" className="route-error-btn primary" onClick={() => window.location.reload()}>
            Reload page
          </button>
          <a className="route-error-btn" href="/">
            Go to homepage
          </a>
        </div>
      </div>
    </main>
  )
}
