/* design/testverse-home.html <section> Questions (FAQ) */
export default function Faq() {
  return (
    <section className="section" aria-labelledby="faq-title">
      <div className="wrap faq">
        <div className="section-head">
          <h2 id="faq-title">Questions</h2>
        </div>
        <details>
          <summary>Which exams are covered?</summary>
          <p>NEET (UG), JEE Main and JEE Advanced. Each has its own 11-test plan in its current exam pattern.</p>
        </details>
        <details>
          <summary>What's in the test plan?</summary>
          <p>6 part tests, 3 half-syllabus tests and 2 full-syllabus tests for your exam. You can take them whenever you're ready, in any order, though we suggest following the plan.</p>
        </details>
        <details>
          <summary>What's the difference between the test plan and live tests?</summary>
          <p>Test plan tests are available any time. Live tests happen at a fixed time for every student, and you get an all-India rank.</p>
        </details>
        <details>
          <summary>What if I miss a live test?</summary>
          <p>You can still take it afterwards. You'll get your score and analysis, but it won't count towards the all-India rank.</p>
        </details>
        <details>
          <summary>How much does it cost?</summary>
          <p>All-India live tests are free for everyone. The 11-test series is [PRICE] per exam.</p>
        </details>
        <details>
          <summary>Can I use a coupon or referral code?</summary>
          <p>Yes. Enter a coupon code or a friend's referral code at checkout, one code per order. Any credits you've earned can be used on top.</p>
        </details>
        <details>
          <summary>I study in a Studyverse course. Do I need a new account?</summary>
          <p>No. Log in with your Studyverse account. You get exactly the same tests and features.</p>
        </details>
        <details>
          <summary>What if a question has a mistake?</summary>
          <p>Use "Report a problem" on that question in your result. Our team checks it, and if an answer key was wrong, your score is corrected automatically.</p>
        </details>
      </div>
    </section>
  )
}
