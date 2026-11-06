import { SETTINGS } from '../../../data/studentDemo.js'
import { fmt, rupee } from '../../../lib/format.js'

/* design/student-home.html side column: video solutions, refer, parent, courses */
export default function SideCards({ me, requests, videoLeft, onOpenVideo, onCopyCode }) {
  const limit = me.course ? SETTINGS.videoLimit.course : SETTINGS.videoLimit.direct

  return (
    <>
      <section className="card side-card" id="videos">
        <div className="card-head" style={{ margin: 0 }}>
          <h2>Video solutions</h2>
        </div>
        <p className="hint" style={{ fontSize: '14px' }}>
          Stuck on a question from a test, your book or a coaching sheet? Send it, and our faculty will make a video solution for you.
        </p>
        <button className="btn btn-primary" type="button" id="open-video" disabled={!videoLeft} onClick={onOpenVideo}>
          Request a video solution
        </button>
        <span className="hint">
          {videoLeft} of {limit} requests left this week · reply within {SETTINGS.videoHours} hours
        </span>
        {requests.length && me.bought ? (
          <div className="req">
            {requests.map((r, i) => {
              const map = { new: ['p-new', 'Sent'], progress: ['p-progress', 'Being recorded'], done: ['p-done', 'Ready'], declined: ['p-declined', 'Declined'] }[r.status]
              return (
                <div key={i}>
                  <span className={'pill ' + map[0]}>{map[1]}</span>
                  <span>{r.text}</span>
                  <span className="hint">
                    {r.subject} · {fmt(r.when, { day: 'numeric', month: 'short' })}
                  </span>
                  {r.link ? (
                    <a href={r.link} target="_blank" rel="noopener">
                      Watch video
                    </a>
                  ) : null}
                </div>
              )
            })}
          </div>
        ) : null}
        <a className="btn btn-outline" href={SETTINGS.youtube} target="_blank" rel="noopener">
          Browse our video library on YouTube
        </a>
      </section>

      <section className="card side-card" id="refer">
        <div className="card-head" style={{ margin: 0 }}>
          <h2>Refer &amp; earn</h2>
          <span className="meta">{rupee(me.credits)} credits</span>
        </div>
        {me.code ? (
          <>
            <p className="hint" style={{ fontSize: '14px' }}>
              Friends get {rupee(SETTINGS.referral.friendDiscount)} off with your code. You get {rupee(SETTINGS.referral.referrerCredit)} in credits when they buy.
            </p>
            <div className="code">
              <code id="my-code">{me.code}</code>
              <button className="btn btn-outline" type="button" id="copy-code" onClick={onCopyCode}>
                Copy
              </button>
            </div>
            <a
              className="btn btn-green"
              target="_blank"
              rel="noopener"
              href={
                'https://wa.me/?text=' +
                encodeURIComponent('I’m preparing with Testverse by Studyverse. Use my code ' + me.code + ' to get ' + rupee(SETTINGS.referral.friendDiscount) + ' off the test series: https://testverse.in/?ref=' + me.code)
              }
            >
              Share on WhatsApp
            </a>
          </>
        ) : (
          <p className="hint" style={{ fontSize: '14px' }}>
            Buy a test series to get your own referral code and start earning credits.
          </p>
        )}
      </section>

      {me.bought ? (
        <section className="card side-card" id="parent">
          <div className="card-head" style={{ margin: 0 }}>
            <h2>Share progress with parent</h2>
          </div>
          {me.course ? (
            <p className="hint" style={{ fontSize: '14px' }}>
              Your parents get your Studyverse report every Sunday. You can also send them a live progress link any time.
            </p>
          ) : (
            <p className="hint" style={{ fontSize: '14px' }}>
              Send your parents a private link with your tests, scores, rank and the subjects that need attention. You can switch it off any time.
            </p>
          )}
          <a
            className="btn btn-green"
            target="_blank"
            rel="noopener"
            href={'https://wa.me/?text=' + encodeURIComponent('Here’s my NEET test progress on Testverse: https://testverse.in/p/[private-link]')}
          >
            Send on WhatsApp
          </a>
        </section>
      ) : null}

      {!me.course ? (
        <section className="card side-card course">
          <h2 style={{ fontSize: '18px' }}>Want a teacher too?</h2>
          {me.bought ? (
            <p>Your Physics accuracy has stayed around 64% across your last 3 tests. A Studyverse teacher can go through your test data with you and fix the chapters losing you marks.</p>
          ) : (
            <p>Studyverse courses add live classes and faculty who teach from your own test results.</p>
          )}
          <a className="btn btn-gold" href="/courses">
            Explore Studyverse courses
          </a>
        </section>
      ) : null}
    </>
  )
}
