// The README that ships in the Export zip. The text is readme.md; `{{key}}` placeholders are
// filled in here.

import template from './readme.md?raw'

/** @typedef {import('./theme/theme.js').Theme} Theme */

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

/** What the Themes section says about the project's own themes. @param {Theme[]} themes */
function themesText(themes) {
  if (!themes.length) return "The page uses Protokuda's built-in themes, which come with the library."
  const list = themes.map((t) => `- \`${t.name}.css\`: ${t.label}, the class \`pk-theme-${t.name}\``).join('\n')
  const example = themes[0].name
  return `The project's own themes, one file each:

${list}

Each file only defines its class, so linking one changes nothing until an element opts in. Link it
**after** Protokuda, then put the class on \`<html>\` to theme the whole page, or on one frame or
section to theme just that part:

\`\`\`html
<link rel="stylesheet" href="${example}.css" />
<div class="pk-frame pk-std pk-theme-${example}">...</div>
\`\`\`

\`index.html\` already links the ones it uses.`
}

/**
 * @param {{ title: string, version: number, pkVersion: string, files: string[], themes: Theme[] }} project
 */
export function readme({ title, version, pkVersion, files, themes }) {
  return fill(template, {
    title: title || 'Protokuda screen',
    version,
    pkVersion,
    files: files.map((f) => `- \`${f}\``).join('\n'),
    themes: themesText(themes),
    protokudaUrl: cdnUrl(pkVersion, 'protokuda.min.css'),
  })
}
