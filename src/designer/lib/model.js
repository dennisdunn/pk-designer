// The design model: plain JSON, no DOM. Everything else (preview, export,
// save/load, autosave, undo) is derived from one of these objects.
//
// The functions here that change a design (placeFrame, deleteFrame, insertTrack, ...)
// are the way to edit frames and tracks: components call them on `store.design`.
// Plain fields (titles, themes, tokens) are edited directly. The store only adds
// editor state on top: selection, history, files.

// The file format's version. Not to be confused with `page.version`, the design's own
// version number, which the user bumps and which goes into download filenames.
export const MODEL_VERSION = 1

// ---------- types ----------
// The model's shape, as JSDoc so the editor and `npm run check` know it. Everything else
// in the app imports these: `@type {import('./model.js').Design}`.

/** @typedef {'frame' | 'std' | 'partial' | 'bracket'} FrameType */
/** @typedef {'sidebar' | 'statusline' | 'mirror' | 'flip' | 'alert'} Modifier */
/** @typedef {'columns' | 'rows'} Axis */
/**
 * A cell rectangle: zero-based column `x` and row `y`, size `w` x `h` in cells.
 * @typedef {{ x: number, y: number, w: number, h: number }} Rect
 */
/** @typedef {{ x: number, y: number }} Cell */
/** @typedef {{ text: string, code: string }} SidebarItem */
/**
 * @typedef {object} Frame
 * @property {string} id      editor-only identity, stable across renames
 * @property {string} area    grid-area name, also the exported element id
 * @property {Rect} rect
 * @property {FrameType} type
 * @property {Modifier[]} modifiers
 * @property {string} theme   theme name, or '' for the page theme
 * @property {string} title
 * @property {string[]} label one entry per line
 * @property {SidebarItem[]} items
 * @property {string} status
 */
/**
 * Track sizes, e.g. `['14rem', '1fr']`.
 * @typedef {{ columns: string[], rows: string[] }} Grid
 */
/**
 * @typedef {object} Page
 * @property {string} title
 * @property {number} version  the design's own version, bumped by the user
 * @property {string} theme
 * @property {boolean} alert
 * @property {Record<string, string>} tokens  `--pk-*` custom properties for `:root`
 */
/**
 * @typedef {object} Design
 * @property {number} version  file format version (MODEL_VERSION)
 * @property {Grid} grid
 * @property {Page} page
 * @property {Frame[]} frames
 */

/** @type {{ value: FrameType, label: string, className: string | null }[]} */
export const FRAME_TYPES = [
  { value: 'frame', label: 'Box', className: null },
  { value: 'std', label: 'Standard', className: 'pk-std' },
  { value: 'partial', label: 'Partial', className: 'pk-partial' },
  { value: 'bracket', label: 'Bracket', className: 'pk-bracket' },
]

/** @type {{ value: Modifier, label: string }[]} */
export const MODIFIERS = [
  { value: 'sidebar', label: 'Sidebar' },
  { value: 'statusline', label: 'Statusline' },
  { value: 'mirror', label: 'Mirror' },
  { value: 'flip', label: 'Flip' },
  { value: 'alert', label: 'Alert' },
]

// Page-level tokens the inspector offers. An empty value means "library default".
export const PAGE_TOKENS = [
  { name: '--pk-frame-line', label: 'Frame line', placeholder: '3px' },
  { name: '--pk-frame-bar', label: 'Frame bar', placeholder: '0.5rem' },
  { name: '--pk-frame-side', label: 'Frame side', placeholder: '1.1rem' },
  { name: '--pk-frame-radius', label: 'Frame radius', placeholder: '2rem' },
  { name: '--pk-sidebar-width', label: 'Sidebar width', placeholder: '5rem' },
  { name: '--pk-statusline-height', label: 'Statusline height', placeholder: '2rem' },
]

export const DEFAULT_THEME = 'greysmoke'

const RESERVED_AREAS = new Set([
  'auto', 'span', 'none', 'default', 'inherit', 'initial', 'unset', 'revert', 'revert-layer',
])

// ---------- ids and names ----------

let idCounter = 0
export function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `f${Date.now().toString(36)}${idCounter++}`
}

