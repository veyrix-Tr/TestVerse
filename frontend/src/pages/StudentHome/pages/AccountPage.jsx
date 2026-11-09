import PageHeader from '../sections/PageHeader.jsx'
import { BatchCard, FreePlanCard } from '../sections/SideCards.jsx'

/* "/student/account": the signed-in student's details and plan (read-only), and log out. */
export default function AccountPage({ me, user, data, onLogout, loggingOut }) {
  const u = user || {}
  const place = [u.city, u.state].filter(Boolean).join(', ')
  const details = [
    ['Email', u.email],
    ['Mobile', u.phone ? '+91 ' + u.phone : ''],
    ['Exam', me.examName],
    ['Class', u.grade],
    ['Target year', u.targetYear],
    ['City', place],
  ]

  return (
    <>
      <PageHeader
        title="Account"
        desc="Your profile and your plan."
        actions={
          <button className="btn btn-outline btn-danger" type="button" disabled={loggingOut} onClick={onLogout}>
            {loggingOut ? 'Logging out…' : 'Log out'}
          </button>
        }
      />

      <div className="account-grid">
        <section className="card profile-card" aria-labelledby="profile-title">
          <div className="profile-top">
            <span className="avatar avatar-lg" aria-hidden="true">
              {me.first.charAt(0)}
            </span>
            <div>
              <h2 id="profile-title">{me.name}</h2>
              <p className="meta">{[me.examText, me.batch || 'Free access'].filter(Boolean).join(' · ')}</p>
            </div>
          </div>
          <dl className="details">
            {details.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd className={v ? undefined : 'muted'}>{v || 'Not given'}</dd>
              </div>
            ))}
          </dl>
          <p className="hint">These are the details you signed up with.</p>
        </section>

        {me.subscription ? <BatchCard me={me} full /> : <FreePlanCard free={data.free} />}
      </div>
    </>
  )
}
