import { useEffect, useRef, useState } from 'react'
import { EXAM, SETTINGS } from '../../../data/studentDemo.js'

/*
  design/student-home.html <dialog id="dlg-video"> — photo of a question +
  subject/chapter/note, 10 MB check, real FileReader preview.
*/
export default function VideoDialog({ open, onClose, me, onSend }) {
  const ref = useRef(null)
  const limit = me.course ? SETTINGS.videoLimit.course : SETTINGS.videoLimit.direct
  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState(null)
  const [subject, setSubject] = useState(EXAM.subjects[0])
  const [chapter, setChapter] = useState('')
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    if (open) {
      setPhoto(null)
      setPreview(null)
      setChapter('')
      setNote('')
      setErr('')
    }
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  function onPhoto(e) {
    const f = e.target.files[0]
    if (!f) return
    if (!/^image\//.test(f.type)) {
      setErr('Please choose a photo.')
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      setErr('That photo is over 10 MB. Try a smaller one.')
      return
    }
    setPhoto(f)
    setErr('')
    const r = new FileReader()
    r.onload = () => setPreview(r.result)
    r.readAsDataURL(f)
  }

  function send() {
    if (!photo) {
      setErr('Add a photo of the question.')
      return
    }
    onSend({ subject, chapter, note })
  }

  return (
    <dialog id="dlg-video" ref={ref} aria-labelledby="dv-title" onCancel={onClose}>
      <div className="dh">
        <h2 id="dv-title">Request a video solution</h2>
        <button className="close" type="button" data-close aria-label="Close" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="db">
        <div className="drop">
          <label className="l" htmlFor="v-photo" style={{ margin: 0 }}>
            Photo of the question
          </label>
          <input type="file" id="v-photo" accept="image/*" capture="environment" onChange={onPhoto} />
          <img id="v-preview" src={preview || undefined} alt="Your question photo" hidden={!preview} />
          <span className="hint">Make sure the whole question, options and any diagram are clear.</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label className="l" htmlFor="v-subject">
              Subject
            </label>
            <select className="input" id="v-subject" value={subject} onChange={(e) => setSubject(e.target.value)}>
              {EXAM.subjects.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="l" htmlFor="v-chapter">
              Chapter (optional)
            </label>
            <input className="input" id="v-chapter" placeholder="e.g. Rotational Motion" value={chapter} onChange={(e) => setChapter(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="l" htmlFor="v-note">
            What's confusing you? (optional)
          </label>
          <textarea className="input" id="v-note" placeholder="e.g. I don't understand why friction acts upward" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="limit" id="v-limit">
          You can send {Math.max(0, limit - me.videosUsed)} more this week. We reply within {SETTINGS.videoHours} hours, in the app and on WhatsApp.
        </div>
        <div className="err" id="v-err" hidden={!err}>
          {err}
        </div>
      </div>
      <div className="df">
        <button className="btn btn-outline" type="button" data-close onClick={onClose}>
          Cancel
        </button>
        <button className="btn btn-primary" type="button" id="v-send" onClick={send}>
          Send request
        </button>
      </div>
    </dialog>
  )
}