/**
 * Area names double as `grid-area` idents and HTML ids, so keep them simple.
 * @param {string} name
 * @param {Design} design
 * @param {string} selfId  the frame being renamed
 * @returns {string | null}
 */
export function areaNameError(name, design, selfId) {
  if (!name) return 'Required.'
  if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) return 'Letters, digits, - and _; start with a letter.'
  if (RESERVED_AREAS.has(name.toLowerCase())) return `"${name}" is reserved in CSS.`
  if (design.frames.some((f) => f.id !== selfId && f.area === name)) return 'Already used by another frame.'
  return null
}

/**
 * @param {Pick<Design, 'frames'>} design
 */
export function nextAreaName(design) {
  const used = new Set(design.frames.map((f) => f.area))
  for (let i = 1; ; i++) if (!used.has(`frame-${i}`)) return `frame-${i}`
}

// ---------- track sizes ----------

const SIMPLE_TRACK = /^(\d*\.?\d+)(fr|px|rem|em|%)$/

/** `1fr` -> {n: 1, unit: 'fr'}; anything fancier (auto, minmax(), ...) -> null. */
export function parseTrack(value) {
  const m = SIMPLE_TRACK.exec(String(value).trim())
  return m ? { n: parseFloat(m[1]), unit: m[2] } : null
}

/** Split a template like `14rem minmax(0, 1fr) auto` into its tracks. */
export function splitTracks(template) {
  const out = []
  let depth = 0
  let cur = ''
  for (const ch of String(template).trim()) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (/\s/.test(ch) && depth === 0) {
      if (cur) out.push(cur)
      cur = ''
    } else cur += ch
  }
  if (cur) out.push(cur)
  return out
}

