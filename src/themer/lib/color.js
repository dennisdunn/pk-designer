// Resolving token values to colors, and the WCAG contrast checks.

import { bare, isHex, isToken, tokenDef, varName } from '../../shared/theme/tokens.js'

/** @typedef {import('../../shared/theme/theme.js').Theme} Theme */

/**
 * Resolve a token to a hex color, following palette and token references.
 * Null when it can't be resolved (a cycle, an unknown name, or a non-hex value).
 * @param {Theme} theme
 * @param {string} token
 * @param {Record<string, string>} palette
 * @returns {string | null}
 */
export function resolve(theme, token, palette, seen = new Set()) {
  if (seen.has(token)) return null
  seen.add(token)
  const value = theme.tokens[token] ?? (tokenDef(token)?.unset ?? null)
  if (value === null) return null
  if (isToken(value)) return resolve(theme, value, palette, seen) // an unset fallback
  return resolveValue(theme, value, palette, seen)
}

/**
 * @param {Theme} theme
 * @param {string} value
 * @param {Record<string, string>} palette
 * @returns {string | null}
 */
function resolveValue(theme, value, palette, seen = new Set()) {
  if (isHex(value)) return expandHex(value)
  const ref = varName(value)
  if (!ref) return null
  if (isToken(ref)) return resolve(theme, ref, palette, seen)
  const color = palette[bare(ref)]
  return color ? expandHex(color) : null
}

/** Would setting `token` to `var(<ref>)` make a cycle of token references? */
export function wouldCycle(/** @type {Theme} */ theme, /** @type {string} */ token, /** @type {string} */ ref) {
  /** @type {string | null} */
  let cur = ref
  const seen = new Set()
  while (cur && isToken(cur) && !seen.has(cur)) {
    if (cur === token) return true
    seen.add(cur)
    const v = theme.tokens[cur] ?? tokenDef(cur)?.unset ?? null
    cur = v && (isToken(v) ? v : varName(v))
  }
  return false
}

/** `#abc` → `#aabbcc`, lowercased. */
function expandHex(/** @type {string} */ hex) {
  const h = hex.toLowerCase()
  return h.length === 4 ? `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}` : h
}

/** WCAG relative luminance of a #rrggbb color. */
function luminance(/** @type {string} */ hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG contrast ratio between two #rrggbb colors, 1 to 21. */
export function contrast(/** @type {string} */ a, /** @type {string} */ b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/**
 * The pairs that have to read against each other. Text needs 4.5:1 (WCAG AA);
 * frame edges and focus rings are non-text UI and need 3:1.
 */
const PAIRS = [
  { label: 'Content text', fg: '--pk-text', bg: '--pk-backdrop-light', min: 4.5 },
  { label: 'Titles and labels', fg: '--pk-on-backdrop', bg: '--pk-backdrop-light', min: 4.5 },
  { label: 'Nameplate and status text', fg: '--pk-on-primary', bg: '--pk-primary', min: 4.5 },
  { label: 'Frame edges', fg: '--pk-primary', bg: '--pk-backdrop', min: 3 },
  { label: 'On secondary', fg: '--pk-on-secondary', bg: '--pk-secondary', min: 4.5 },
  { label: 'Input text', fg: '--pk-on-accent', bg: '--pk-accent', min: 4.5 },
  { label: 'Inputs and focus ring', fg: '--pk-accent', bg: '--pk-backdrop-light', min: 3 },
  { label: 'Alert text', fg: '--pk-on-error', bg: '--pk-error', min: 4.5 },
  { label: 'Alert edges', fg: '--pk-error', bg: '--pk-backdrop', min: 3 },
  { label: 'Button', fg: '--pk-button-fg', bg: '--pk-button-bg', min: 4.5 },
  { label: 'Button hover', fg: '--pk-button-hover-fg', bg: '--pk-button-hover-bg', min: 4.5 },
]

/**
 * @param {Theme} theme
 * @param {Record<string, string>} palette
 */
export function contrastChecks(theme, palette) {
  return PAIRS.map((p) => {
    const fg = resolve(theme, p.fg, palette)
    const bg = resolve(theme, p.bg, palette)
    const ratio = fg && bg ? contrast(fg, bg) : null
    return { ...p, fgColor: fg, bgColor: bg, ratio, pass: ratio !== null && ratio >= p.min }
  })
}
