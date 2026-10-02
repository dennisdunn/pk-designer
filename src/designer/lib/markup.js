// HTML and CSS generated from the design. The preview renders these same strings
// (with `preview: true` / a scope), so what you see is what gets exported.

import { FRAME_TYPES } from './model.js'

const FONT_URL = 'https://fonts.googleapis.com/css2?family=Antonio:wght@100..700&display=swap'
export const cdnUrl = (version) => `https://cdn.jsdelivr.net/npm/protokuda@${version}/dist/protokuda.min.css`

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ESCAPES[c])

function frameClasses(frame) {
  return [
    'pk-frame',
    FRAME_TYPES.find((t) => t.value === frame.type)?.className,
    ...frame.modifiers.map((m) => `pk-${m}`),
    frame.theme && `pk-theme-${frame.theme}`,
  ].filter(Boolean)
}

function screenClasses(design) {
  return ['pk-screen', design.page.alert && 'pk-alert'].filter(Boolean)
}

function frameMarkup(frame, { preview }, indent) {
  const pad = (n) => indent + '  '.repeat(n)
  const idAttr = preview ? `data-area="${esc(frame.area)}"` : `id="${esc(frame.area)}"`
  const lines = [`${pad(0)}<div class="${frameClasses(frame).join(' ')}" ${idAttr}>`]
  if (frame.title) lines.push(`${pad(1)}<div class="pk-title">${esc(frame.title)}</div>`)
  if (frame.modifiers.includes('sidebar') && frame.items.length) {
    lines.push(`${pad(1)}<div class="pk-items">`)
    for (const item of frame.items) {
      const code = item.code ? ` data-code="${esc(item.code)}"` : ''
      lines.push(`${pad(2)}<button type="button" class="pk-button"${code}>${esc(item.text)}</button>`)
    }
    lines.push(`${pad(1)}</div>`)
  }
  lines.push(`${pad(1)}<div class="pk-content"></div>`)
  if (frame.label.some(Boolean)) {
    lines.push(`${pad(1)}<div class="pk-label">`)
    for (const line of frame.label) lines.push(`${pad(2)}<span>${esc(line)}</span>`)
    lines.push(`${pad(1)}</div>`)
  }
  if (frame.modifiers.includes('statusline') && frame.status) {
    lines.push(`${pad(1)}<div class="pk-status">${esc(frame.status)}</div>`)
  }
  lines.push(`${pad(0)}</div>`)
  return lines.join('\n')
}

/** The `.pk-screen` element and its frames. */
export function screenMarkup(design, { preview = false, indent = '' } = {}) {
  // The preview is inert: frame buttons are placeholders, and selection happens in the guides layer.
  const tag = preview ? 'div' : 'main'
  const inert = preview ? ' inert' : ''
  const frames = design.frames
    .slice()
    .sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x)
    .map((f) => frameMarkup(f, { preview }, indent + '  '))
  return [`${indent}<${tag} class="${screenClasses(design).join(' ')}"${inert}>`, ...frames, `${indent}</${tag}>`].join('\n')
}

/** `grid-template-areas` rows, padded so the columns line up. */
export function templateAreas(design) {
  const { columns, rows } = design.grid
  const cells = rows.map(() => columns.map(() => '.'))
  for (const f of design.frames) {
    for (let y = f.rect.y; y < f.rect.y + f.rect.h; y++)
      for (let x = f.rect.x; x < f.rect.x + f.rect.w; x++) cells[y][x] = f.area
  }
  const widths = columns.map((_, x) => Math.max(...cells.map((row) => row[x].length)))
  return cells.map((row) => `"${row.map((c, x) => c.padEnd(widths[x])).join(' ').trimEnd()}"`)
}

/**
 * layout.css. With `scope` (the preview), selectors are prefixed and tokens go on the
 * scope element instead of `:root`; frames are matched by data-area instead of id.
 */
export function layoutCss(design, { scope = '' } = {}) {
  const root = scope || ':root'
  const pre = scope ? `${scope} ` : ''
  const frameSel = (area) => (scope ? `${pre}[data-area="${area}"]` : `#${area}`)
  const out = []

  const tokens = Object.entries(design.page.tokens).filter(([, v]) => v)
  if (tokens.length) {
    out.push(`${root} {`, ...tokens.map(([k, v]) => `  ${k}: ${v};`), '}', '')
  }
  out.push(
    `${pre}.pk-screen {`,
    `  grid-template-columns: ${design.grid.columns.join(' ')};`,
    `  grid-template-rows: ${design.grid.rows.join(' ')};`,
    '  grid-template-areas:',
    ...templateAreas(design).map((row, i, all) => `    ${row}${i === all.length - 1 ? ';' : ''}`),
    '}',
  )
  const frames = design.frames.slice().sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x)
  for (const f of frames) out.push('', `${frameSel(f.area)} {`, `  grid-area: ${f.area};`, '}')
  return out.join('\n') + '\n'
}

/**
 * index.html for export. Links the Antonio font, Protokuda at exactly `version`, a `<name>.css`
 * for each theme in `themeFiles` (the custom ones, which the CDN doesn't have) and layout.css.
 * @param {import('./model.js').Design} design
 * @param {{ version: string, themeFiles?: string[] }} options
 */
export function indexHtml(design, { version, themeFiles = [] }) {
  const themeLinks = themeFiles.map((name) => `    <link rel="stylesheet" href="${esc(name)}.css" />\n`).join('')
  const theme = design.page.theme ? ` class="pk-theme-${esc(design.page.theme)}"` : ''
  return `<!doctype html>
<html lang="en"${theme}>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="version" content="${design.page.version}" />
    <title>${esc(design.page.title || 'Protokuda screen')}</title>
    <link rel="stylesheet" href="${FONT_URL}" />
    <link rel="stylesheet" href="${cdnUrl(version)}" />
${themeLinks}    <link rel="stylesheet" href="layout.css" />
  </head>
  <body>
${screenMarkup(design, { indent: '    ' })}
  </body>
</html>
`
}
