const POINTS = [
  ['A plan, not a pile of tests', "11 tests in a set order: part tests as you finish chapters, half-syllabus tests to join them up, then two full papers to rehearse the real exam. You always know which test comes next."],
  ['Papers set by real faculty', 'Every paper is set and checked by Studyverse faculty [with X+ years of NEET and JEE teaching], matched to the current exam pattern and level.'],
  ['Analysis that tells you what to fix', 'Not just a score. Chapter-wise accuracy, time per question, marks lost to guessing, and a full solution for every question.'],
  ['A teacher when you need one', 'If your scores stop improving, a Studyverse teacher can review your test data with you. Same account, so nothing starts from zero.'],
]

export default function Why() {
  return (
    <section id="why" className="section s-light" aria-labelledby="why-title">
      <div className="wrap">
        <div className="why-layout">
          <div className="section-head">
            <p className="eyebrow">Why Testverse</p>
            <h2 id="why-title">Lots of apps have a test series. Here's what's different about ours.</h2>
          </div>
          <div className="why-grid">
            {POINTS.map(([title, body], i) => (
              <div className="why-item" key={title}>
                <span className="why-num">{String(i + 1).padStart(2, '0')}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
