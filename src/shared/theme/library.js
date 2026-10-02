// The theme library: themes saved from the themer, for the designer to use. Pure helpers;
// the shared state (localStorage, reactivity) is src/shared/library.svelte.js.

import { completeTheme, isValidName } from './theme.js'
import { valueKind } from './tokens.js'

/** @typedef {import('./theme.js').Theme} Theme */

/**
 * A copy of a theme with only the values a theme file writes: hex colors and `var()`s of
 * palette colors or tokens. Anything else is dropped and filled from `base`, so a library
 * theme is always safe to put in a `<style>` and complete.
 * @param {Theme} theme
 * @param {Record<string, string>} base  tokens of the default theme
 * @param {Record<string, string>} palette
 * @returns {Theme}
 */
export function cleanTheme(theme, base, palette) {
  /** @type {Record<string, string>} */
  const tokens = {}
  for (const [k, v] of Object.entries(theme.tokens)) {
    if (typeof v === 'string' && valueKind(v, palette) !== 'other') tokens[k] = v
  }
  return completeTheme({ ...theme, label: String(theme.label), tokens }, base)
}

/**
 * Valid themes from untrusted JSON (localStorage, or a design file's `themes`), by name.
 * Built-in names are skipped: a library theme can't shadow one of the package's.
 * @param {any} raw  name → theme
 * @param {{ base: Record<string, string>, palette: Record<string, string>, builtIn: string[] }} pkg
 * @returns {Record<string, Theme>}
 */
export function readThemes(raw, { base, palette, builtIn }) {
  /** @type {Record<string, Theme>} */
  const out = {}
  if (!raw || typeof raw !== 'object') return out
  for (const t of Object.values(raw)) {
    if (!t || typeof t !== 'object' || !isValidName(t.name) || builtIn.includes(t.name)) continue
    if (typeof t.label !== 'string' || !t.tokens || typeof t.tokens !== 'object') continue
    out[t.name] = cleanTheme(t, base, palette)
  }
  return out
}

/** Whether two themes are the same, ignoring token order. @param {Theme} a @param {Theme} b */
export function sameTheme(a, b) {
  const keys = Object.keys(a.tokens)
  return (
    a.name === b.name &&
    a.label === b.label &&
    a.version === b.version &&
    keys.length === Object.keys(b.tokens).length &&
    keys.every((k) => a.tokens[k] === b.tokens[k])
  )
}

/**
 * What opening a design file does to the library: themes it carries that the library lacks are
 * added; where the library has a theme by the same name, the library's wins, and differing ones are
 * reported. `incoming` should already be validated (`readThemes`).
 * @param {Record<string, Theme>} mine  the library
 * @param {Record<string, Theme>} incoming  the design file's themes
 * @returns {{ add: Theme[], differed: string[] }}
 */
export function mergeThemes(mine, incoming) {
  const add = []
  const differed = []
  for (const theme of Object.values(incoming)) {
    const existing = mine[theme.name]
    if (!existing) add.push(theme)
    else if (!sameTheme(existing, theme)) differed.push(theme.name)
  }
  return { add, differed }
}
