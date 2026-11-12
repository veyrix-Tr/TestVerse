import { useEffect, useState } from 'react'
import { siteResources } from '../../../lib/content.js'

const EXAM = { neet: 'NEET', 'jee-main': 'JEE Main', 'jee-advanced': 'JEE Advanced' }

/*
  Homepage "Resources" — the YouTube videos admins add from Admin › Website info
  (GET /api/resources). Nothing is rendered until the list arrives, and an
  empty or unreachable list simply means no section: the page never shows a
  broken box because the API is down.
*/
export default function Resources() {
  const [items, setItems] = useState(null)

  useEffect(() => {
    let live = true
    siteResources()
      .then((rows) => live && setItems(rows))
      .catch(() => live && setItems([]))
    return () => {
      live = false
    }
  }, [])

  if (!items || !items.length) return null

  return (
    <section id="resources" className="section s-soft" aria-labelledby="resources-title">
      <div className="wrap">
        <div className="section-head">
          <p className="eyebrow">Resources</p>
          <h2 id="resources-title">Free videos to learn from</h2>
          <p className="intro">Concept lessons and exam strategy, picked by our teachers. Watch them here or on our YouTube channel.</p>
        </div>
        <ul className="res-grid">
          {items.map((v) => {
            const isPl = v.kind === 'playlist'
            const href = isPl ? 'https://www.youtube.com/playlist?list=' + v.videoId : 'https://www.youtube.com/watch?v=' + v.videoId
            return (
              <li key={v.id}>
                <a className="res-card" href={href} target="_blank" rel="noreferrer">
                  <span className={'res-thumb' + (isPl ? ' is-pl' : '')}>
                    {isPl ? null : <img src={'https://i.ytimg.com/vi/' + v.videoId + '/hqdefault.jpg'} alt="" loading="lazy" width="480" height="270" />}
                    <span className="res-play" aria-hidden="true">
                      {isPl ? (
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
                          <path d="M4 6h11v2H4zM4 11h11v2H4zM4 16h7v2H4zM17 10.5v7.2a1.6 1.6 0 1 0 1.4 1.6V11l4 1.1v5.8a1.6 1.6 0 1 0 1.4 1.6V9.2z" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
                          <path d="M8 5.5v13l11-6.5z" />
                        </svg>
                      )}
                    </span>
                    {v.exam ? <span className="res-tag">{EXAM[v.exam] || v.exam}</span> : null}
                  </span>
                  <span className="res-body">
                    <b>{v.title}</b>
                    {v.topic ? <span className="res-topic">{v.topic}</span> : null}
                    <span className="res-cta">{isPl ? 'Open playlist on YouTube' : 'Watch on YouTube'}</span>
                  </span>
                </a>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
