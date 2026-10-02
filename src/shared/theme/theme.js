// The theme model: its shape, naming, and the operations the store builds on.
// Reading and writing theme CSS is in css.js; colors and contrast in color.js.

import { TOKENS } from './tokens.js'

/**
 * A Protokuda theme. Token values are CSS values exactly as they appear in a theme file:
 * a palette color (`var(--pk-lilac)`), another token (`var(--pk-secondary-light)`), or a
 * hex color (`#ff9900`). A token that's absent is unset.
 * @typedef {object} Theme
 * @property {string} name   class/file name: `pk-theme-<name>`, `<name>.css`
 * @property {string} label  human name, written as the file's leading comment
 * @property {number} version  the theme's own version, bumped by the user; in the header comment
 * @property {Record<string, string>} tokens
 */

export const isValidName = (/** @type {string} */ name) => /^[a-z][a-z0-9-]*$/.test(name)

/** `golden-tanoi` → `Golden Tanoi` */
export const titleCase = (/** @type {string} */ s) =>
  s.split(/[-\s]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')

/**
 * A readable label for a theme name. Most themes are named after a palette color
 * (`goldentanoi` is golden-tanoi), which gives the word breaks.
 * @param {string} name
 * @param {Record<string, string>} palette
 */
export function labelFor(name, palette) {
  const color = Object.keys(palette).find((c) => c.replace(/-/g, '') === name)
  return titleCase(color ?? name)
}

/** `My Theme!` → `mytheme` */
export const nameFor = (/** @type {string} */ label) =>
  label.toLowerCase().replace(/[^a-z0-9]+/g, '').replace(/^[0-9]+/, '') || 'custom'

/**
 * Download filename without extension: the theme name plus version, e.g. `lilac-v3`.
 * @param {Theme} theme
 */
export const fileBaseName = (theme) => `${theme.name}-v${theme.version}`

/**
 * The package's default theme: the one whose tokens all equal protokuda.css's `:root` values,
 * which is what a page gets with no theme class. Null if none does.
 * @param {Record<string, string>} rootTokens  from `rootDeclarations`
 * @param {Record<string, Theme>} themes
 * @returns {string | null}
 */
export function defaultThemeOf(rootTokens, themes) {
  const matches = (/** @type {Theme} */ t) => Object.entries(t.tokens).every(([k, v]) => rootTokens[k] === v)
  return Object.values(themes).find(matches)?.name ?? null
}

/**
 * A copy of a built-in theme under a new name, as a starting point.
 * @param {Theme} from
 * @returns {Theme}
 */
export function startFrom(from) {
  return { name: `my${from.name}`, label: `My ${from.label}`, version: 1, tokens: { ...from.tokens } }
}

/**
 * Fill in anything a loaded theme lacks from a base theme, so every required token is set.
 * Drops unknown tokens and repairs a missing or invalid version.
 * @param {Theme} theme
 * @param {Record<string, string>} base  tokens of the default theme
 * @returns {Theme}
 */
export function completeTheme(theme, base) {
  const tokens = /** @type {Record<string, string>} */ ({})
  for (const t of TOKENS) {
    const v = theme.tokens[t.name] ?? (t.optional ? undefined : base[t.name])
    if (v) tokens[t.name] = v
  }
  const version = Number.isInteger(theme.version) && theme.version >= 1 ? theme.version : 1
  return { name: theme.name, label: theme.label, version, tokens }
}
