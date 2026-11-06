/* design/testverse-home.html <section class="wrap final"> */
export default function FinalCta({ signupHref }) {
  return (
    <section className="wrap final">
      <div className="final-card">
        <h2>Find out where you stand before the exam does.</h2>
        <p>Get the 11-test series for your exam today.</p>
        <a className="btn btn-gold btn-lg" href={signupHref} data-signup>
          Get the test series
        </a>
      </div>
    </section>
  )
}
