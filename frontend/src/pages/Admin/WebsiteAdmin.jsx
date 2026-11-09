import { useMemo, useState } from 'react'
import { useToast } from '../../lib/useToast.jsx'

/*
  Admin › Website info (React screen, shown by Admin.jsx in place of the demo
  #view while the sidebar's "Website info" item is active).

  Two editable blocks — the announcement strip and the YouTube video library —
  plus a read-only column for the values the site fills in by itself (prices,
  next live test). Everything reads and writes the same demo store adminApp.js
  keeps in localStorage; when settings grow a real endpoint, only read()/patch()
  below need to change.
*/
const STORE_KEY = 'sv-admin-demo-v4' // same key as adminApp.js
const MAX_TEXT = 160
const YT = /^https:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\//i

function readStore() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || null
  } catch {
    return null
  }
}

/* The two editable values, with the same defaults the seed uses. */
function readSaved() {
  const db = readStore() || {}
  return {
    announcement: (db.website && db.website.announcement) || '',
    showAnnouncement: !!(db.website && db.website.showAnnouncement),
    channel: (db.video && db.video.channel) || '',
    playlists: Object.assign({}, (db.video && db.video.playlists) || {}),
  }
}

/* Everything the read-only column shows: exams (price / sale) and the next live test. */
function readInfo() {
  const db = readStore() || {}
  const exams = Object.keys(db.exams || {}).map((k) => ({
    id: k,
    label: db.exams[k].label,
    price: db.exams[k].price,
    onSale: !!db.exams[k].onSale,
  }))
  const nextLive = (db.tests || [])
    .filter((x) => x.kind === 'live' && x.status === 'scheduled' && new Date(x.start) > new Date())
    .sort((a, b) => new Date(a.start) - new Date(b.start))[0]
  return { exams, nextLive, video: db.video || {} }
}

function patch(fn) {
  const db = readStore()
  if (!db) return false
  fn(db)
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(db))
    return true
  } catch {
    return false
  }
}

function stamp(iso) {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
  } catch {
    return iso
  }
}

