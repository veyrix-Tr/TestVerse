import { useEffect, useMemo, useState } from 'react'
import { useToast } from '../../lib/useToast.jsx'
import { getWebsiteSettings, updateWebsiteSettings } from './websiteApi.js'
import {
  AUDIENCES,
  audienceLabel,
  createAnnouncement,
  createResource,
  deleteAnnouncement,
  deleteResource,
  listAnnouncements,
  listResources,
  updateAnnouncement,
  updateResource,
  videoIdOf,
} from '../../lib/content.js'
import LiveStamp from './LiveStamp.jsx'
import { useLive, useNow } from './useLive.js'

/*
  Admin > Website info — the site's content hub, shown by Admin.jsx in place of
  the demo #view while the sidebar's "Website info" item is active.

  Left column (yours to edit):
    Announcements  -> homepage strip + the banner in the student dashboard
                      (backend: /api/admin/announcements, /api/announcements…)
    Video resources-> the homepage "Resources" section
                      (backend: /api/admin/resources, /api/resources)
  Right column: the YouTube channel / playlist links — stored through the
  settings API (/api/admin/website) — and the values the site fills in by
  itself (prices, next live test), read from the demo store until they get
  their own endpoint.
*/
const STORE_KEY = 'sv-admin-demo-v4'
const MAX_BODY = 300
const YT_HOSTS = /^https:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\//i

const EMPTY_DRAFT = { body: '', audience: 'all', link: '', startsAt: '', endsAt: '' }
const EMPTY_VIDEO = { url: '', title: '', exam: '', topic: '' }

/* ---------------- demo store: channel, playlists, prices ---------------- */
function readStore() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || null
  } catch {
    return null
  }
}
// Read-only info for the right-hand column: exam prices and the next live
// test. (Channel + playlists come from the settings API, below.)
function readLibrary() {
  const db = readStore() || {}
  return {
    exams: Object.keys(db.exams || {}).map((k) => ({ id: k, label: db.exams[k].label, price: db.exams[k].price, onSale: !!db.exams[k].onSale })),
    nextLive: (db.tests || [])
      .filter((x) => x.kind === 'live' && x.status === 'scheduled' && new Date(x.start) > new Date())
      .sort((a, b) => new Date(a.start) - new Date(b.start))[0],
  }
}

/* ---------------- small helpers ---------------- */
const two = (n) => String(n).padStart(2, '0')
// ISO -> value for <input type="datetime-local">, in the admin's own timezone
function toInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d)) return ''
  return d.getFullYear() + '-' + two(d.getMonth() + 1) + '-' + two(d.getDate()) + 'T' + two(d.getHours()) + ':' + two(d.getMinutes())
}
function whenText(iso) {
  const d = new Date(iso)
  if (isNaN(d)) return ''
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
}
function annState(a, now) {
  if (!a.isActive) return { label: 'Off', cls: 'p-draft' }
  if (Date.parse(a.startsAt) > now) return { label: 'Scheduled', cls: 'p-scheduled' }
  if (a.endsAt && Date.parse(a.endsAt) < now) return { label: 'Ended', cls: 'p-off' }
  return { label: 'Live', cls: 'p-published' }
}
function whenLine(a) {
  if (Date.parse(a.startsAt) > Date.now()) return 'From ' + whenText(a.startsAt)
  if (a.endsAt) return (Date.parse(a.endsAt) < Date.now() ? 'Ended ' : 'Until ') + whenText(a.endsAt)
  return 'Since ' + whenText(a.startsAt)
}

