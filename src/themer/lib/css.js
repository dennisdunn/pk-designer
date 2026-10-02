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
 * `:root {}`) or one this editor exported. Unknown properties are ignored. The label is the
 * first line of the leading comment, and the version its `Version N` line (else 1).
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
  const version = Number(/^\s*Version\s+(\d+)\s*$/im.exec(header)?.[1] ?? 1)
  return { name, label: label ?? titleCase(name), version: version >= 1 ? version : 1, tokens }
}

/**
 * The theme file: linked on its own it themes the page (`:root`); with protokuda.css
 * also loaded, `.pk-theme-<name>` themes a single frame or section. CSS has nowhere else
 * for metadata, so the label and version go in the header comment, where Open finds them.
 * @param {Theme} theme
 * @param {string} pkVersion  the Protokuda version it was made against
 */
export function themeCss(theme, pkVersion) {
  return layered(theme, pkVersion, `:root,\n  .pk-theme-${theme.name}`)
}

/**
 * The theme as a class only, for linking beside protokuda.css without making it the page
 * default: the designer's exports, where the page or a single frame opts in by class.
 * Open reads it back like a theme file.
 * @param {Theme} theme
 * @param {string} pkVersion
 */
export function classCss(theme, pkVersion) {
  return layered(theme, pkVersion, `.pk-theme-${theme.name}`)
}

/**
 * Just the class rule, in Protokuda's theme layer: for a `<style>` in a live preview.
 * No comment, so nothing from the label ends up in the page.
 * @param {Theme} theme
 */
export function classRule(theme) {
  return ['@layer protokuda.theme {', `  .pk-theme-${theme.name} {`, ...body(theme, '    '), '  }', '}', ''].join('\n')
}

/** @param {Theme} theme @param {string} pkVersion @param {string} selector */
function layered(theme, pkVersion, selector) {
  return [
    `/**\n${comment(theme.label)}\nVersion ${theme.version}\nMade with Protokuda Themer for Protokuda ${pkVersion}\n*/`,
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
 * The same theme in the protokuda repo's `src/themes/<name>.css` form, ready to add to the library.
 * @param {Theme} theme
 */
export function sourceCss(theme) {
  return [`/**\n${comment(theme.label)}\n*/`, `.pk-theme-${theme.name} {`, ...body(theme, '  '), '}', ''].join('\n')
}

/** Declarations in schema order, with a blank line before the buttons, like the library's themes. */
function body(/** @type {Theme} */ theme, /** @type {string} */ indent) {
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