export default function WebsiteAdmin() {
  const { toast, node: toastNode } = useToast()
  const [saved, setSaved] = useState(readSaved)
  const [draft, setDraft] = useState(readSaved)
  const info = useMemo(() => readInfo(), [])

  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }))
  const annDirty = draft.announcement !== saved.announcement || draft.showAnnouncement !== saved.showAnnouncement
  const vidDirty = draft.channel !== saved.channel || JSON.stringify(draft.playlists) !== JSON.stringify(saved.playlists)
  const channel = draft.channel.trim()
  const channelBad = channel !== '' && !YT.test(channel)
  const setPlaylists = info.exams.filter((e) => (draft.playlists[e.id] || '').trim()).length

  function saveAnnouncement() {
    const text = draft.announcement.trim()
    const showAnnouncement = draft.showAnnouncement
    if (text.length > MAX_TEXT) return toast('Keep the announcement under ' + MAX_TEXT + ' characters')
    if (text && !showAnnouncement) return toast('Turn the strip on, or clear the text')
    patch((db) => {
      db.website = Object.assign({}, db.website, { announcement: text, showAnnouncement })
    })
    setSaved((s) => ({ ...s, announcement: text, showAnnouncement }))
    setDraft((d) => ({ ...d, announcement: text }))
    toast(text && showAnnouncement ? 'Announcement saved' : 'Announcement saved — strip hidden')
  }

  function saveVideo() {
    if (!channel) return toast('Enter your YouTube channel link')
    if (!YT.test(channel)) return toast("That doesn't look like a YouTube link")
    const playlists = {}
    for (const e of info.exams) {
      const u = (draft.playlists[e.id] || '').trim()
      if (u && !YT.test(u)) return toast(e.label + ' playlist must be a YouTube link')
      if (u) playlists[e.id] = u
    }
    patch((db) => {
      db.video = Object.assign({}, db.video, { channel, playlists })
    })
    setSaved((s) => ({ ...s, channel, playlists }))
    setDraft((d) => ({ ...d, channel, playlists }))
    toast('Video library links saved')
  }

  const liveChannel = YT.test(channel) ? channel : ''
  const stripText = draft.announcement.trim()

  return (
    <>
      <div className="head sg-head">
        <div>
          <h1>Website info</h1>
          <p>What visitors read before they sign up. You edit the announcement and video links; prices and live test dates keep themselves up to date.</p>
        </div>
        <a className="btn btn-outline" href="/" target="_blank" rel="noreferrer">
          Open the website
        </a>
      </div>

      <div className="ws-grid">
        <div className="ws-col">
          {/* ---------- Announcement strip ---------- */}
          <section className="card" aria-labelledby="ws-ann-t">
            <div className="card-head">
              <div>
                <h2 id="ws-ann-t">Announcement strip</h2>
                <p className="meta">The one line above the homepage menu — good for the next live test or an offer.</p>
              </div>
              <label className="ws-switch">
                <input type="checkbox" checked={draft.showAnnouncement} onChange={(e) => set('showAnnouncement', e.target.checked)} />
                <span>{draft.showAnnouncement ? 'Shown' : 'Hidden'}</span>
              </label>
            </div>

            <div className="stack">
              <div>
                <label className="l" htmlFor="ws-text">
                  Text
                </label>
                <textarea
                  id="ws-text"
                  className="input"
                  rows={2}
                  maxLength={MAX_TEXT}
                  value={draft.announcement}
                  onChange={(e) => set('announcement', e.target.value)}
                  placeholder="Next NEET live test on Sunday, 15 November at 2:00 PM. Register free."
                />
                <p className="hint">{MAX_TEXT - draft.announcement.length} characters left</p>
              </div>

              <div className="ws-preview">
                <span className="ws-preview-label">Preview</span>
                <span className={'ws-strip' + (draft.showAnnouncement ? '' : ' is-off')}>
                  {draft.showAnnouncement ? stripText || 'Your announcement will appear here.' : 'Hidden — visitors see no strip.'}
                </span>
              </div>
            </div>

            <div className="card-foot ws-foot">
              <span className={'pill ' + (annDirty ? 'p-draft' : 'p-published')}>{annDirty ? 'Unsaved changes' : 'Saved'}</span>
              <button className="btn btn-primary" type="button" disabled={!annDirty} onClick={saveAnnouncement}>
                Save announcement
              </button>
            </div>
          </section>

          {/* ---------- Video library ---------- */}
          <section className="card" aria-labelledby="ws-vid-t">
            <div className="card-head">
              <div>
                <h2 id="ws-vid-t">Video library</h2>
                <p className="meta">Where the “Video library” button sends students — your channel, with a playlist per exam.</p>
              </div>
              <span className={'pill ' + (setPlaylists === info.exams.length && info.exams.length ? 'p-published' : 'p-draft')}>
                {setPlaylists} of {info.exams.length} playlists set
              </span>
            </div>

            <div className="stack">
              <div>
                <label className="l" htmlFor="ws-ch">
                  Channel link
                </label>
                <div className="ws-row">
                  <input
                    id="ws-ch"
                    className="input"
                    type="url"
                    inputMode="url"
                    value={draft.channel}
                    aria-invalid={channelBad ? 'true' : undefined}
                    onChange={(e) => set('channel', e.target.value)}
                    placeholder="https://www.youtube.com/@yourchannel"
                  />
                  {liveChannel && (
                    <a className="btn btn-outline btn-sm" href={liveChannel} target="_blank" rel="noreferrer">
                      Open
                    </a>
                  )}
                </div>
                <p className={'hint' + (channelBad ? ' is-bad' : '')}>
                  {channelBad
                    ? 'That is not a YouTube link — use https://youtube.com/… or https://youtu.be/…'
                    : 'Shown in the app and the site footer. Required.'}
                </p>
              </div>

              <div className="ws-rows">
                <span className="ws-sub">Exam playlists (optional)</span>
                {info.exams.map((e) => {
                  const val = (draft.playlists[e.id] || '').trim()
                  const bad = val !== '' && !YT.test(val)
                  return (
                    <div className="ws-row" key={e.id}>
                      <label htmlFor={'ws-pl-' + e.id}>{e.label}</label>
                      <input
                        id={'ws-pl-' + e.id}
                        className="input"
                        type="url"
                        inputMode="url"
                        aria-invalid={bad ? 'true' : undefined}
                        value={draft.playlists[e.id] || ''}
                        onChange={(e2) => set('playlists', { ...draft.playlists, [e.id]: e2.target.value })}
                        placeholder="https://www.youtube.com/playlist?list=…"
                      />
                      <span className={'ws-state ' + (bad ? 'is-bad' : val ? 'is-on' : 'is-off')}>{bad ? 'Check link' : val ? 'Set' : 'Empty'}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="card-foot ws-foot">
              <span className={'pill ' + (vidDirty ? 'p-draft' : 'p-published')}>{vidDirty ? 'Unsaved changes' : 'Saved'}</span>
              <button className="btn btn-primary" type="button" disabled={!vidDirty} onClick={saveVideo}>
                Save video links
              </button>
            </div>
          </section>
        </div>

        {/* ---------- Read-only column ---------- */}
        <div className="ws-col">
          <section className="card" aria-labelledby="ws-auto-t">
            <div className="card-head">
              <div>
                <h2 id="ws-auto-t">Shown automatically</h2>
                <p className="meta">Filled in from Tests and pricing — nothing to edit here.</p>
              </div>
            </div>
            <div className="summary-list">
              {info.exams.map((e) => (
                <div key={e.id}>
                  <span>{e.label} price</span>
                  <span>
                    {e.onSale ? '₹' + Number(e.price || 0).toLocaleString('en-IN') : 'Not on sale'}
                    {e.onSale && <span className="pill p-published ws-pill">On sale</span>}
                  </span>
                </div>
              ))}
              <div>
                <span>Next live test</span>
                <span>
                  {info.nextLive
                    ? (info.exams.find((e) => e.id === info.nextLive.exam) || {}).label + ' · ' + stamp(info.nextLive.start)
                    : 'None scheduled'}
                </span>
              </div>
            </div>
          </section>

          <section className="card" aria-labelledby="ws-now-t">
            <div className="card-head">
              <div>
                <h2 id="ws-now-t">Live on the website</h2>
                <p className="meta">A quick read of what is switched on right now.</p>
              </div>
            </div>
            <div className="summary-list">
              <div>
                <span>Announcement strip</span>
                <span>{draft.showAnnouncement ? (stripText ? 'On — “' + short(stripText) + '”' : 'On — empty') : 'Off'}</span>
              </div>
              <div>
                <span>Channel link</span>
                <span className={liveChannel ? 'ws-ok' : 'ws-bad'}>{liveChannel ? 'Set' : 'Missing'}</span>
              </div>
              <div>
                <span>Exam playlists</span>
                <span className={setPlaylists ? 'ws-ok' : 'ws-bad'}>{setPlaylists ? setPlaylists + ' of ' + info.exams.length : 'None yet'}</span>
              </div>
            </div>
            <p className="hint ws-note">Changes here are saved in this browser (demo). Point them at the settings API to push them to the live site.</p>
          </section>
        </div>
      </div>
      {toastNode}
    </>
  )
}

function short(t) {
  return t.length > 42 ? t.slice(0, 42).trimEnd() + '…' : t
}
