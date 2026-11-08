/* Section heading: title, one-line description and an optional action on the right. */
export default function SectionHead({ id, title, desc, children }) {
  return (
    <div className="sec-head">
      <div className="sec-head-text">
        <h2 id={id}>{title}</h2>
        {desc ? <p>{desc}</p> : null}
      </div>
      {children ? <div className="sec-head-action">{children}</div> : null}
    </div>
  )
}
