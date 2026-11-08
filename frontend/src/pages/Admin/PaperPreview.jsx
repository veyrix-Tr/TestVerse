import { useState } from 'react'
import MathText from '../../lib/MathText.jsx'
import { esc } from '../../lib/esc.js'
import { signed, typeLabel } from './testsApi.js'

/*
  Read-only preview of a normalized paper (the `paper` returned by
  POST /admin/tests/validate): sections, questions, options lettered A, B, C…
  with the correct ones highlighted, numeric answers, solutions and videos.
*/
const FIRST = 10
const letter = (i) => String.fromCharCode(65 + i)

/* {en, hi?} | "…" -> {en, hi?} */
const txt = (t) => (t == null ? { en: '' } : typeof t === 'string' ? { en: t } : t)

function Bi({ value, className, as = 'div' }) {
  const t = txt(value)
  return (
    <>
      <MathText as={as} className={className} html={esc(t.en)} />
      {t.hi ? <MathText as={as} className={(className ? className + ' ' : '') + 'ts-hi'} html={esc(t.hi)} /> : null}
    </>
  )
}

export default function PaperPreview({ paper }) {
  const offsets = paper.sections.reduce((acc, s, i) => [...acc, i ? acc[i - 1] + paper.sections[i - 1].questions.length : 0], [])
  return (
    <div className="ts-preview">
      {paper.sections.map((s, i) => (
        <Section key={s.name} section={s} offset={offsets[i]} />
      ))}
    </div>
  )
}

function Section({ section, offset }) {
  const [all, setAll] = useState(false)
  const qs = section.questions
  const shown = all ? qs : qs.slice(0, FIRST)
  const marks = qs.reduce((n, q) => n + (Number(q.marks && q.marks.correct) || 0), 0)
  return (
    <details className="card ts-psec" open>
      <summary>
        <span className="ts-psec-name">{section.name}</span>
        <span className="hint">
          {qs.length} question{qs.length === 1 ? '' : 's'} · {marks} marks
        </span>
      </summary>
      <ol className="ts-qs">
        {shown.map((q, i) => (
          <Question key={q.id || i} q={q} n={offset + i + 1} />
        ))}
      </ol>
      {qs.length > FIRST && (
        <div className="ts-more">
          <button className="btn btn-outline btn-sm" type="button" onClick={() => setAll((v) => !v)}>
            {all ? 'Show first ' + FIRST : 'Show all ' + qs.length + ' questions'}
          </button>
        </div>
      )}
    </details>
  )
}

function Question({ q, n }) {
  const correct = new Set(q.type === 'single' ? [q.answer] : q.type === 'multiple' ? q.answer || [] : [])
  const m = q.marks || {}
  return (
    <li className="ts-q">
      <div className="ts-q-meta">
        <span className="ts-q-n">Q{n}</span>
        <span className="ts-tag">{typeLabel(q.type)}</span>
        <span className="ts-q-marks">
          {signed(m.correct)} / {signed(m.wrong)}
          {q.type === 'multiple' && m.partial ? ', partial' : ''}
        </span>
        {q.chapter && <span className="ts-q-ch">{q.chapter}</span>}
      </div>
      <Bi value={q.text} className="ts-q-text" />
      {q.options && q.options.length > 0 && (
        <ul className="ts-opts">
          {q.options.map((o, i) => {
            const ok = correct.has(i)
            return (
              <li key={i} className={ok ? 'ok' : undefined}>
                <span className="ts-opt-l">{letter(i)}</span>
                <div className="ts-opt-t">
                  <Bi value={o} />
                </div>
                {ok && <span className="ts-opt-ok">Correct</span>}
              </li>
            )
          })}
        </ul>
      )}
      {(q.type === 'integer' || q.type === 'numerical') && (
        <p className="ts-ans">
          <span>Answer</span>
          <b>
            {q.answer}
            {q.type === 'numerical' && q.tolerance ? ` ± ${q.tolerance}` : ''}
          </b>
        </p>
      )}
      {(q.solution || q.video) && (
        <div className="ts-sol">
          {q.solution && (
            <>
              <span className="ts-sol-l">Solution</span>
              <Bi value={q.solution} />
            </>
          )}
          {q.video && (
            <a href={q.video} target="_blank" rel="noreferrer">
              Video solution
            </a>
          )}
        </div>
      )}
    </li>
  )
}
