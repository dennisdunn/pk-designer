// The tokens a Protokuda theme sets, and the kinds of value a token can hold. A theme is what
// frames look like: their colors, and optionally their geometry (edge widths and corners).

/**
 * @typedef {object} TokenDef
 * @property {string} name      the custom property, e.g. `--pk-primary`
 * @property {string} label
 * @property {boolean} [optional]  may be left unset
 * @property {string} [unset]   what an unset optional token falls back to (a token name)
 * @property {'length'} [kind]  a length (geometry); colors otherwise
 */

/** The tokens a theme sets, grouped for the inspector, in the order a theme file lists them. */
export const GROUPS = /** @type {{ name: string, tokens: TokenDef[] }[]} */ ([
  {
    name: 'Surfaces',
    tokens: [
      { name: '--pk-backdrop', label: 'Backdrop' },
      { name: '--pk-backdrop-light', label: 'Frame interior' },
      { name: '--pk-backdrop-dark', label: 'Backdrop dark' },
      { name: '--pk-text', label: 'Content text' },
      { name: '--pk-on-backdrop', label: 'Titles and labels', optional: true, unset: '--pk-primary' },
    ],
  },
  {
    name: 'Primary',
    tokens: [
      { name: '--pk-primary', label: 'Primary (frame edges)' },
      { name: '--pk-primary-light', label: 'Primary light' },
      { name: '--pk-primary-dark', label: 'Primary dark' },
      { name: '--pk-on-primary', label: 'On primary' },
    ],
  },
  {
    name: 'Secondary',
    tokens: [
      { name: '--pk-secondary', label: 'Secondary' },
      { name: '--pk-secondary-light', label: 'Secondary light' },
      { name: '--pk-secondary-dark', label: 'Secondary dark' },
      { name: '--pk-on-secondary', label: 'On secondary' },
    ],
  },
  {
    name: 'Accent',
    tokens: [
      { name: '--pk-accent', label: 'Accent (inputs, focus)' },
      { name: '--pk-accent-light', label: 'Accent light' },
      { name: '--pk-accent-dark', label: 'Accent dark' },
      { name: '--pk-on-accent', label: 'On accent' },
    ],
  },
  {
    name: 'Error',
    tokens: [
      { name: '--pk-error', label: 'Error (alerts)' },
      { name: '--pk-on-error', label: 'On error' },
    ],
  },
  {
    name: 'Buttons',
    tokens: [
      { name: '--pk-button-bg', label: 'Button' },
      { name: '--pk-button-fg', label: 'Button text' },
      { name: '--pk-button-hover-bg', label: 'Button hover' },
      { name: '--pk-button-hover-fg', label: 'Button hover text' },
    ],
  },
  {
    // All optional: a theme that leaves them unset gets Protokuda's defaults (or the page theme's).
    name: 'Geometry',
    tokens: [
      { name: '--pk-frame-line', label: 'Box frame line' },
      { name: '--pk-frame-bar', label: 'Top and bottom bars' },
      { name: '--pk-frame-side', label: 'Side bars' },
      { name: '--pk-sidebar-width', label: 'Sidebar width' },
      { name: '--pk-statusline-height', label: 'Statusline height' },
      { name: '--pk-frame-radius', label: 'Outer corners' },
      { name: '--pk-elbow-radius', label: 'Outer elbow corners', unset: '--pk-frame-radius' },
      { name: '--pk-end-radius', label: 'Outer far corners', unset: '--pk-frame-radius' },
      { name: '--pk-inner-radius', label: 'Inner elbow curve' },
    ].map((t) => ({ ...t, optional: true, kind: /** @type {const} */ ('length') })),
  },
])

export const TOKENS = GROUPS.flatMap((g) => g.tokens)
/** The color tokens: the ones a color can refer to, and contrast checks look at. */
export const COLOR_TOKENS = TOKENS.filter((t) => t.kind !== 'length')
const TOKEN_NAMES = new Set(TOKENS.map((t) => t.name))

/** Is this custom property one of the theme's tokens? */
export const isToken = (/** @type {string} */ name) => TOKEN_NAMES.has(name)

/** @param {string} name */
export const tokenDef = (name) => TOKENS.find((t) => t.name === name)

const PREFIX = '--pk-'

/** `--pk-golden-tanoi` → `golden-tanoi` */
export const bare = (/** @type {string} */ name) => (name.startsWith(PREFIX) ? name.slice(PREFIX.length) : name)

export const isHex = (/** @type {string} */ v) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)

/**
 * A plain length a theme file may hold for a geometry token: `3px`, `1.5rem`, `0.5em`, `0`.
 * Deliberately narrow, so a library theme stays safe to put in a `<style>`.
 */
export const isLength = (/** @type {string} */ v) => /^(\d*\.?\d+(px|rem|em)|0)$/.test(v)

/** Whether two lengths are the same however they're written: `.5rem` and `0.5rem`. */
export function sameLength(/** @type {string} */ a, /** @type {string} */ b) {
  const unit = (/** @type {string} */ v) => v.trim().replace(/^[\d.]+/, '')
  return parseFloat(a) === parseFloat(b) && (parseFloat(a) === 0 || unit(a) === unit(b))
}

/** `var(--pk-foo)` → `--pk-foo`, anything else → null. */
export function varName(/** @type {string} */ value) {
  return /^var\(\s*(--pk-[a-z0-9-]+)\s*\)$/i.exec(value.trim())?.[1] ?? null
}

/**
 * What a token's value is, which decides how the inspector edits it:
 * - `unset`: no value (only optional tokens);
 * - `custom`: a hex color;
 * - `palette`: `var(--pk-<palette color>)`;
 * - `token`: `var(--pk-<another token>)`;
 * - `other`: anything else a loaded file had (kept as is, shown read-only).
 * @param {string | undefined} value
 * @param {Record<string, string>} palette
 * @returns {'unset' | 'custom' | 'palette' | 'token' | 'other'}
 */
export function valueKind(value, palette) {
  if (!value) return 'unset'
  if (isHex(value)) return 'custom'
  const ref = varName(value)
  if (ref && isToken(ref)) return tokenDef(ref)?.kind === 'length' ? 'other' : 'token'
  if (ref && bare(ref) in palette) return 'palette'
  return 'other'
}
