import { EXAM, SETTINGS } from '../../../data/studentDemo.js'
import { fmt, rupee } from '../../../lib/format.js'

const REQ_STATUS = {
  new: ['status-blue', 'Sent'],
  progress: ['status-amber', 'Being recorded'],
  done: ['status-green', 'Ready'],
  declined: ['status-red', 'Declined'],
}

/* Right rail: video solutions, refer & earn, share with parent, courses. */
export default function SideCards({ me, requests, videoLeft, onOpenVideo, onCopyCode }) {
  const limit = me.course ? SETTINGS.videoLimit.course : SETTINGS.videoLimit.direct
  const waRefer =
    'https://wa.me/?text=' +
    encodeURIComponent('I’m preparing with Testverse by Studyverse. Use my code ' + me.code + ' to get ' + rupee(SETTINGS.referral.friendDiscount) + ' off the test series: https://testverse.in/?ref=' + me.code)

  return (
    <>
      <section className="card rail-card" id="videos" aria-labelledby="videos-title">
        <h2 id="videos-title">Video solutions</h2>
        <p className="rail-text">Stuck on a question from a test, your book or a coaching sheet? Send a photo and our faculty record a video solution for you.</p>
        <div className="quota">
          <div className="quota-row">
            <span>
              <b>{videoLeft}</b> of {limit} left this week
            </span>
            <span className="muted">Reply in {SETTINGS.videoHours} h</span>
          </div>
          <div className="bar" aria-hidden="true">
            <i style={{ width: Math.round((videoLeft / limit) * 100) + '%' }}></i>
          </div>
        </div>
        <button className="btn btn-primary btn-block" type="button" disabled={!videoLeft} onClick={onOpenVideo}>
          Request a video solution
        </button>
        {requests.length && me.bought ? (
          <ul className="requests" aria-label="Your requests">
            {requests.map((r, i) => {
              const [cls, label] = REQ_STATUS[r.status]
              return (
                <li key={i}>
                  <div className="req-top">
                    <span className={'status ' + cls}>{label}</span>
                    <span className="meta">
                      {r.subject} · {fmt(r.when, { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <p>{r.text}</p>
                  {r.link ? (
                    <a className="text-link" href={r.link} target="_blank" rel="noopener">
                      Watch video
                    </a>
                  ) : null}
                </li>
              )
            })}
          </ul>
        ) : null}
        <a className="text-link" href={SETTINGS.youtube} target="_blank" rel="noopener">
          Browse our video library on YouTube
        </a>
      </section>

      <section className="card rail-card" id="refer" aria-labelledby="refer-title">
        <div className="rail-head">
          <h2 id="refer-title">Refer &amp; earn</h2>
          <span className="rail-figure">
            {rupee(me.credits)}
            <small>credits</small>
          </span>
        </div>
        {me.code ? (
          <>
            <p className="rail-text">
              Friends get {rupee(SETTINGS.referral.friendDiscount)} off with your code. You get {rupee(SETTINGS.referral.referrerCredit)} in credits when they buy.
            </p>
            <div className="code">
              <span className="code-label">Your code</span>
              <code>{me.code}</code>
              <button className="btn btn-outline btn-sm" type="button" onClick={onCopyCode}>
                Copy link
              </button>
            </div>
            <a className="btn btn-outline btn-block btn-wa" target="_blank" rel="noopener" href={waRefer}>
              Share on WhatsApp
            </a>
          </>
        ) : (
          <p className="rail-text">Buy a test series to get your own referral code and start earning credits.</p>
        )}
      </section>

      {me.bought ? (
        <section className="card rail-card" id="parent" aria-labelledby="parent-title">
          <h2 id="parent-title">Share progress with parent</h2>
          <p className="rail-text">
            {me.course
              ? 'Your parents get your Studyverse report every Sunday. You can also send them a live progress link any time.'
              : 'Send your parents a private link with your tests, scores, rank and the subjects that need attention. You can switch it off any time.'}
          </p>
          <a
            className="btn btn-outline btn-block btn-wa"
            target="_blank"
            rel="noopener"
            href={'https://wa.me/?text=' + encodeURIComponent('Here’s my ' + EXAM.label + ' test progress on Testverse: https://testverse.in/p/[private-link]')}
          >
            Send on WhatsApp
          </a>
        </section>
      ) : null}

      {!me.course ? (
        <section className="card rail-card teacher-card" aria-labelledby="teacher-title">
          <p className="eyebrow">Studyverse courses</p>
          <h2 id="teacher-title">Want a teacher too?</h2>
          <p className="rail-text">
            {me.bought
              ? 'Your Physics accuracy has stayed around 64% across your last 3 tests. A Studyverse teacher can go through your test data with you and fix the chapters losing you marks.'
              : 'Studyverse courses add live classes and faculty who teach from your own test results.'}
          </p>
          <a className="text-link" href="/courses">
            Explore Studyverse courses
          </a>
        </section>
      ) : null}
    </>
  )
}
