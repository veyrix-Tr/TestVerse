import react from '@vitejs/plugin-react'
import prefixSelector from 'postcss-prefix-selector'
import { defineConfig } from 'vite'

/*
  Each design page ships its own <style> block with its own :root variables and
  its own definitions for shared class names (.btn, .card, .tabs …). To keep the
  five stylesheets from fighting each other, every rule of a page stylesheet is
  scoped to that page's root class at build time (e.g. `.btn` -> `.tv-home .btn`,
  `:root` -> `.tv-home`). The CSS source files stay byte-identical to the design.
*/
const PAGE_ROOTS = {
  'Home.css': 'tv-home',
  'Checkout.css': 'tv-checkout',
  'StudentHome.css': 'tv-studenthome',
  'Test.css': 'tv-test',
  'Admin.css': 'tv-admin',
}

function pageScoping() {
  return {
    postcssPlugin: 'testverse-page-scoping',
    plugins: [
      prefixSelector({
        // Only page stylesheets are scoped; global CSS keeps its selectors.
        transform(prefix, selector, prefixedSelector, filePath) {
          const file = (filePath || '').replace(/\\/g, '/')
          const root = Object.entries(PAGE_ROOTS).find(([name]) => file.endsWith(`/pages/${name.replace('.css', '')}/${name}`))
          if (!root) return selector
          const scope = `.${root[1]}`
          return selector
            .split(',')
            .map((part) => {
              const s = part.trim()
              if (s === ':root' || s === 'body' || s === 'html') return scope
              return `${scope} ${s}`
            })
            .join(', ')
        },
      }),
    ],
  }
}

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: {
      plugins: [pageScoping()],
    },
  },
})
