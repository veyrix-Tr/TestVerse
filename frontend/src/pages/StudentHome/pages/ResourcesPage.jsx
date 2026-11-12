import { useEffect, useState } from 'react'
import { myResources } from '../../../lib/content.js'
import PageHeader from '../sections/PageHeader.jsx'
import { Empty, LoadError, Segmented } from '../sections/States.jsx'

const EXAM = { neet: 'NEET', 'jee-main': 'JEE Main', 'jee-advanced': 'JEE Advanced' }

/*
  "/student/resources": the YouTube videos admins add in Admin › Website info
  that this student may see — those for everyone plus those for their exam
  (GET /api/resources/mine). A tag filter appears once there are two or more tags.
*/
export default function ResourcesPage({ me }) {
  const [state, setState] = useState({ status: 'loading', items: [], error: '' })
  const [tag, setTag] = useState('all')

  function load() {
    return myResources()
      .then((items) => setState({ status: 'ready', items, error: '' }))
      .catch((e) => setState({ status: 'error', items: [], error: e.message }))
  }
  useEffect(() => {
    load()
  }, [])

  const { status, items, error } = state
  const tags = [...new Set(items.map((v) => v.topic).filter(Boolean))]
  const shown = tag === 'all' ? items : items.filter((v) => v.topic === tag)

  return (
    <>
      <PageHeader
        title="Resources"
        desc={'Concept lessons and exam strategy picked by your teachers' + (me.examName ? ', for everyone and for ' + me.examName + ' students.' : '.')}
      />

      {status === 'error' ? (
        <LoadError error={error} onRetry={load} what="your resources" />
      ) : status === 'loading' ? (
        <ul className="sres-grid" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <li key={i} className="card sres-card">
              <span className="skel sres-thumb"></span>
              <span className="skel" style={{ width: '70%', height: 16 }}></span>
            </li>
          ))}
        </ul>
      ) : !items.length ? (
        <Empty title="No videos yet" text="Your teachers haven’t added any videos for you yet. Check back soon." />
      ) : (
        <section className="section" aria-label="Videos">
          {tags.length > 1 ? (
            <div className="toolbar">
              <Segmented
                label="Filter by tag"
                value={tag}
                onChange={setTag}
                options={[{ key: 'all', label: 'All', count: items.length }, ...tags.map((t) => ({ key: t, label: t, count: items.filter((v) => v.topic === t).length }))]}
              />
            </div>
          ) : null}
          <ul className="sres-grid">
            {shown.map((v) => {
              const isPl = v.kind === 'playlist'
              const href = isPl ? 'https://www.youtube.com/playlist?list=' + v.videoId : 'https://www.youtube.com/watch?v=' + v.videoId
              return (
                <li key={v.id}>
                  <a className="card sres-card" href={href} target="_blank" rel="noreferrer">
                    <span className={'sres-thumb' + (isPl ? ' is-pl' : '')}>
                      {isPl ? null : <img src={'https://i.ytimg.com/vi/' + v.videoId + '/hqdefault.jpg'} alt="" loading="lazy" width="480" height="270" />}
                      <span className="sres-play" aria-hidden="true">
                        {isPl ? (
                          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                            <path d="M4 6h11v2H4zM4 11h11v2H4zM4 16h7v2H4zM17 10.5v7.2a1.6 1.6 0 1 0 1.4 1.6V11l4 1.1v5.8a1.6 1.6 0 1 0 1.4 1.6V9.2z" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                            <path d="M8 5.5v13l11-6.5z" />
                          </svg>
                        )}
                      </span>
                      {v.exam ? <span className="sres-tag">{EXAM[v.exam] || v.exam}</span> : null}
                    </span>
                    <span className="sres-body">
                      <b>{v.title}</b>
                      {v.topic ? <span className="meta">{v.topic}</span> : null}
                      <span className="sres-cta">{isPl ? 'Open playlist on YouTube' : 'Watch on YouTube'}</span>
                    </span>
                  </a>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </>
  )
}
