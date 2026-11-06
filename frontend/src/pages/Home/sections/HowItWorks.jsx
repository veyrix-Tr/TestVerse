/* design/testverse-home.html <section> How it works */
export default function HowItWorks() {
  return (
    <section className="section" aria-labelledby="how-title">
      <div className="wrap">
        <div className="section-head">
          <h2 id="how-title">How it works</h2>
        </div>
        <ol className="steps">
          <li className="step">
            <b>Step 1</b>
            <h3>Sign up and pick your exam</h3>
            <p>You'll only see the tests for NEET, JEE Main or JEE Advanced, whichever you choose.</p>
          </li>
          <li className="step">
            <b>Step 2</b>
            <h3>Follow the test plan</h3>
            <p>Start with Part Test 1, or register for the next all-India live test.</p>
          </li>
          <li className="step">
            <b>Step 3</b>
            <h3>Take it on the CBT screen</h3>
            <p>Real timing, real marking, the same screen as the exam.</p>
          </li>
          <li className="step">
            <b>Step 4</b>
            <h3>Check your analysis</h3>
            <p>See where you lost marks and go through every solution before the next test.</p>
          </li>
        </ol>
      </div>
    </section>
  )
}
