// The README that ships beside the theme in the Export zip. The text is readme.md;
// `{{key}}` placeholders are filled in here.

import template from './readme.md?raw'

/** @typedef {import('../../shared/theme/theme.js').Theme} Theme */

/** jsDelivr URL for a Protokuda file at exactly `version`. */
export const cdnUrl = (/** @type {string} */ version, /** @type {string} */ file) =>
  `https://cdn.jsdelivr.net/npm/protokuda@${version}/dist/${file}`

/**
 * @param {string} text
 * @param {Record<string, string | number>} values
 */
export function fill(text, values) {
  return text.replace(/\{\{(\w+)\}\}/g, (m, key) => {
    if (!(key in values)) throw new Error(`no value for ${m}`)
    return String(values[key])
  })
}

/**
 * @param {Theme} theme
 * @param {string} pkVersion
 */
export function readme(theme, pkVersion) {
  return fill(template, {
    label: theme.label,
    name: theme.name,
    version: theme.version,
    file: `${theme.name}.css`,
    pkVersion,
    protokudaUrl: cdnUrl(pkVersion, 'protokuda.min.css'),
  })
}
