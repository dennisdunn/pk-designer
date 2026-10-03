// Theme CSS in and out: reading Protokuda's files and ours, and writing theme files.

import { isValidName, nameFor, titleCase } from './theme.js'
import { GROUPS, TOKENS, bare, isHex, isToken } from './tokens.js'

/** @typedef {import('./theme.js').Theme} Theme */

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
 * The `--pk-*` declarations of the first `:root {}` rule in a built protokuda.css: the values a
 * page gets with no theme class.
 * @param {string} css
 * @returns {Record<string, string>}
 */
export function rootDeclarations(css) {
  const block = /:root\s*\{([^}]*)\}/.exec(css.replace(/\/\*[\s\S]*?\*\//g, ''))?.[1]
  return block ? declarations(`${block};`) : {}
}

/**
 * The palette from a built protokuda.css: every `--pk-<color>: #hex` that isn't a theme token.
 * @param {string} css
 * @returns {Record<string, string>} color name (without `--pk-`) → hex
 */
export function paletteFrom(css) {
  const out = /** @type {Record<string, string>} */ ({})
  for (const [name, value] of Object.entries(declarations(css))) {
    if (!isToken(name) && isHex(value)) out[bare(name)] = value.toLowerCase()
  }
  return out
}

/**
 * Read a theme from CSS: a theme file from protokuda (source `.pk-theme-<name> {}` or built
 * `:root {}`) or one the studio exported. Unknown properties are ignored. The label is the
 * first line of the leading comment. (Its `Version N` line is the project's, not the theme's.)
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
  const header = /^\s*\/\*([\s\S]*?)\*\//.exec(css)?.[1] ?? ''
  const label = /^\*?[ \t]*([^\s*][^\n]*?)[ \t]*$/m.exec(header)?.[1]
  return { name, label: label ?? titleCase(name), tokens }
}

/**
 * Which file a theme belongs to: the Protokuda version it was made against, and the project's
 * version. CSS has nowhere else for metadata, so they go in the header comment.
 * @typedef {{ pkVersion: string, version: number }} Stamp
 */

/**
 * The theme file: linked on its own it themes the page (`:root`); with protokuda.css
 * also loaded, `.pk-theme-<name>` themes a single frame or section.
 * @param {Theme} theme
 * @param {Stamp} stamp
 */
export function themeCss(theme, stamp) {
  return layered(theme, stamp, `:root,\n  .pk-theme-${theme.name}`)
}

/**
 * The theme as a class only, for linking beside protokuda.css without making it the page
 * default: the exports, where the page or a single frame opts in by class.
 * Open reads it back like a theme file.
 * @param {Theme} theme
 * @param {Stamp} stamp
 */
export function classCss(theme, stamp) {
  return layered(theme, stamp, `.pk-theme-${theme.name}`)
}

/**
 * Just the class rule, in Protokuda's theme layer: for a `<style>` in a live preview.
 * No comment, so nothing from the label ends up in the page.
 * @param {Theme} theme
 */
export function classRule(theme) {
  return ['@layer protokuda.theme {', `  .pk-theme-${theme.name} {`, ...body(theme, '    '), '  }', '}', ''].join('\n')
}

/** @param {Theme} theme @param {Stamp} stamp @param {string} selector */
function layered(theme, { pkVersion, version }, selector) {
  return [
    `/**\n${comment(theme.label)}\nVersion ${version}\nMade with Protokuda Studio for Protokuda ${pkVersion}\n*/`,
    '@layer protokuda.base, protokuda.theme, protokuda.state;',
    '',
    '@layer protokuda.theme {',
    `  ${selector} {`,
    ...body(theme, '    '),
    '  }',
    '}',
    '',
  ].join('\n')
}

/** Text that can't end the comment it sits in. @param {string} text */
const comment = (text) => text.replace(/\*\//g, '* /')

/**
 * Declarations in schema order, with a blank line before the buttons like the library's themes,
 * and before any geometry.
 */
function body(/** @type {Theme} */ theme, /** @type {string} */ indent) {
  const lines = []
  for (const g of GROUPS) {
    const set = g.tokens.filter((t) => theme.tokens[t.name])
    if (set.length && (g.name === 'Buttons' || g.name === 'Geometry')) lines.push('')
    for (const t of set) lines.push(`${indent}${t.name}: ${theme.tokens[t.name]};`)
  }
  return lines
}
