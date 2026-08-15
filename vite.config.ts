import { defineConfig } from 'vite'
import type { Plugin } from 'vite'

const CANONICAL_URL = process.env.CANONICAL_URL

function canonicalLink(): Plugin {
  return {
    name: 'canonical-link',
    transformIndexHtml() {
      if (!CANONICAL_URL) {
        return
      }
      return [{
        tag: 'link',
        attrs: { rel: 'canonical', href: CANONICAL_URL },
        injectTo: 'head'
      }]
    }
  }
}

export default defineConfig({
  root: '.',
  base: './',
  plugins: [canonicalLink()],
  build: {
    outDir: 'dist',
    minify: 'terser',
    sourcemap: false
  }
})
