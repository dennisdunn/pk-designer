import { readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'

// `virtual:protokuda` exposes facts about the installed protokuda package:
// its version (for the export's CDN link) and its theme names (from dist/themes).
// Nothing here is hard-coded, so a package update flows through on the next build.
function protokudaInfo() {
  const id = 'virtual:protokuda'
  const resolved = '\0' + id
  return {
    name: 'protokuda-info',
    resolveId: (source) => (source === id ? resolved : null),
    load(source) {
      if (source !== resolved) return null
      const pkgPath = createRequire(import.meta.url).resolve('protokuda/package.json')
      const { version } = createRequire(import.meta.url)('protokuda/package.json')
      const themesDir = join(dirname(pkgPath), 'dist', 'themes')
      const themes = readdirSync(themesDir)
        .filter((f) => f.endsWith('.css') && !f.endsWith('.min.css'))
        .map((f) => f.slice(0, -'.css'.length))
        .sort()
      return `export const version = ${JSON.stringify(version)};\nexport const themes = ${JSON.stringify(themes)};\n`
    },
  }
}

export default defineConfig({
  plugins: [svelte(), protokudaInfo()],
})
