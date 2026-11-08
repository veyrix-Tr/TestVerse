import { EXAMS } from '../../../data/exams.js'

/* Segmented control shared by the hero and the test plan. */
export default function ExamSwitch({ exam, onChoose, labelledBy, label, tone = 'light' }) {
  return (
    <div className={'exam-switch exam-switch-' + tone} role="group" aria-labelledby={labelledBy} aria-label={labelledBy ? undefined : label} data-switch>
      {Object.keys(EXAMS).map((id) => (
        <button key={id} type="button" data-exam={id} aria-pressed={exam === id ? 'true' : 'false'} onClick={() => onChoose(id, true)}>
          {EXAMS[id].label}
        </button>
      ))}
    </div>
  )
}
