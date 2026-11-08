const STEPS = [
  ['Sign up and pick your exam', "You'll only see the tests for NEET, JEE Main or JEE Advanced, whichever you choose."],
  ['Follow the test plan', 'Start with Part Test 1, or register for the next all-India live test.'],
  ['Take it on the CBT screen', 'Real timing, real marking, the same screen as the exam.'],
  ['Check your analysis', 'See where you lost marks and go through every solution before the next test.'],
]

export default function HowItWorks() {
  return (
    <section className="section s-soft" aria-labelledby="how-title">
      <div className="wrap">
        <div className="section-head">
          <p className="eyebrow">How it works</p>
          <h2 id="how-title">Four steps, then repeat until exam day</h2>
        </div>
        <ol className="steps">
          {STEPS.map(([t, b], i) => (
            <li className="step" key={t}>
              <span className="step-num">Step {i + 1}</span>
              <h3>{t}</h3>
              <p>{b}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