export default function WebsiteAdmin() {
  const { toast, node: toastNode } = useToast()
  const now = useNow(30000)

  const annLive = useLive(listAnnouncements, 'website-ann')
  const resLive = useLive(listResources, 'website-res')
  const anns = (annLive.data && annLive.data.announcements) || []
  const reach = (annLive.data && annLive.data.audienceSize) || 0
  const resources = resLive.data || []

  const [draft, setDraft] = useState(EMPTY_DRAFT)
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(null) // id of the row whose Delete is waiting for a second click
  const [vDraft, setVDraft] = useState(EMPTY_VIDEO)

  const lib0 = useMemo(() => readLibrary(), [])
  const [saved, setSaved] = useState({ channel: '', playlists: {} })
  const [lib, setLib] = useState({ channel: '', playlists: {} })
  const [linksReady, setLinksReady] = useState(false)

  // Channel + playlists load from the settings API (not the browser)
  useEffect(() => {
    let live = true
    getWebsiteSettings().then((s) => {
      if (!live) return
      const v = { channel: s.channel || '', playlists: Object.assign({}, s.playlists || {}) }
      setSaved(v)
      setLib(v)
      setLinksReady(true)
    })
    return () => {
      live = false
    }
  }, [])

  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }))
  const setL = (k, v) => setLib((l) => ({ ...l, [k]: v }))
  const vidDirty = lib.channel !== saved.channel || JSON.stringify(lib.playlists) !== JSON.stringify(saved.playlists)
  const channel = lib.channel.trim()
  const channelBad = channel !== '' && !YT_HOSTS.test(channel)
  const playlistsSet = lib0.exams.filter((e) => (lib.playlists[e.id] || '').trim()).length
  const liveCount = anns.filter((a) => annState(a, now).label === 'Live').length
  const pubCount = resources.filter((r) => r.isPublished).length
  const previewId = videoIdOf(vDraft.url)
  /* ---------------- announcements ---------------- */
  async function saveAnnouncement(e) {
    e.preventDefault()
    const body = draft.body.trim()
    if (!body) return toast('Write the announcement first')
    if (body.length > MAX_BODY) return toast('Keep it under ' + MAX_BODY + ' characters')
    setBusy(true)
    try {
      const payload = {
        body,
        audience: draft.audience,
        link: draft.link.trim() || null,
        startsAt: draft.startsAt ? new Date(draft.startsAt).toISOString() : undefined,
        endsAt: draft.endsAt ? new Date(draft.endsAt).toISOString() : undefined,
      }
      if (editing) {
        const a = await updateAnnouncement(editing, payload)
        annLive.setData((cur) => ({
          ...cur,
          announcements: cur.announcements.map((x) => (x.id === a.id ? { ...x, ...a, reads: x.reads } : x)),
        }))
        toast('Announcement saved')
      } else {
        const a = await createAnnouncement(payload)
        annLive.setData((cur) => ({ ...cur, announcements: [{ ...a, reads: 0 }, ...cur.announcements] }))
        toast('Announcement published')
      }
      setDraft(EMPTY_DRAFT)
      setEditing(null)
    } catch (err) {
      toast(err.message)
    } finally {
      setBusy(false)
    }
  }

  function startEdit(a) {
    setEditing(a.id)
    setDraft({ body: a.body, audience: a.audience, link: a.link || '', startsAt: toInput(a.startsAt), endsAt: toInput(a.endsAt) })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function toggleLive(a) {
    try {
      const next = await updateAnnouncement(a.id, { isActive: !a.isActive })
      annLive.setData((cur) => ({
        ...cur,
        announcements: cur.announcements.map((x) => (x.id === a.id ? { ...x, ...next, reads: x.reads } : x)),
      }))
      toast(next.isActive ? 'Announcement is live' : 'Announcement switched off')
    } catch (err) {
      toast(err.message)
    }
  }

  async function removeAnnouncement(a) {
    if (confirm !== a.id) return setConfirm(a.id)
    setConfirm(null)
    try {
      await deleteAnnouncement(a.id)
      annLive.setData((cur) => ({ ...cur, announcements: cur.announcements.filter((x) => x.id !== a.id) }))
      if (editing === a.id) {
        setEditing(null)
        setDraft(EMPTY_DRAFT)
      }
      toast('Announcement deleted')
    } catch (err) {
      toast(err.message)
    }
  }

  /* ---------------- video resources ---------------- */
  async function addResource(e) {
    e.preventDefault()
    const videoId = videoIdOf(vDraft.url)
    if (!videoId) return toast('Paste a YouTube link (https://youtu.be/…)')
    if (!vDraft.title.trim()) return toast('Give the video a title')
    setBusy(true)
    try {
      const r = await createResource({ url: vDraft.url, title: vDraft.title, exam: vDraft.exam || null, topic: vDraft.topic })
      resLive.setData((cur) => [...(cur || []), r])
      setVDraft(EMPTY_VIDEO)
      toast('Video added')
    } catch (err) {
      toast(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function togglePublish(r) {
    try {
      const next = await updateResource(r.id, { isPublished: !r.isPublished })
      resLive.setData((cur) => cur.map((x) => (x.id === r.id ? next : x)))
      toast(next.isPublished ? 'Video published' : 'Video hidden from the site')
    } catch (err) {
      toast(err.message)
    }
  }

  // Reorder, then write the new positions so the order survives a reload
  async function move(i, dir) {
    const j = i + dir
    if (j < 0 || j >= resources.length) return
    const next = resources.slice()
    ;[next[i], next[j]] = [next[j], next[i]]
    resLive.setData(next)
    try {
      await Promise.all(next.map((r, idx) => (r.sortOrder === idx + 1 ? null : updateResource(r.id, { sortOrder: idx + 1 }))))
    } catch (err) {
      toast(err.message)
      resLive.refresh()
    }
  }

  async function removeResource(r) {
    if (confirm !== r.id) return setConfirm(r.id)
    setConfirm(null)
    try {
      await deleteResource(r.id)
      resLive.setData((cur) => cur.filter((x) => x.id !== r.id))
      toast('Video removed')
    } catch (err) {
      toast(err.message)
    }
  }

  /* ---------------- channel + playlists (settings API) ---------------- */
  function saveLibrary() {
    const ch = channel
    if (!ch) return toast('Enter your YouTube channel link')
    if (!YT_HOSTS.test(ch)) return toast("That doesn't look like a YouTube link")
    const playlists = {}
    for (const e of lib0.exams) {
      const u = (lib.playlists[e.id] || '').trim()
      if (u && !YT_HOSTS.test(u)) return toast(e.label + ' playlist must be a YouTube link')
      if (u) playlists[e.id] = u
    }
    updateWebsiteSettings({ channel: ch, playlists })
      .then(() => {
        const next = { channel: ch, playlists }
        setSaved(next)
        setLib(next)
        toast('Video library links saved')
      })
      .catch((err) => toast(err.message || 'Failed to save video links'))
  }

  return (
    <>
      <div className="head sg-head">
        <div>
          <h1>Website info</h1>
          <p>Announcements, videos and links for the website and the student app. Prices and live test dates keep themselves up to date.</p>
        </div>
        <div className="ws-head-actions">
          <LiveStamp at={annLive.at} loading={annLive.loading || resLive.loading} error={annLive.error || resLive.error} onRefresh={() => { annLive.refresh(); resLive.refresh() }} />
          <a className="btn btn-outline" href="/" target="_blank" rel="noreferrer">
            Open the website
          </a>
        </div>
      </div>

      <div className="ws-grid">
        <div className="ws-col">
          {/* ---------------- announcements ---------------- */}
          <section className="card" aria-labelledby="ws-ann-t">
            <div className="card-head">
              <div>
                <h2 id="ws-ann-t">Announcements</h2>
                <p className="meta">One strip at the top of the homepage, one banner in the student dashboard. Schedule them, aim them at the right students, and see how many read each one.</p>
              </div>
              <span className={'pill ' + (liveCount ? 'p-published' : 'p-draft')}>{liveCount ? liveCount + ' live' : 'None live'}</span>
            </div>

            <form className="stack" onSubmit={saveAnnouncement}>
              <div>
                <label className="l" htmlFor="ws-body">
                  {editing ? 'Editing announcement' : 'New announcement'}
                </label>
                <textarea
                  id="ws-body"
                  className="input"
                  rows={2}
                  maxLength={MAX_BODY}
                  value={draft.body}
                  onChange={(e) => set('body', e.target.value)}
                  placeholder="Next NEET live test is on Sunday at 2:00 PM — register free."
                />
                <p className="hint">{MAX_BODY - draft.body.length} characters left</p>
              </div>

              <div className="ws-form">
                <div>
                  <label className="l" htmlFor="ws-aud">
                    Who sees it
                  </label>
                  <select id="ws-aud" className="input" value={draft.audience} onChange={(e) => set('audience', e.target.value)}>
                    {AUDIENCES.map((a) => (
                      <option key={a.value} value={a.value}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="l" htmlFor="ws-link">
                    Link (optional)
                  </label>
                  <input id="ws-link" className="input" type="url" value={draft.link} onChange={(e) => set('link', e.target.value)} placeholder="https://…/register" />
                </div>
                <div>
                  <label className="l" htmlFor="ws-from">
                    From
                  </label>
                  <input id="ws-from" className="input" type="datetime-local" value={draft.startsAt} onChange={(e) => set('startsAt', e.target.value)} />
                </div>
                <div>
                  <label className="l" htmlFor="ws-to">
                    Until (optional)
                  </label>
                  <input id="ws-to" className="input" type="datetime-local" value={draft.endsAt} onChange={(e) => set('endsAt', e.target.value)} />
                </div>
              </div>

              <div className="ws-foot">
                <span className="hint">{editing ? 'Saving edits an existing announcement.' : 'Empty dates mean “right now, until you switch it off”.'}</span>
                <span className="ws-btns">
                  {editing && (
                    <button className="btn btn-outline" type="button" onClick={() => { setEditing(null); setDraft(EMPTY_DRAFT) }}>
                      Cancel
                    </button>
                  )}
                  <button className="btn btn-primary" type="submit" disabled={busy || !draft.body.trim()}>
                    {editing ? 'Save changes' : 'Publish announcement'}
                  </button>
                </span>
              </div>
            </form>

            {annLive.error && !anns.length ? <div className="alert a-err">{annLive.error.message}</div> : null}

            {anns.length ? (
              <ul className="ws-list">
                {anns.map((a) => {
                  const st = annState(a, now)
                  const counted = a.audience === 'all' || a.audience === 'students'
                  return (
                    <li className={'ws-item' + (editing === a.id ? ' is-editing' : '')} key={a.id}>
                      <div className="ws-item-top">
                        <span className={'pill ' + st.cls}>{st.label}</span>
                        <span className="ws-item-aud">{audienceLabel(a.audience)}</span>
                        <span className="meta">{whenLine(a)}</span>
                        <span className="ws-item-reads">
                          {a.reads || 0} read{counted && reach ? ' of ' + reach + ' students' : ''}
                        </span>
                      </div>
                      <p className="ws-item-body">{a.body}</p>
                      {a.link ? (
                        <a className="ws-item-link" href={a.link} target="_blank" rel="noreferrer">
                          {a.link}
                        </a>
                      ) : null}
                      <div className="ws-actions">
                        <button className="btn btn-outline btn-sm" type="button" onClick={() => startEdit(a)}>
                          Edit
                        </button>
                        <button className="btn btn-outline btn-sm" type="button" onClick={() => toggleLive(a)}>
                          {a.isActive ? 'Switch off' : 'Switch on'}
                        </button>
                        <button className="btn btn-danger btn-sm" type="button" onClick={() => removeAnnouncement(a)}>
                          {confirm === a.id ? 'Confirm delete' : 'Delete'}
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : !annLive.error ? (
              <p className="hint ws-empty">No announcements yet. The first one you publish shows on the homepage and on every student's dashboard.</p>
            ) : null}
          </section>

          {/* ---------------- video resources ---------------- */}
          <section className="card" aria-labelledby="ws-res-t">
            <div className="card-head">
              <div>
                <h2 id="ws-res-t">Video resources</h2>
                <p className="meta">The videos in the homepage’s Resources section. Paste a YouTube link, name it, and it appears in the order shown here.</p>
              </div>
              <span className={'pill ' + (pubCount ? 'p-published' : 'p-draft')}>
                {pubCount} of {resources.length} published
              </span>
            </div>

            <form className="stack" onSubmit={addResource}>
              <div className="ws-form ws-form-video">
                <div className="ws-url">
                  <label className="l" htmlFor="ws-url">
                    YouTube link
                  </label>
                  <div className="ws-url-row">
                    {previewId ? <img className="ws-thumb ws-thumb-form" src={'https://i.ytimg.com/vi/' + previewId + '/mqdefault.jpg'} alt="" width="72" height="40" /> : null}
                    <input id="ws-url" className="input" type="url" value={vDraft.url} onChange={(e) => setVDraft((d) => ({ ...d, url: e.target.value }))} placeholder="https://www.youtube.com/watch?v=…" />
                  </div>
                </div>
                <div>
                  <label className="l" htmlFor="ws-title">
                    Title
                  </label>
                  <input id="ws-title" className="input" value={vDraft.title} onChange={(e) => setVDraft((d) => ({ ...d, title: e.target.value }))} placeholder="Rotational Motion in 20 minutes" />
                </div>
                <div>
                  <label className="l" htmlFor="ws-rexam">
                    Exam
                  </label>
                  <select id="ws-rexam" className="input" value={vDraft.exam} onChange={(e) => setVDraft((d) => ({ ...d, exam: e.target.value }))}>
                    <option value="">Everyone</option>
                    <option value="neet">NEET</option>
                    <option value="jee-main">JEE Main</option>
                    <option value="jee-advanced">JEE Advanced</option>
                  </select>
                </div>
                <div>
                  <label className="l" htmlFor="ws-rtopic">
                    Tag (optional)
                  </label>
                  <input id="ws-rtopic" className="input" value={vDraft.topic} onChange={(e) => setVDraft((d) => ({ ...d, topic: e.target.value }))} placeholder="Physics" />
                </div>
              </div>
              <div className="ws-foot">
                <span className="hint">Published videos show on the homepage straight away.</span>
                <button className="btn btn-primary" type="submit" disabled={busy || !vDraft.url.trim() || !vDraft.title.trim()}>
                  Add video
                </button>
              </div>
            </form>

            {resLive.error && !resources.length ? <div className="alert a-err">{resLive.error.message}</div> : null}

            {resources.length ? (
              <ul className="ws-list">
                {resources.map((r, i) => (
                  <li className="ws-item ws-res" key={r.id}>
                    <img className="ws-thumb" src={'https://i.ytimg.com/vi/' + r.videoId + '/mqdefault.jpg'} alt="" width="72" height="40" loading="lazy" />
                    <div className="ws-res-main">
                      <b>{r.title}</b>
                      <span className="meta">
                        {[r.topic, r.exam ? ({ neet: 'NEET', 'jee-main': 'JEE Main', 'jee-advanced': 'JEE Advanced' }[r.exam] || r.exam) : null, r.isPublished ? 'Published' : 'Hidden']
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </div>
                    <div className="ws-actions">
                      <button className="btn btn-outline btn-sm" type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={'Move ' + r.title + ' up'}>
                        ↑
                      </button>
                      <button className="btn btn-outline btn-sm" type="button" onClick={() => move(i, 1)} disabled={i === resources.length - 1} aria-label={'Move ' + r.title + ' down'}>
                        ↓
                      </button>
                      <button className="btn btn-outline btn-sm" type="button" onClick={() => togglePublish(r)}>
                        {r.isPublished ? 'Unpublish' : 'Publish'}
                      </button>
                      <button className="btn btn-danger btn-sm" type="button" onClick={() => removeResource(r)}>
                        {confirm === r.id ? 'Confirm' : 'Delete'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : !resLive.error ? (
              <p className="hint ws-empty">No videos yet. Add the first one above — it will appear in the Resources section of the homepage.</p>
            ) : null}
          </section>
        </div>

        {/* ---------------- read-only column ---------------- */}
        <div className="ws-col">
          <section className="card" aria-labelledby="ws-vid-t">
            <div className="card-head">
              <div>
                <h2 id="ws-vid-t">Video library</h2>
                <p className="meta">Where the “Video library” button sends students — your channel, with a playlist per exam.</p>
              </div>
              <span className={'pill ' + (playlistsSet === lib0.exams.length && lib0.exams.length ? 'p-published' : 'p-draft')}>
                {playlistsSet} of {lib0.exams.length} playlists set
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
                    value={lib.channel}
                    aria-invalid={channelBad ? 'true' : undefined}
                    onChange={(e) => setL('channel', e.target.value)}
                    placeholder="https://www.youtube.com/@yourchannel"
                  />
                  {YT_HOSTS.test(channel) ? (
                    <a className="btn btn-outline btn-sm" href={channel} target="_blank" rel="noreferrer">
                      Open
                    </a>
                  ) : null}
                </div>
                <p className={'hint' + (channelBad ? ' is-bad' : '')}>
                  {channelBad ? 'That is not a YouTube link — use https://youtube.com/… or https://youtu.be/…' : 'Shown in the app and the site footer. Required.'}
                </p>
              </div>

              <div className="ws-rows">
                <span className="ws-sub">Exam playlists (optional)</span>
                {lib0.exams.map((e) => {
                  const val = (lib.playlists[e.id] || '').trim()
                  const bad = val !== '' && !YT_HOSTS.test(val)
                  return (
                    <div className="ws-row" key={e.id}>
                      <label htmlFor={'ws-pl-' + e.id}>{e.label}</label>
                      <input
                        id={'ws-pl-' + e.id}
                        className="input"
                        type="url"
                        inputMode="url"
                        aria-invalid={bad ? 'true' : undefined}
                        value={lib.playlists[e.id] || ''}
                        onChange={(e2) => setL('playlists', { ...lib.playlists, [e.id]: e2.target.value })}
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
              <button className="btn btn-primary" type="button" disabled={!vidDirty || !linksReady} onClick={saveLibrary}>
                Save video links
              </button>
            </div>
          </section>

          <section className="card" aria-labelledby="ws-auto-t">
            <div className="card-head">
              <div>
                <h2 id="ws-auto-t">Shown automatically</h2>
                <p className="meta">Filled in from Tests and pricing — nothing to edit here.</p>
              </div>
            </div>
            <div className="summary-list">
              {lib0.exams.map((e) => (
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
                  {lib0.nextLive
                    ? (lib0.exams.find((e) => e.id === lib0.nextLive.exam) || {}).label + ' · ' + whenText(lib0.nextLive.start)
                    : 'None scheduled'}
                </span>
              </div>
            </div>
            <p className="hint ws-note">Prices and dates are read from the site's test schedule — nothing to edit here.</p>
          </section>
        </div>
      </div>
      {toastNode}
    </>
  )
}
