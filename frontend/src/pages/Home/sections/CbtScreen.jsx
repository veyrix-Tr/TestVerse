import { EXAMS } from '../../../data/exams.js'

/* design/testverse-home.html — "The same screen you'll see on exam day" section */
export default function CbtScreen({ exam }) {
  const ex = exam ? EXAMS[exam] : EXAMS.neet
  const title = exam ? ex.label + ' Full Syllabus Test 1' : 'Full Syllabus Test 1'

  return (
    <section className="section" aria-labelledby="cbt-title">
      <div className="wrap split">
        <div>
          <h2 id="cbt-title">The same screen you'll see on exam day</h2>
          <p className="lead">Practising on paper doesn't prepare you for a computer-based test under time pressure. Every test here runs on an NTA-style CBT screen.</p>
          <ul className="checks">
            <li>
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12l5 5L20 7" />
              </svg>
              <span>Countdown timer and subject-wise sections</span>
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12l5 5L20 7" />
              </svg>
              <span>Question palette: answered, not answered, not visited, marked for review</span>
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12l5 5L20 7" />
              </svg>
              <span>Mark for review, clear response, save and next</span>
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12l5 5L20 7" />
              </svg>
              <span>The real marking scheme, including negative marking</span>
            </li>
          </ul>
        </div>
        <figure className="screen" aria-label="Illustration of the CBT question palette">
          <div className="screen-bar">
            <span data-screen-title>{title}</span>
            <b>02:41:18</b>
          </div>
          <div className="screen-tabs" data-screen-tabs>
            {ex.subjects.map((s) => (
              <span key={s}>{s}</span>
            ))}
          </div>
          <div className="screen-body">
            <div className="palette" aria-hidden="true">
              <span className="a">1</span>
              <span className="a">2</span>
              <span className="m">3</span>
              <span className="a">4</span>
              <span className="n">5</span>
              <span className="a">6</span>
              <span className="a">7</span>
              <span className="m">8</span>
              <span className="a">9</span>
              <span className="n">10</span>
              <span className="a">11</span>
              <span className="c">12</span>
              <span>13</span>
              <span>14</span>
              <span>15</span>
              <span>16</span>
              <span>17</span>
              <span>18</span>
              <span>19</span>
              <span>20</span>
              <span>21</span>
              <span>22</span>
              <span>23</span>
              <span>24</span>
              <span>25</span>
              <span>26</span>
              <span>27</span>
            </div>
            <div className="legend">
              <span>
                <i style={{ background: 'var(--green)' }}></i>Answered
              </span>
              <span>
                <i style={{ border: '2px solid var(--orange)' }}></i>Not answered
              </span>
              <span>
                <i style={{ background: 'var(--soft)', border: '1px solid var(--line)' }}></i>Not visited
              </span>
              <span>
                <i style={{ background: 'var(--purple)', borderRadius: '50%' }}></i>Marked for review
              </span>
            </div>
          </div>
        </figure>
      </div>
    </section>
  )
}
