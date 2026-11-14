import { useState } from 'react'
import { EXAMS } from '../../../data/exams.js'
import { api } from '../../../lib/api.js'
import { getToken, saveSession } from '../../../lib/session.js'
import PageHeader from '../sections/PageHeader.jsx'
import { BatchCard, FreePlanCard } from '../sections/SideCards.jsx'

const GRADES = ['Class 11', 'Class 12', 'Dropper / repeater']
const THIS_YEAR = new Date().getFullYear()
const YEARS = [0, 1, 2, 3].map((i) => THIS_YEAR + i)
const family = (exam) => (exam === 'neet' ? 'neet' : 'jee')

/* "/student/account" — My profile: the student's details (editable), password and plan, and log out. */
export default function AccountPage({ me, user, data, onLogout, loggingOut }) {
  const [saved, setSaved] = useState(null) // the user as the server returned it after saving
  const [editing, setEditing] = useState(false)
  const [notice, setNotice] = useState('')
  const u = saved || user || {}
  const place = [u.city, u.state].filter(Boolean).join(', ')
  const details = [
    ['Email', u.email],
    ['Mobile', u.phone ? '+91 ' + u.phone : ''],
    ['Exam', EXAMS[u.exam] ? EXAMS[u.exam].label : me.examName],
    ['Class', u.grade],
    ['Target year', u.targetYear],
    ['City', place],
  ]

  return (
    <>
      <PageHeader
        title="My profile"
        desc="Your details, password and plan."
        actions={
          <button className="btn btn-outline btn-danger" type="button" disabled={loggingOut} onClick={onLogout}>
            {loggingOut ? 'Logging out…' : 'Log out'}
          </button>
        }
      />

      <div className="account-grid">
        <div className="pf-col">
          <section className="card profile-card" aria-labelledby="profile-title">
            <div className="profile-top">
              <span className="avatar avatar-lg" aria-hidden="true">
                {(u.name || me.first).charAt(0)}
              </span>
              <div className="pf-grow">
                <h2 id="profile-title">{u.name || me.name}</h2>
                <p className="meta">{[me.examText, me.batch || 'Free access'].filter(Boolean).join(' · ')}</p>
              </div>
              {!editing && (
                <button
                  className="btn btn-outline btn-sm"
                  type="button"
                  onClick={() => {
                    setEditing(true)
                    setNotice('')
                  }}
                >
                  Edit profile
                </button>
              )}
            </div>
            {editing ? (
              <ProfileForm
                u={u}
                onCancel={() => setEditing(false)}
                onSaved={(next) => {
                  saveSession({ token: getToken(), user: next })
                  setSaved(next)
                  setEditing(false)
                  setNotice('Profile saved.')
                }}
              />
            ) : (
              <>
                <dl className="details">
                  {details.map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd className={v ? undefined : 'muted'}>{v || 'Not given'}</dd>
                    </div>
                  ))}
                </dl>
                <p className="hint" role="status">
                  {notice || 'Keep your details up to date.'}
                </p>
              </>
            )}
          </section>
          <PasswordCard />
        </div>

        {me.subscription ? <BatchCard me={me} full /> : <FreePlanCard free={data.free} />}
      </div>
    </>
  )
}

