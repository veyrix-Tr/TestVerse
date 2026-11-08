/* Parents' progress link and the referral programme, side by side. */
export default function Together() {
  return (
    <section className="section s-light" aria-label="For parents, and refer and earn">
      <div className="wrap together">
        <div id="parents" className="together-col">
          <div className="section-head">
            <p className="eyebrow">For parents</p>
            <h2>Progress you can see on WhatsApp</h2>
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

        <div id="refer" className="together-col">
          <div className="section-head">
            <p className="eyebrow">Refer and earn</p>
            <h2 id="refer-title">Invite friends and earn credits</h2>
            <p className="intro">Every student gets a personal referral code after buying a test series. Share it with friends preparing for the same exam.</p>
          </div>
          <ol className="refer-steps">
            <li>
              <b>Share your code</b>
              <span>Send your link on WhatsApp or Instagram from your account.</span>
            </li>
            <li>
              <b>Your friend saves</b>
              <span>They get [REFERRAL DISCOUNT] off their test series.</span>
            </li>
            <li>
              <b>You earn credits</b>
              <span>You get [REFERRAL CREDIT] in credits when they buy, to use on your next purchase.</span>
            </li>
          </ol>
        </div>
      </div>
    </section>
  )
}
