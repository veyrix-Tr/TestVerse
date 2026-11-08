/* For parents: the private progress link, beside an example message. */
export default function Together() {
  return (
    <section className="section s-light" aria-labelledby="parents-title">
      <div id="parents" className="wrap together">
        <div className="section-head">
          <p className="eyebrow">For parents</p>
          <h2 id="parents-title">Progress you can see on WhatsApp</h2>
          <p className="intro">Your child can send you a private progress link: tests taken, scores, all-India rank, and the subjects that need attention. In English or Hindi. They can switch the link off at any time.</p>
        </div>
        <div className="msg" aria-label="Example progress message">
          <div className="msg-bubble">
            <small>Progress link from Aarav</small>
            <b>NEET plan: 7 of 11 tests done</b>
            <div className="msg-rows">
              <span>Latest score</span>
              <em>459 / 720</em>
              <span>All-India rank</span>
              <em>1,284</em>
              <span>Needs attention</span>
              <em className="warn">Physics</em>
            </div>
          </div>
          <div className="msg-bubble msg-hi" lang="hi">
            <b>नवीनतम स्कोर 459 / 720</b>
            <span>भौतिकी पर ध्यान दें</span>
          </div>
        </div>
      </div>
    </section>
  )
}
