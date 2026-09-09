import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

/**
 * The base prefix differs per deploy target, so it cannot be a constant:
 *
 * - GitHub Pages serves a project site from /<repo>/, so that build needs the
 *   repo prefix baked in.
 * - Vercel serves from the domain root, where the same prefix points at a
 *   directory that does not exist — index.html requests /<repo>/assets/*, gets
 *   404s, and the page renders blank.
 *
 * GITHUB_ACTIONS is set only inside a GH Actions runner, so it tells the two
 * apart with no manual switching. DEPLOY_TARGET=pages forces the Pages layout
 * locally, so `vite preview` can still reproduce Pages when needed.
 *
 * `import.meta.env.BASE_URL` carries the value through to the router, so there
 * is one source of truth.
 */
const REPO = 'vita-emergency-health-identity'

const isPagesBuild =
  process.env.GITHUB_ACTIONS === 'true' || process.env.DEPLOY_TARGET === 'pages'

export default defineConfig(({ command, isPreview }) => {
  // `vite preview` reports command === 'serve', same as dev, so `isPreview`
  // separates them: only the dev server is unconditionally rooted at /.
  const isDevServer = command === 'serve' && !isPreview

  return {
    base: isDevServer || !isPagesBuild ? '/' : `/${REPO}/`,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': path.resolve(process.cwd(), 'src') },
    },
    server: { port: 5173 },
  }
})
