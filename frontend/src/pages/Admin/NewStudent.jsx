import { useEffect, useState } from 'react'
import Dropdown from './Dropdown.jsx'
import { EXAM, createStudent, listBatches } from './studentsApi.js'

/*
  Admin › Students › "Add student": an account the admin makes (say, for a
  student who paid at the centre). They log in with this email and password;
  ticking the box also gives them their batch free. After saving, the login
  details stay on screen to share.
*/
const EXAMS = Object.entries(EXAM).map(([value, label]) => ({ value, label }))
const GRADES = [
  { value: 'Class 11', label: '11th' },
  { value: 'Class 12', label: '12th' },
  { value: 'Dropper / repeater', label: 'Dropper' },
]
const THIS_YEAR = new Date().getFullYear()
const YEARS = [{ value: '', label: 'Not known' }, ...[0, 1, 2, 3].map((i) => ({ value: String(THIS_YEAR + i), label: String(THIS_YEAR + i) }))]
const family = (exam) => (exam === 'neet' ? 'neet' : 'jee')

// 9 easy-to-read characters, e.g. "Tv-k3m9pxq"
function newPassword() {
  const abc = 'abcdefghjkmnpqrstuvwxyz23456789'
  return 'Tv-' + Array.from(crypto.getRandomValues(new Uint8Array(7)), (b) => abc[b % abc.length]).join('')
}

const EMPTY = { name: '', email: '', phone: '', exam: 'neet', grade: 'Class 12', targetYear: '', state: '', city: '' }

export default function NewStudent({ onCancel, onAdded, onOpen }) {
  const [form, setForm] = useState(EMPTY)
  const [password, setPassword] = useState(newPassword)
  const [giveBatch, setGiveBatch] = useState(true)
  const [batches, setBatches] = useState([])
  const [err, setErr] = useState(null)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(null) // { student, password }
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    listBatches().then(setBatches, () => {})
  }, [])

  const batch = batches.find((b) => b.exam === family(form.exam) && b.grade === form.grade)
  const set = (k) => (v) => {
    setForm((f) => ({ ...f, [k]: v }))
    if (err && err.field === k) setErr(null)
  }
  const bad = (k) => (err && err.field === k ? 'true' : undefined)
  const errFor = (k) => err && err.field === k && <p className="ts-field-err">{err.message}</p>

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    try {
      const r = await createStudent({ ...form, password, giveBatch: giveBatch && !!batch })
      setDone({ student: r.student, password, batch: giveBatch && batch ? batch.name : null })
      onAdded(r.student)
    } catch (e2) {
      setErr({ field: e2.field, message: e2.message })
    } finally {
      setSaving(false)
    }
  }

  if (done) {
    const login = `Testverse login\nEmail: ${done.student.email}\nPassword: ${done.password}`
    return (
      <div className="card sg-new" role="status" aria-labelledby="ns-done-h">
        <div className="card-head">
          <h2 id="ns-done-h">{done.student.name} is added</h2>
        </div>
        <p className="hint">
          {done.batch ? `The ${done.batch} batch is active, free. ` : ''}Share these login details with them. They can change the password from My profile.
        </p>
        <pre className="ns-login">{login}</pre>
        <div className="sg-form-foot">
          <span className="hint">{copied ? 'Copied.' : ''}</span>
          <div className="actions">
            <button
              className="btn btn-outline"
              type="button"
              onClick={() =>
                navigator.clipboard.writeText(login).then(
                  () => setCopied(true),
                  () => {},
                )
              }
            >
              Copy login details
            </button>
            <button
              className="btn btn-outline"
              type="button"
              onClick={() => {
                setDone(null)
                setCopied(false)
                setForm(EMPTY)
                setPassword(newPassword())
              }}
            >
              Add another
            </button>
            <button className="btn btn-primary" type="button" onClick={() => onOpen(done.student.id)}>
              Open student
            </button>
          </div>
        </div>
      </div>
    )
  }

  const input = (k, label, props = {}) => (
    <div>
      <label className="l" htmlFor={'ns-' + k}>
        {label}
        {props.optional ? <span className="ts-opt"> optional</span> : null}
      </label>
      <input className="input" id={'ns-' + k} value={form[k]} aria-invalid={bad(k)} onChange={(e) => set(k)(e.target.value)} {...props.attrs} />
      {errFor(k)}
    </div>
  )
  const pick = (k, label, options) => (
    <div>
      <span className="l ts-l">{label}</span>
      <Dropdown id={'ns-' + k} label={label} value={form[k]} options={options} onChange={set(k)} />
      {errFor(k)}
    </div>
  )

  return (
    <form className="card sg-new" onSubmit={save} aria-labelledby="ns-h">
      <div className="card-head">
        <h2 id="ns-h">Add a student</h2>
      </div>
      <div className="form">
        {input('name', 'Full name', { attrs: { maxLength: 80, autoFocus: true } })}
        {input('email', 'Email', { attrs: { type: 'email', maxLength: 120, autoComplete: 'off' } })}
        {input('phone', 'Mobile', { attrs: { inputMode: 'numeric', maxLength: 10, placeholder: '10 digits' } })}
        <div>
          <label className="l" htmlFor="ns-password">
            Password
          </label>
          <div className="ns-pass">
            <input
              className="input"
              id="ns-password"
              value={password}
              aria-invalid={bad('password')}
              onChange={(e) => {
                setPassword(e.target.value)
                if (err && err.field === 'password') setErr(null)
              }}
            />
            <button className="btn btn-outline btn-sm" type="button" onClick={() => setPassword(newPassword())}>
              New
            </button>
          </div>
          {errFor('password')}
        </div>
        {pick('exam', 'Exam', EXAMS)}
        {pick('grade', 'Class', GRADES)}
        {pick('targetYear', 'Exam year', YEARS)}
        {input('state', 'State', { optional: true, attrs: { maxLength: 80 } })}
        {input('city', 'City', { optional: true, attrs: { maxLength: 80 } })}
        <div className="full">
          <label className="check">
            <input type="checkbox" checked={giveBatch && !!batch} disabled={!batch} onChange={(e) => setGiveBatch(e.target.checked)} />
            {batch ? `Give the ${batch.name} batch free (no payment)` : 'Give their batch free (no payment)'}
          </label>
          <p className="hint ts-check-hint">Unlocks the tests for their exam and class straight away. You can also give test series from their page.</p>
          {errFor('giveBatch')}
        </div>
      </div>
      {err && !['name', 'email', 'phone', 'password', 'exam', 'grade', 'targetYear', 'state', 'city', 'giveBatch'].includes(err.field) && (
        <div className="alert a-err" role="alert">
          <span>{err.message}</span>
        </div>
      )}
      <div className="sg-form-foot">
        <span className="hint">They can log in straight away. No email is sent; share the details yourself.</span>
        <div className="actions">
          <button className="btn btn-outline" type="button" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button className="btn btn-primary" type="submit" disabled={saving || !form.name.trim() || !form.email.trim()}>
            {saving ? 'Adding…' : 'Add student'}
          </button>
        </div>
      </div>
    </form>
  )
}
