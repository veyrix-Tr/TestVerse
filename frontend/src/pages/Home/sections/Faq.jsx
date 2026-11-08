const QA = [
  ['Which exams are covered?', 'NEET (UG), JEE Main and JEE Advanced. Each has its own 11-test plan in its current exam pattern.'],
  ["What's in the test plan?", "6 part tests, 3 half-syllabus tests and 2 full-syllabus tests for your exam. You can take them whenever you're ready, in any order, though we suggest following the plan."],
  ["What's the difference between the test plan and live tests?", 'Test plan tests are available any time. Live tests happen at a fixed time for every student, and you get an all-India rank.'],
  ['What if I miss a live test?', "You can still take it afterwards. You'll get your score and analysis, but it won't count towards the all-India rank."],
  ['How much does it cost?', 'All-India live tests are free for everyone. The 11-test series is [PRICE] per exam.'],
  ['I study in a Studyverse course. Do I need a new account?', 'Yes, for now. Testverse accounts are separate from Studyverse, so sign up once with your email. You get exactly the same tests and features.'],
  ['What if a question has a mistake?', 'Use "Report a problem" on that question in your result. Our team checks it, and if an answer key was wrong, your score is corrected automatically.'],
]

export default function Faq() {
  return (
    <section id="faq" className="section s-soft" aria-labelledby="faq-title">
      <div className="wrap faq">
        <div className="section-head faq-head">
          <p className="eyebrow">FAQ</p>
          <h2 id="faq-title">Questions and answers</h2>
          <p className="intro">
            Something else? <a href="/contact">Get in touch</a> and a real person will reply.
          </p>
        </div>
        <div className="faq-list">
          {QA.map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
