import { useState } from 'react'
import './QImage.css'

/*
  One question or option diagram (an absolute image URL from the paper). It
  always sits on a white rounded box: most diagrams are black lines on a
  transparent background and would vanish on the dark theme. If it can't load,
  a short line takes its place instead of a broken-image icon.
  Spans only, so it can sit inside an option <button>.
  - small: the shorter size used inside options
  - eager: load straight away (the printable paper; print skips lazy images)
*/
export default function QImage(props) {
  // Keyed by URL: every picture gets a fresh <img> and its own try (a reused
  // <img> would keep showing the last question's picture until the new one loads)
  return <Diagram key={props.src} {...props} />
}

function Diagram({ src, alt = 'Diagram', small, eager }) {
  const [failed, setFailed] = useState(false)
  if (failed)
    return (
      <span className="qimg-fail" role="note">
        Diagram couldn’t load — check your connection
      </span>
    )
  return (
    <span className={'qimg' + (small ? ' is-small' : '')}>
      <img src={src} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" draggable="false" onError={() => setFailed(true)} />
    </span>
  )
}

/* A question's diagrams (`q.images`), in order, after its text. Nothing when there are none. */
export function QImages({ urls, eager }) {
  if (!Array.isArray(urls) || !urls.length) return null
  return (
    <span className="qimg-list">
      {urls.map((src, i) => (
        <QImage key={i} src={src} alt={urls.length > 1 ? 'Diagram ' + (i + 1) : 'Diagram'} eager={eager} />
      ))}
    </span>
  )
}
