// Drawing, moving, resizing and nudging frames on the grid, as pure functions of the
// design and the cell under the pointer. The canvas turns pointer positions into cells
// (`trackAt`); these decide the resulting rectangle. Each returns null when nothing fits.
//
// Pointer drags try a few candidates in order, so a drag that runs into another frame
// slides along it on the free axis instead of sticking.

import { rectFits, rectFromCells } from './model.js'

/** @typedef {import('./model.js').Design} Design */
/** @typedef {import('./model.js').Frame} Frame */
/** @typedef {import('./model.js').Rect} Rect */
/** @typedef {import('./model.js').Cell} Cell */
/**
 * A track's extent along one axis, in px.
 * @typedef {{ start: number, end: number }} Span
 */
/**
 * A resize handle: a side or a corner.
 * @typedef {'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw'} Edge
 */

export const EDGES = /** @type {Edge[]} */ (['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'])

const clamp = (/** @type {number} */ n, /** @type {number} */ lo, /** @type {number} */ hi) =>
  Math.max(lo, Math.min(hi, n))

/**
 * @param {Design} design
 * @param {Rect[]} candidates
 * @param {string | null} [ignoreId]
 */
const firstFit = (design, candidates, ignoreId = null) =>
  candidates.find((r) => rectFits(design, r, ignoreId)) ?? null

/**
 * Index of the track under position `p`; a point in a gap goes to the nearer track,
 * and points beyond either end go to the first or last track.
 * @param {Span[]} spans
 * @param {number} p
 */
export function trackAt(spans, p) {
  for (let i = 0; i < spans.length - 1; i++) if (p < (spans[i].end + spans[i + 1].start) / 2) return i
  return spans.length - 1
}

/**
 * Drawing a new frame from `start` toward `cur`. `corner` is the far corner of the
 * previous result (start with `start`); pass the returned one back in on the next move.
 * @param {Design} design
 * @param {Cell} start
 * @param {Cell} cur
 * @param {Cell} corner
 * @returns {{ rect: Rect, corner: Cell } | null}
 */
export function drawRect(design, start, cur, corner) {
  const rect = firstFit(design, [
    rectFromCells(start, cur),
    rectFromCells(start, { x: cur.x, y: corner.y }),
    rectFromCells(start, { x: corner.x, y: cur.y }),
  ])
  if (!rect) return null
  return {
    rect,
    corner: {
      x: rect.x === start.x ? rect.x + rect.w - 1 : rect.x,
      y: rect.y === start.y ? rect.y + rect.h - 1 : rect.y,
    },
  }
}

/**
 * Moving `frame` so the cell it was grabbed by (`grab`, relative to its top-left)
 * sits under `cell`. Stays inside the grid.
 * @param {Design} design
 * @param {Frame} frame
 * @param {Cell} cell
 * @param {Cell} grab
 * @returns {Rect | null}
 */
export function moveRect(design, frame, cell, grab) {
  const { w, h } = frame.rect
  const x = clamp(cell.x - grab.x, 0, design.grid.columns.length - w)
  const y = clamp(cell.y - grab.y, 0, design.grid.rows.length - h)
  return firstFit(design, [{ x, y, w, h }, { x, y: frame.rect.y, w, h }, { x: frame.rect.x, y, w, h }], frame.id)
}

/**
 * Resizing frame `id` (originally at `orig`) by dragging `edge` to `cell`. The opposite
 * sides stay put, and the frame never shrinks below one cell.
 * @param {Design} design
 * @param {string} id
 * @param {Rect} orig
 * @param {Edge} edge
 * @param {Cell} cell
 * @returns {Rect | null}
 */
export function resizeRect(design, id, orig, edge, cell) {
  let [x0, x1, y0, y1] = [orig.x, orig.x + orig.w - 1, orig.y, orig.y + orig.h - 1]
  if (edge.includes('e')) x1 = Math.max(cell.x, x0)
  if (edge.includes('w')) x0 = Math.min(cell.x, x1)
  if (edge.includes('s')) y1 = Math.max(cell.y, y0)
  if (edge.includes('n')) y0 = Math.min(cell.y, y1)
  const both = { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }
  return firstFit(design, [both, { ...both, y: orig.y, h: orig.h }, { ...both, x: orig.x, w: orig.w }], id)
}

/**
 * One arrow-key step: move by (dx, dy) cells, or with `resize`, move the right/bottom edge.
 * @param {Design} design
 * @param {Frame} frame
 * @param {number} dx
 * @param {number} dy
 * @param {boolean} resize
 * @returns {Rect | null}
 */
export function nudgeRect(design, frame, dx, dy, resize) {
  const r = frame.rect
  const next = resize ? { ...r, w: r.w + dx, h: r.h + dy } : { ...r, x: r.x + dx, y: r.y + dy }
  return rectFits(design, next, frame.id) ? next : null
}
