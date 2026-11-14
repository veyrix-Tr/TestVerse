import { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import { getToken } from '../../lib/session.js'
import { useToast } from '../../lib/useToast.jsx'
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
    Video resources-> the homepage "Resources" section and the student's
                      Resources page — a YouTube video or a whole playlist
                      (backend: /api/admin/resources, /api/resources)
  Right column: the result-analysis settings (/api/admin/website).
*/
const MAX_BODY = 300
const PLAYLIST_RE = /[?&]list=[\w-]{12,}/

const EMPTY_DRAFT = { body: '', audience: 'all', link: '', startsAt: '', endsAt: '' }
const EMPTY_VIDEO = { url: '', title: '', exam: '', topic: '', kind: 'video' }

/* ---------------- result analysis settings (/api/admin/website) ---------------- */
// Only these three fields are sent, so saving never touches the other settings.
const getSiteSettings = () => api('/admin/website', { token: getToken() })
const saveSiteSettings = (body) => api('/admin/website', { method: 'PUT', body, token: getToken() })
const ANALYSIS_DEFAULTS = { guessSeconds: 30, slowSeconds: 180, reportNotice: true }
// 150 -> "2.5"
const toMinutes = (sec) => String(Math.round((sec / 60) * 100) / 100)

function ResultAnalysisCard({ toast }) {
  const [form, setForm] = useState(null) // { guess, slowMin, notice } as typed
  const [saved, setSaved] = useState(null) // last values from the server
  const [loadErr, setLoadErr] = useState(null)
  const [err, setErr] = useState(null) // { field, message }
  const [busy, setBusy] = useState(false)

  function fill(s) {
    const v = { ...ANALYSIS_DEFAULTS, ...Object.fromEntries(Object.entries(s || {}).filter(([, x]) => x != null)) }
    const next = { guess: String(v.guessSeconds), slowMin: toMinutes(v.slowSeconds), notice: !!v.reportNotice }
    setForm(next)
    setSaved(next)
  }

  function load() {
    setLoadErr(null)
    getSiteSettings()
      .then(fill)
      .catch((e) => setLoadErr(e.message))
  }
  useEffect(load, [])

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }))
    setErr(null)
  }
  const changed = form && saved && (form.guess !== saved.guess || form.slowMin !== saved.slowMin || form.notice !== saved.notice)

  async function save(e) {
    e.preventDefault()
    const guessSeconds = Number(form.guess)
    const slowSeconds = Math.round(Number(form.slowMin) * 60)
    if (!form.guess.trim() || !Number.isInteger(guessSeconds) || guessSeconds < 5 || guessSeconds > 300)
      return setErr({ field: 'guessSeconds', message: 'Enter whole seconds from 5 to 300.' })
    if (!form.slowMin.trim() || !Number.isFinite(slowSeconds) || slowSeconds < 30 || slowSeconds > 1800)
      return setErr({ field: 'slowSeconds', message: 'Enter minutes from 0.5 to 30.' })
    if (slowSeconds <= guessSeconds) return setErr({ field: 'slowSeconds', message: 'The time sink limit must be longer than the guess limit.' })
    setBusy(true)
    try {
      const s = await saveSiteSettings({ guessSeconds, slowSeconds, reportNotice: form.notice })
      fill(s)
      toast('Result analysis settings saved')
    } catch (e2) {
      const field = e2.field
      if (field === 'guessSeconds' || field === 'slowSeconds') setErr({ field, message: e2.message })
      else toast(e2.message)
    } finally {
      setBusy(false)
    }
  }

  const fieldErr = (f) => (err && err.field === f ? <p className="hint ws-err" role="alert">{err.message}</p> : null)

  return (
    <section className="card" aria-labelledby="ws-ra-t">
      <div className="card-head">
        <div>
          <h2 id="ws-ra-t">Result analysis</h2>
          <p className="meta">How the result page reads a student’s timing, and what they’re told after submitting.</p>
        </div>
      </div>

      {loadErr ? (
        <div className="alert a-err">
          {loadErr}{' '}
          <button className="btn btn-outline btn-sm" type="button" onClick={load}>
            Try again
          </button>
        </div>
      ) : !form ? (
        <p className="hint">Loading…</p>
      ) : (
        <form className="stack" onSubmit={save} noValidate>
          <div className="ws-form">
            <div>
              <label className="l" htmlFor="ws-guess">
                Likely guess under (seconds)
              </label>
              <input
                id="ws-guess"
                className="input"
                type="number"
                inputMode="numeric"
                min="5"
                max="300"
                step="1"
                value={form.guess}
                aria-invalid={err && err.field === 'guessSeconds' ? true : undefined}
                onChange={(e) => set('guess', e.target.value)}
              />
              {fieldErr('guessSeconds') || <p className="hint">A wrong answer faster than this counts as a likely guess on the result page.</p>}
            </div>
            <div>
              <label className="l" htmlFor="ws-slow">
                Time sink over (minutes)
              </label>
              <input
                id="ws-slow"
                className="input"
                type="number"
                inputMode="decimal"
                min="0.5"
                max="30"
                step="0.5"
                value={form.slowMin}
                aria-invalid={err && err.field === 'slowSeconds' ? true : undefined}
                onChange={(e) => set('slowMin', e.target.value)}
              />
              {fieldErr('slowSeconds') || <p className="hint">A wrong answer slower than this counts as a time sink.</p>}
            </div>
          </div>
          <div>
            <label className="check">
              <input type="checkbox" checked={form.notice} onChange={(e) => set('notice', e.target.checked)} />
              Tell students their solutions and analysis will come by email
            </label>
            <p className="hint ws-check-hint">Shown in the pop-up after they submit.</p>
          </div>
          <div className="ws-foot">
            <span className="hint">Applies to every result, including past attempts.</span>
            <button className="btn btn-primary" type="submit" disabled={busy || !changed}>
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
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

  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }))
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
        // Refresh to ensure UI is in sync with server
        await annLive.refresh()
        toast('Announcement saved')
      } else {
        const a = await createAnnouncement(payload)
        annLive.setData((cur) => ({ ...cur, announcements: [{ ...a, reads: 0 }, ...cur.announcements] }))
        // Refresh to ensure UI is in sync with server
        await annLive.refresh()
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
    // Optimistic: drop the row right away (the API can take a second against
    // the remote DB) and put it back only if the delete actually fails.
    const snapshot = annLive.data
    annLive.setData((cur) => ({ ...cur, announcements: cur.announcements.filter((x) => x.id !== a.id) }))
    if (editing === a.id) {
      setEditing(null)
      setDraft(EMPTY_DRAFT)
    }
    try {
      await deleteAnnouncement(a.id)
      // Refresh to ensure UI is in sync with server and prevent race conditions with auto-refresh
      await annLive.refresh()
      toast('Announcement deleted')
    } catch (err) {
      annLive.setData(() => snapshot)
      toast(err.message)
    }
  }

  /* ---------------- video resources ---------------- */
  async function addResource(e) {
    e.preventDefault()
    const kind = vDraft.kind === 'playlist' ? 'playlist' : 'video'
    const ok = kind === 'playlist' ? PLAYLIST_RE.test(vDraft.url) : !!videoIdOf(vDraft.url)
    if (!ok) return toast(kind === 'playlist' ? 'Paste a YouTube playlist link (https://www.youtube.com/playlist?list=…)' : 'Paste a YouTube link (https://youtu.be/…)')
    if (!vDraft.title.trim()) return toast('Give it a title')
    setBusy(true)
    try {
      const r = await createResource({ url: vDraft.url, title: vDraft.title, exam: vDraft.exam || null, topic: vDraft.topic, kind })
      resLive.setData((cur) => [...(cur || []), r])
      setVDraft(EMPTY_VIDEO)
      toast(kind === 'playlist' ? 'Playlist added' : 'Video added')
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

  return (
    <>
      <div className="head sg-head">
        <div>
          <h1>Website info</h1>
          <p>Announcements and videos for the website and the student app, and how results are read.</p>
        </div>
        <div className="ws-head-actions">
          <LiveStamp at={annLive.at} loading={annLive.loading || resLive.loading} error={annLive.error || resLive.error} onRefresh={() => { annLive.refresh(); resLive.refresh() }} />
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
                <p className="meta">Videos and playlists for the homepage and the students’ Resources page. “Everyone” shows on both; an exam shows only to logged-in students preparing for it.</p>
              </div>
              <span className={'pill ' + (pubCount ? 'p-published' : 'p-draft')}>
                {pubCount} of {resources.length} published
              </span>
            </div>

            <form className="stack" onSubmit={addResource}>
              <div className="ws-rows">
                <span className="ws-sub">Add</span>
                <div className="seg" role="group" aria-label="Resource type">
                  <button type="button" aria-pressed={vDraft.kind !== 'playlist'} onClick={() => setVDraft((d) => ({ ...d, kind: 'video' }))}>
                    Video
                  </button>
                  <button type="button" aria-pressed={vDraft.kind === 'playlist'} onClick={() => setVDraft((d) => ({ ...d, kind: 'playlist' }))}>
                    Playlist
                  </button>
                </div>
              </div>

              <div className="ws-form ws-form-video">
                <div className="ws-url">
                  <label className="l" htmlFor="ws-url">
                    {vDraft.kind === 'playlist' ? 'Playlist link' : 'YouTube link'}
                  </label>
                  <div className="ws-url-row">
                    {vDraft.kind === 'playlist' ? (
                      <span className="ws-thumb ws-thumb-form ws-thumb-pl" aria-hidden="true">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                          <path d="M4 6h11v2H4zM4 11h11v2H4zM4 16h7v2H4zM17 10.5v7.2a1.6 1.6 0 1 0 1.4 1.6V11l4 1.1v5.8a1.6 1.6 0 1 0 1.4 1.6V9.2z" />
                        </svg>
                      </span>
                    ) : previewId ? (
                      <img className="ws-thumb ws-thumb-form" src={'https://i.ytimg.com/vi/' + previewId + '/mqdefault.jpg'} alt="" width="72" height="40" />
                    ) : null}
                    <input
                      id="ws-url"
                      className="input"
                      type="url"
                      value={vDraft.url}
                      onChange={(e) => setVDraft((d) => ({ ...d, url: e.target.value }))}
                      placeholder={vDraft.kind === 'playlist' ? 'https://www.youtube.com/playlist?list=…' : 'https://www.youtube.com/watch?v=…'}
                    />
                  </div>
                </div>
                <div>
                  <label className="l" htmlFor="ws-title">
                    Title
                  </label>
                  <input id="ws-title" className="input" value={vDraft.title} onChange={(e) => setVDraft((d) => ({ ...d, title: e.target.value }))} placeholder={vDraft.kind === 'playlist' ? 'NEET 2026 full syllabus playlist' : 'Rotational Motion in 20 minutes'} />
                </div>
                <div>
                  <label className="l" htmlFor="ws-rexam">
                    Who sees it
                  </label>
                  <select id="ws-rexam" className="input" value={vDraft.exam} onChange={(e) => setVDraft((d) => ({ ...d, exam: e.target.value }))}>
                    <option value="">Everyone (homepage + all students)</option>
                    <option value="neet">NEET students only</option>
                    <option value="jee-main">JEE Main students only</option>
                    <option value="jee-advanced">JEE Advanced students only</option>
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
                <span className="hint">Published items show straight away — playlists open as a card in Resources.</span>
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={busy || !vDraft.url.trim() || !vDraft.title.trim()}
                >
                  {vDraft.kind === 'playlist' ? 'Add playlist' : 'Add video'}
                </button>
              </div>
            </form>

            {resLive.error && !resources.length ? <div className="alert a-err">{resLive.error.message}</div> : null}

            {resources.length ? (
              <ul className="ws-list">
                {resources.map((r, i) => (
                  <li className="ws-item ws-res" key={r.id}>
                    {r.kind === 'playlist' ? (
                      <span className="ws-thumb ws-thumb-pl" aria-hidden="true">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                          <path d="M4 6h11v2H4zM4 11h11v2H4zM4 16h7v2H4zM17 10.5v7.2a1.6 1.6 0 1 0 1.4 1.6V11l4 1.1v5.8a1.6 1.6 0 1 0 1.4 1.6V9.2z" />
                        </svg>
                      </span>
                    ) : (
                      <img className="ws-thumb" src={'https://i.ytimg.com/vi/' + r.videoId + '/mqdefault.jpg'} alt="" width="72" height="40" loading="lazy" />
                    )}
                    <div className="ws-res-main">
                      <b>{r.title}</b>
                      <span className="meta">
                        {[
                          r.kind === 'playlist' ? 'Playlist' : 'Video',
                          r.topic,
                          r.exam ? ({ neet: 'NEET', 'jee-main': 'JEE Main', 'jee-advanced': 'JEE Advanced' }[r.exam] || r.exam) + ' students' : 'Everyone',
                          r.isPublished ? 'Published' : 'Hidden',
                        ]
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
              <p className="hint ws-empty">No videos or playlists yet. Add the first one above — it appears on the homepage and in students’ Resources page.</p>
            ) : null}
          </section>
        </div>

        {/* ---------------- settings column ---------------- */}
        <div className="ws-col">
          <ResultAnalysisCard toast={toast} />
        </div>
      </div>
      {toastNode}
    </>
  )
}
