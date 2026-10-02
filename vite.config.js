import { readFileSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'
import { paletteFrom, parseTheme } from './src/themer/lib/css.js'
import { labelFor } from './src/themer/lib/theme.js'

// `virtual:protokuda` exposes facts about the installed protokuda package: its version
// (for the exports' CDN links), its palette (from dist/protokuda.css) and its themes (from
// dist/themes). Nothing here is hard-coded, so a package update flows through on the next build.
function protokudaInfo() {
  const id = 'virtual:protokuda'
  const resolved = '\0' + id
  return {
    name: 'protokuda-info',
    resolveId: (source) => (source === id ? resolved : null),
    load(source) {
      if (source !== resolved) return null
      const require = createRequire(import.meta.url)
      const pkgPath = require.resolve('protokuda/package.json')
      const { version } = require('protokuda/package.json')
      const dist = join(dirname(pkgPath), 'dist')
      const palette = paletteFrom(readFileSync(join(dist, 'protokuda.css'), 'utf8'))
      const themes = Object.fromEntries(
        readdirSync(join(dist, 'themes'))
          .filter((f) => f.endsWith('.css') && !f.endsWith('.min.css'))
          .sort()
          .map((f) => {
            const name = f.slice(0, -'.css'.length)
            const { tokens } = parseTheme(readFileSync(join(dist, 'themes', f), 'utf8'), name)
            return [name, { name, label: labelFor(name, palette), version: 1, tokens }]
          }),
      )
      return [
        `export const version = ${JSON.stringify(version)};`,
        `export const palette = ${JSON.stringify(palette)};`,
        `export const themes = ${JSON.stringify(themes)};`,
        `export const themeNames = ${JSON.stringify(Object.keys(themes))};`,
        '',
      ].join('\n')
    },
  }
}

export default defineConfig({
  // Relative asset URLs, so the build works under a GitHub Pages project path (or anywhere).
  base: './',
  plugins: [svelte(), protokudaInfo()],
  // PORT lets a preview launcher pick a free port.
  server: { port: Number(process.env.PORT) || 5173 },
})
