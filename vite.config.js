import { readFileSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
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

// The installable app. Paths are relative, like `base`, so it works under any Pages path.
// registerType 'prompt': a new version waits until the user reloads (src/shared/pwa.svelte.js),
// rather than replacing the app mid-edit.
const pwa = VitePWA({
  registerType: 'prompt',
  manifest: {
    name: 'Protokuda Studio',
    short_name: 'PK Studio',
    description: 'Lay out Protokuda screens and make themes for them.',
    start_url: './',
    scope: './',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#000000',
    icons: [
      { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
      { src: 'maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
    shortcuts: [
      { name: 'Designer', short_name: 'Designer', url: './#/designer' },
      { name: 'Themer', short_name: 'Themer', url: './#/themer' },
    ],
    // "Open with" for designs and theme files (Chromium on desktop); src/shared/launch.svelte.js
    // routes them. One window: a file opens in the running app.
    file_handlers: [{ action: './', accept: { 'application/json': ['.json'], 'text/css': ['.css'] } }],
    launch_handler: { client_mode: 'focus-existing' },
  },
  // Everything the app needs offline, the self-hosted font included, is in the build.
  workbox: { globPatterns: ['**/*.{js,css,html,svg,png,woff2}'] },
})

export default defineConfig({
  // Relative asset URLs, so the build works under a GitHub Pages project path (or anywhere).
  base: './',
  plugins: [svelte(), protokudaInfo(), pwa],
  // PORT lets a preview launcher pick a free port.
  server: { port: Number(process.env.PORT) || 5173 },
})
