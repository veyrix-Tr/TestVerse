import react from '@vitejs/plugin-react'
import prefixSelector from 'postcss-prefix-selector'
import { defineConfig } from 'vite'

/*
  Each design page ships its own <style> block with its own :root variables and
  its own definitions for shared class names (.btn, .card, .tabs …). To keep the
  five stylesheets from fighting each other, every rule of a page stylesheet is
  scoped to that page's root class at build time (e.g. `.btn` -> `.tv-home .btn`,
  `:root` -> `.tv-home`). All pages share one design system (same tokens, type
  and components — see DESIGN.md); only the scoping keeps them apart.
*/
const PAGE_ROOTS = {
  'Home.css': 'tv-home',
  'Subscribe.css': 'tv-subscribe',
  'StudentHome.css': 'tv-studenthome',
  'Test.css': 'tv-test',
  'Admin.css': 'tv-admin',
  'Login.css': 'tv-login',
  'Signup.css': 'tv-signup',
}

function pageScoping() {
  return {
    postcssPlugin: 'testverse-page-scoping',
    plugins: [
      prefixSelector({
        // A non-empty `prefix` is required to opt the plugin in (it ignores
        // options without one); the real per-page scope is computed in
        // `transform` below, which replaces the plugin's own prefixing.
        prefix: '.',
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
  // Dev: forward API calls to the backend (TestVerse/backend, `npm run dev`)
  server: {
    proxy: {
      '/api': process.env.VITE_PROXY_TARGET || 'http://localhost:5000',
    },
  },
  css: {
    postcss: {
      plugins: [pageScoping()],
    },
  },
})