/* The editable details. With an active batch, exam and class stay with the batch. */
function ProfileForm({ u, onCancel, onSaved }) {
  const batch = u.subscription && u.subscription.status === 'active' ? u.subscription.batch : null
  // With a batch, start from what the batch allows, so saving never trips over a locked field
  const examOk = !batch || (u.exam && family(u.exam) === batch.exam)
  const [f, setF] = useState({
    name: u.name || '',
    phone: u.phone || '',
    exam: examOk ? u.exam || '' : batch.exam === 'neet' ? 'neet' : 'jee-main',
    grade: batch ? batch.grade : u.grade || '',
    targetYear: YEARS.includes(u.targetYear) ? String(u.targetYear) : '',
    state: u.state || '',
    city: u.city || '',
  })
  const [err, setErr] = useState(null)
  const [saving, setSaving] = useState(false)
  const exams = Object.entries(EXAMS).filter(([k]) => !batch || family(k) === batch.exam)
  const set = (k) => (e) => {
    setF((x) => ({ ...x, [k]: e.target.value }))
    if (err && err.field === k) setErr(null)
  }
  const field = (k, label, control) => (
    <div className="pf-field">
      <label htmlFor={'pf-' + k}>{label}</label>
      {control}
      {err && err.field === k ? <p className="pf-err">{err.message}</p> : null}
    </div>
  )
  const bind = (k) => ({ id: 'pf-' + k, className: 'input', value: f[k], onChange: set(k), 'aria-invalid': err && err.field === k ? 'true' : undefined })

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    try {
      const r = await api('/auth/me', { method: 'PUT', token: getToken(), body: { ...f, name: f.name.trim(), targetYear: Number(f.targetYear) } })
      onSaved(r.user)
    } catch (e2) {
      setErr({ field: e2.field, message: e2.message })
      setSaving(false)
    }
  }

  return (
    <form className="pf-form" onSubmit={save} noValidate>
      {field('name', 'Full name', <input {...bind('name')} maxLength={80} autoComplete="name" />)}
      {field('phone', 'Mobile', <input {...bind('phone')} inputMode="numeric" maxLength={10} autoComplete="tel-national" placeholder="10 digits" />)}
      {field(
        'exam',
        'Exam',
        <select {...bind('exam')}>
          {f.exam ? null : <option value="">Choose…</option>}
          {exams.map(([k, ex]) => (
            <option key={k} value={k}>
              {ex.label}
            </option>
          ))}
        </select>,
      )}
      {field(
        'grade',
        'Class',
        <select {...bind('grade')} disabled={!!batch}>
          {f.grade ? null : <option value="">Choose…</option>}
          {GRADES.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>,
      )}
      {field(
        'targetYear',
        'Exam year',
        <select {...bind('targetYear')}>
          {f.targetYear ? null : <option value="">Choose…</option>}
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>,
      )}
      {field('state', 'State', <input {...bind('state')} maxLength={80} autoComplete="address-level1" />)}
      {field('city', 'City', <input {...bind('city')} maxLength={80} autoComplete="address-level2" />)}
      <p className="hint pf-full">
        {batch ? `Your class and exam are set by your ${batch.name} batch. Contact us to change them. ` : ''}Your email ({u.email}) is how you log in, so it can&apos;t be changed here.
      </p>
      {err && !['name', 'phone', 'exam', 'grade', 'targetYear', 'state', 'city'].includes(err.field) ? <p className="pf-err pf-full">{err.message}</p> : null}
      <div className="pf-actions pf-full">
        <button className="btn btn-outline" type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}

/* Change password: the current one, then the new one. */
function PasswordCard() {
  const [cur, setCur] = useState('')
  const [next, setNext] = useState('')
  const [err, setErr] = useState(null)
  const [done, setDone] = useState(false)
  const [saving, setSaving] = useState(false)

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    setDone(false)
    try {
      await api('/auth/password', { method: 'PUT', token: getToken(), body: { currentPassword: cur, newPassword: next } })
      setCur('')
      setNext('')
      setDone(true)
    } catch (e2) {
      setErr({ field: e2.field, message: e2.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="card profile-card" aria-labelledby="pw-title">
      <h2 id="pw-title" className="pf-title">
        Change password
      </h2>
      <form className="pf-form" onSubmit={save} noValidate>
        <div className="pf-field">
          <label htmlFor="pw-cur">Current password</label>
          <input id="pw-cur" className="input" type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} aria-invalid={err && err.field === 'currentPassword' ? 'true' : undefined} />
          {err && err.field === 'currentPassword' ? <p className="pf-err">{err.message}</p> : null}
        </div>
        <div className="pf-field">
          <label htmlFor="pw-new">New password</label>
          <input id="pw-new" className="input" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} aria-invalid={err && err.field === 'newPassword' ? 'true' : undefined} />
          {err && err.field === 'newPassword' ? <p className="pf-err">{err.message}</p> : <p className="hint">At least 8 characters.</p>}
        </div>
        {err && !['currentPassword', 'newPassword'].includes(err.field) ? <p className="pf-err pf-full">{err.message}</p> : null}
        <div className="pf-actions pf-full">
          <span className="hint" role="status">
            {done ? 'Password changed.' : ''}
          </span>
          <button className="btn btn-primary" type="submit" disabled={saving || !cur || !next}>
            {saving ? 'Changing…' : 'Change password'}
          </button>
        </div>
      </form>
    </section>
  )
}
