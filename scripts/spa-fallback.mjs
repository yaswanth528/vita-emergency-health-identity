/**
 * GitHub Pages has no server-side rewrite, so a deep link like
 * /clinician/patients lands on a 404. Serving the app's own index.html as the
 * 404 page lets the router take over and resolve the route client-side.
 *
 * .nojekyll stops Pages running the output through Jekyll, which would
 * otherwise drop any file or folder beginning with an underscore.
 */
import fs from 'node:fs'

const dist = 'dist'
if (!fs.existsSync(`${dist}/index.html`)) {
  console.error('No dist/index.html — run vite build first.')
  process.exit(1)
}
fs.copyFileSync(`${dist}/index.html`, `${dist}/404.html`)
fs.writeFileSync(`${dist}/.nojekyll`, '')
console.log('SPA fallback written: 404.html + .nojekyll')