/** One track size, e.g. `1fr`, `200px`, `auto`, `minmax(8rem, 1fr)`. No repeat(), no line names. */
export function isValidTrack(value) {
  const v = String(value).trim()
  if (!v || splitTracks(v).length !== 1 || /repeat\(|\[/i.test(v)) return false
  // `CSS` is missing in Node (the tests); fall back to a pattern there.
  if (typeof CSS !== 'undefined') return CSS.supports('grid-template-columns', v)
  return SIMPLE_TRACK.test(v) || /^(auto|min-content|max-content)$/.test(v) || /^(minmax|fit-content)\(.+\)$/.test(v)
}

/** A CSS length for a page token, e.g. `1.5rem`. Empty means "unset". */
export function isValidLength(value) {
  const v = String(value).trim()
  if (!v) return true
  if (/[;{}]/.test(v)) return false
  if (typeof CSS !== 'undefined') return CSS.supports('width', v)
  return /^-?(\d*\.?\d+)(px|rem|em|%|vw|vh)$|^0$/.test(v)
}

// ---------- geometry ----------

/**
 * @param {Rect} a
 * @param {Rect} b
 */
export function rectsOverlap(a, b) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
}

/**
 * @param {Grid} grid
 * @param {Rect} r
 */
export function rectInGrid(grid, r) {
  return r.w >= 1 && r.h >= 1 && r.x >= 0 && r.y >= 0 &&
    r.x + r.w <= grid.columns.length && r.y + r.h <= grid.rows.length
}

/**
 * Can `rect` be placed without leaving the grid or overlapping another frame?
 * @param {Design} design
 * @param {Rect} rect
 * @param {string | null} [ignoreId]
 */
export function rectFits(design, rect, ignoreId = null) {
  return rectInGrid(design.grid, rect) &&
    !design.frames.some((f) => f.id !== ignoreId && rectsOverlap(f.rect, rect))
}

/**
 * The rectangle spanned by two cells, in either order.
 * @param {Cell} a
 * @param {Cell} b
 * @returns {Rect}
 */
export function rectFromCells(a, b) {
  const x = Math.min(a.x, b.x)
  const y = Math.min(a.y, b.y)
  return { x, y, w: Math.abs(a.x - b.x) + 1, h: Math.abs(a.y - b.y) + 1 }
}

/**
 * Move or resize frame `id`, only if `rect` fits. Returns whether it did.
 * @param {Design} design
 * @param {string} id
 * @param {Rect} rect
 */
export function placeFrame(design, id, rect) {
  const frame = design.frames.find((f) => f.id === id)
  if (!frame || !rectFits(design, rect, id)) return false
  frame.rect = rect
  return true
}

/**
 * @param {Design} design
 * @param {string} id
 */
export function deleteFrame(design, id) {
  design.frames = design.frames.filter((f) => f.id !== id)
}

/**
 * @param {Design} design
 * @param {number} x
 * @param {number} y
 * @returns {Frame | null}
 */
export function frameAtCell(design, x, y) {
  return design.frames.find((f) => rectsOverlap(f.rect, { x, y, w: 1, h: 1 })) ?? null
}

/**
 * @param {Design} design
 * @returns {Cell | null}
 */
export function firstEmptyCell(design) {
  for (let y = 0; y < design.grid.rows.length; y++)
    for (let x = 0; x < design.grid.columns.length; x++)
      if (!frameAtCell(design, x, y)) return { x, y }
  return null
}

/**
 * Insert a track before `index` on axis 'columns' or 'rows'. Frames spanning the insertion point grow.
 * @param {Design} design
 * @param {Axis} axis
 * @param {number} index
 * @param {string} [size]
 */
export function insertTrack(design, axis, index, size = '1fr') {
  const [pos, len] = axis === 'columns' ? ['x', 'w'] : ['y', 'h']
  design.grid[axis].splice(index, 0, size)
  for (const f of design.frames) {
    if (f.rect[pos] >= index) f.rect[pos]++
    else if (f.rect[pos] + f.rect[len] > index) f.rect[len]++
  }
}

/**
 * Remove the track at `index`. Frames entirely inside it are deleted; spanning frames shrink.
 * @param {Design} design
 * @param {Axis} axis
 * @param {number} index
 */
export function removeTrack(design, axis, index) {
  if (design.grid[axis].length <= 1) return
  const [pos, len] = axis === 'columns' ? ['x', 'w'] : ['y', 'h']
  design.grid[axis].splice(index, 1)
  design.frames = design.frames.filter((f) => !(f.rect[pos] === index && f.rect[len] === 1))
  for (const f of design.frames) {
    if (f.rect[pos] > index) f.rect[pos]--
    else if (f.rect[pos] + f.rect[len] > index) f.rect[len]--
  }
}

/**
 * Replace a whole axis from a template string; extra tracks are added or removed at the end.
 * @param {Design} design
 * @param {Axis} axis
 * @param {string[]} sizes
 */
export function setTracks(design, axis, sizes) {
  while (design.grid[axis].length > sizes.length) removeTrack(design, axis, design.grid[axis].length - 1)
  sizes.forEach((s, i) => {
    if (i < design.grid[axis].length) design.grid[axis][i] = s
    else insertTrack(design, axis, i, s)
  })
}

/**
 * Download filename without extension: slugged page title plus version, e.g. `bridge-v3`.
 * @param {Design} design
 */
export function fileBaseName(design) {
  const title = design.page.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'design'
  return `${title}-v${design.page.version}`
}

/**
 * Every theme the design uses, page first, without repeats.
 * @param {Design} design
 * @returns {string[]}
 */
export function usedThemes(design) {
  return [...new Set([design.page.theme, ...design.frames.map((f) => f.theme)].filter(Boolean))]
}

// ---------- construction and loading ----------

/**
 * @param {Pick<Design, 'frames'>} design
 * @param {Rect} rect
 * @returns {Frame}
 */
export function newFrame(design, rect) {
  return {
    id: newId(),
    area: nextAreaName(design),
    rect,
    type: 'std',
    modifiers: [],
    theme: '',
    title: '',
    label: [],
    items: [],
    status: '',
  }
}

/** @returns {Page} */
const defaultPage = () => ({ title: 'Protokuda screen', version: 1, theme: DEFAULT_THEME, alert: false, tokens: {} })

/**
 * What New gives you: one `1fr` column, one `1fr` row, no frames.
 * @returns {Design}
 */
export function emptyDesign() {
  return { version: MODEL_VERSION, grid: { columns: ['1fr'], rows: ['1fr'] }, page: defaultPage(), frames: [] }
}

/**
 * The example a first visit opens with.
 * @returns {Design}
 */
export function starterDesign() {
  const frame = (area, rect, rest) => ({ ...newFrame({ frames: [] }, rect), area, ...rest })
  return {
    version: MODEL_VERSION,
    grid: { columns: ['14rem', '1fr'], rows: ['7rem', '1fr', '6rem'] },
    page: { ...defaultPage(), tokens: { '--pk-inner-radius': '0rem' } },
    frames: [
      frame('header', { x: 0, y: 0, w: 2, h: 1 }, { title: 'Main bridge', label: ['Deck 1'] }),
      frame('nav', { x: 0, y: 1, w: 1, h: 2 }, {
        modifiers: ['sidebar'],
        title: 'Navigation',
        items: [
          { text: 'Course', code: '47-1138' },
          { text: 'Sensors', code: '22-0451' },
        ],
      }),
      frame('main', { x: 1, y: 1, w: 1, h: 1 }, { type: 'partial', title: 'Viewscreen' }),
      frame('status', { x: 1, y: 2, w: 1, h: 1 }, {
        type: 'bracket', label: ['Systems nominal'],
      }),
    ],
  }
}

/** @type {(v: unknown, fallback?: string) => string} */
const str = (v, fallback = '') => (typeof v === 'string' ? v : fallback)
const int = (v) => (Number.isInteger(v) ? v : NaN)

/**
 * Turn untrusted JSON (a loaded file, localStorage) into a valid design.
 * Bad tracks become `1fr`; frames that are invalid, out of the grid or overlap an
 * earlier frame are dropped. Throws if it isn't a design at all.
 * @param {any} raw
 * @param {string[] | null} [knownThemes]  theme names to accept; null accepts any
 * @returns {Design}
 */
export function normalizeDesign(raw, knownThemes = null) {
  if (!raw || typeof raw !== 'object' || !raw.grid || !Array.isArray(raw.frames)) {
    throw new Error('Not a Protokuda Designer file.')
  }
  const okTheme = (t) => typeof t === 'string' && (!knownThemes || knownThemes.includes(t))
  const tracks = (list) => {
    const out = (Array.isArray(list) ? list : []).map((t) => (isValidTrack(t) ? String(t).trim() : '1fr'))
    return out.length ? out : ['1fr']
  }
  const page = raw.page ?? {}
  /** @type {Record<string, string>} */
  const tokens = {}
  for (const [k, v] of Object.entries(page.tokens ?? {})) {
    if (/^--pk-[a-z-]+$/.test(k) && typeof v === 'string' && isValidLength(v)) tokens[k] = v.trim()
  }
  /** @type {Design} */
  const design = {
    version: MODEL_VERSION,
    grid: { columns: tracks(raw.grid.columns), rows: tracks(raw.grid.rows) },
    page: {
      title: str(page.title, 'Protokuda screen'),
      version: Number.isInteger(page.version) && page.version >= 1 ? page.version : 1,
      theme: okTheme(page.theme) ? page.theme : DEFAULT_THEME,
      alert: page.alert === true,
      tokens,
    },
    frames: [],
  }
  const types = FRAME_TYPES.map((t) => t.value)
  const mods = MODIFIERS.map((m) => m.value)
  for (const f of raw.frames) {
    if (!f || typeof f !== 'object' || !f.rect) continue
    const rect = { x: int(f.rect.x), y: int(f.rect.y), w: int(f.rect.w), h: int(f.rect.h) }
    if (!rectFits(design, rect)) continue
    const frame = newFrame(design, rect)
    if (typeof f.area === 'string' && !areaNameError(f.area, design, frame.id)) frame.area = f.area
    frame.type = types.includes(f.type) ? f.type : 'std'
    frame.modifiers = mods.filter((m) => Array.isArray(f.modifiers) && f.modifiers.includes(m))
    frame.theme = okTheme(f.theme) ? f.theme : ''
    frame.title = str(f.title)
    frame.label = Array.isArray(f.label) ? f.label.filter((l) => typeof l === 'string') : []
    frame.items = Array.isArray(f.items)
      ? f.items.filter((i) => i && typeof i === 'object').map((i) => ({ text: str(i.text), code: str(i.code) }))
      : []
    frame.status = str(f.status)
    design.frames.push(frame)
  }
  return design
}
