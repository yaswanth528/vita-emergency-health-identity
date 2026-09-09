import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

/**
 * GitHub Pages serves a project site from /<repo>/, so the production build
 * needs that prefix baked in. `import.meta.env.BASE_URL` carries the value
 * through to the router, so there is one source of truth.
 *
 * `vite preview` reports command === 'serve', same as dev — keying only off
 * that served the preview at the root while the built HTML pointed at /<repo>/,
 * so preview silently failed to reproduce Pages. `isPreview` separates them.
 */
const REPO = 'vita-emergency-health-identity'

export default defineConfig(({ command, isPreview }) => ({
  base: command === 'serve' && !isPreview ? '/' : `/${REPO}/`,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(process.cwd(), 'src') },
  },
  server: { port: 5173 },
}))
