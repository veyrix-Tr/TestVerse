import { useEffect, useRef } from 'react'

/* Escape like the design's esc() — React would otherwise inject the string as
   HTML only through dangerouslySetInnerHTML, so we escape first. */
export function esc(v) {
  return String(v == null ? '' : v).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  )
}

/*
  Renders HTML that may contain $...$ formulas, then runs KaTeX auto-render on
  it (the design calls its math() helper the same way). The HTML string is set
  through dangerouslySetInnerHTML and only changes when the string changes, so
  KaTeX's DOM mutations are safe.
*/
export default function MathText({ html, className, as: Tag = 'span' }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el || !window.renderMathInElement) return
    try {
      window.renderMathInElement(el, { delimiters: [{ left: '$', right: '$', display: false }], throwOnError: false })
    } catch {
      /* formulas stay as plain text */
    }
  })

  return <Tag ref={ref} className={className} dangerouslySetInnerHTML={{ __html: html }} />
}
