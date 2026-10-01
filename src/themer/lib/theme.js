// The theme model, and everything derived from it: parsing theme CSS, writing it back out,
// resolving token values to colors, and the contrast checks. No DOM here.

/**
 * A Protokuda theme. Token values are CSS values exactly as they appear in a theme file:
 * a palette color (`var(--pk-lilac)`), another token (`var(--pk-secondary-light)`), or a
 * hex color (`#ff9900`). A token that's absent is unset.
 * @typedef {object} Theme
 * @property {string} name   class/file name: `pk-theme-<name>`, `<name>.css`
 * @property {string} label  human name, written as the file's leading comment
 * @property {Record<string, string>} tokens
 */

/**
 * @typedef {object} TokenDef
 * @property {string} name      the custom property, e.g. `--pk-primary`
 * @property {string} label
 * @property {boolean} [optional]  may be left unset
 * @property {string} [unset]   what an unset optional token falls back to (a token name)
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
])

export const TOKENS = GROUPS.flatMap((g) => g.tokens)
const TOKEN_NAMES = new Set(TOKENS.map((t) => t.name))

/** @param {string} name */
export const tokenDef = (name) => TOKENS.find((t) => t.name === name)

export const isValidName = (/** @type {string} */ name) => /^[a-z][a-z0-9-]*$/.test(name)
export const isHex = (/** @type {string} */ v) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)

/** `var(--pk-foo)` → `--pk-foo`, anything else → null. */
export function varName(/** @type {string} */ value) {
  return /^var\(\s*(--pk-[a-z0-9-]+)\s*\)$/i.exec(value.trim())?.[1] ?? null
}

/**
 * Every `--pk-*` declaration in some CSS, in order; later ones win.
 * @param {string} css
 * @returns {Record<string, string>}
 */
export function declarations(css) {
  const out = /** @type {Record<string, string>} */ ({})
  const noComments = css.replace(/\/\*[\s\S]*?\*\//g, '')
  for (const m of noComments.matchAll(/(--pk-[a-z0-9-]+)\s*:\s*([^;{}]+?)\s*(?=[;}])/gi)) {
    out[m[1].toLowerCase()] = m[2]
  }
  return out
}

/**
 * The palette from a built protokuda.css: every `--pk-<color>: #hex` that isn't a theme token.
 * @param {string} css
 * @returns {Record<string, string>} color name (without `--pk-`) → hex
 */
export function paletteFrom(css) {
  const out = /** @type {Record<string, string>} */ ({})
  for (const [name, value] of Object.entries(declarations(css))) {
    if (!TOKEN_NAMES.has(name) && isHex(value)) out[name.slice('--pk-'.length)] = value.toLowerCase()
  }
  return out
}

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
 * Read a theme from CSS: a theme file from protokuda (source `.pk-theme-<name> {}` or built
 * `:root {}`) or one this editor exported. Unknown properties are ignored.
 * @param {string} css
 * @param {string} [fallbackName]  e.g. from the filename
 * @returns {Theme}
 */
export function parseTheme(css, fallbackName = 'custom') {
  const all = declarations(css)
  const tokens = /** @type {Record<string, string>} */ ({})
  for (const t of TOKENS) if (all[t.name]) tokens[t.name] = all[t.name]
  if (Object.keys(tokens).length === 0) throw new Error('no Protokuda theme tokens found')
  const cls = /\.pk-theme-([a-z][a-z0-9-]*)/.exec(css)?.[1]
  const name = cls ?? (isValidName(fallbackName) ? fallbackName : nameFor(fallbackName))
  const comment = /^\s*\/\*+\s*([^\n*][^\n]*?)\s*\n/.exec(css)?.[1]
  return { name, label: comment ?? titleCase(name), tokens }
}

/**
 * The theme file: linked on its own it themes the page (`:root`); with protokuda.css
 * also loaded, `.pk-theme-<name>` themes a single frame or section.
 * @param {Theme} theme
 */
export function themeCss(theme) {
  return [
    `/**\n${theme.label}\n*/`,
    '@layer protokuda.base, protokuda.theme, protokuda.state;',
    '',
    '@layer protokuda.theme {',
    `  :root,\n  .pk-theme-${theme.name} {`,
    ...body(theme, '    '),
    '  }',
    '}',
    '',
  ].join('\n')
}

/**
 * The same theme in the protokuda repo's `src/themes/<name>.css` form, ready to add to the library.
 * @param {Theme} theme
 */
export function sourceCss(theme) {
  return [`/**\n${theme.label}\n*/`, `.pk-theme-${theme.name} {`, ...body(theme, '  '), '}', ''].join('\n')
}

/** Declarations in schema order, with a blank line before the buttons, like the library's themes. */
function body(theme, indent) {
  const lines = []
  for (const g of GROUPS) {
    if (g.name === 'Buttons') lines.push('')
    for (const t of g.tokens) {
      const v = theme.tokens[t.name]
      if (v) lines.push(`${indent}${t.name}: ${v};`)
    }
  }
  return lines
}

/**
 * Fill in anything a loaded theme lacks from a base theme, so every required token is set.
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
  return { name: theme.name, label: theme.label, tokens }
}

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
  if (TOKEN_NAMES.has(value)) return resolve(theme, value, palette, seen) // an unset fallback
  return resolveValue(theme, value, palette, seen)
}

/**
 * @param {Theme} theme
 * @param {string} value
 * @param {Record<string, string>} palette
 * @returns {string | null}
 */
export function resolveValue(theme, value, palette, seen = new Set()) {
  if (isHex(value)) return expandHex(value)
  const ref = varName(value)
  if (!ref) return null
  if (TOKEN_NAMES.has(ref)) return resolve(theme, ref, palette, seen)
  const color = palette[ref.slice('--pk-'.length)]
  return color ? expandHex(color) : null
}

/** `#abc` → `#aabbcc`, lowercased. */
export function expandHex(/** @type {string} */ hex) {
  const h = hex.toLowerCase()
  return h.length === 4 ? `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}` : h
}

/** WCAG relative luminance of a #rrggbb color. */
export function luminance(/** @type {string} */ hex) {
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
export const PAIRS = [
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

/** Token references that would make a cycle if `token` were set to `var(<ref>)`. */
export function wouldCycle(/** @type {Theme} */ theme, /** @type {string} */ token, /** @type {string} */ ref) {
  /** @type {string | null} */
  let cur = ref
  const seen = new Set()
  while (cur && TOKEN_NAMES.has(cur) && !seen.has(cur)) {
    if (cur === token) return true
    seen.add(cur)
    const v = theme.tokens[cur] ?? tokenDef(cur)?.unset ?? null
    cur = v && (TOKEN_NAMES.has(v) ? v : varName(v))
  }
  return false
}
