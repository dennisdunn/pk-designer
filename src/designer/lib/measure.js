// Where the screen's grid tracks are, in pixels relative to the canvas. The canvas positions its
// guides (cells, hit boxes, handles, separators) from this, and track dragging shares out the
// content box. Pure: it takes the screen's computed style and two bounding boxes.

import { splitTracks } from './model.js'

/** @typedef {import('./gestures.js').Span} Span */
/**
 * @typedef {object} GridMeasure
 * @property {Span[]} cols  each column's start and end
 * @property {Span[]} rows  each row's start and end
 * @property {number} gapX
 * @property {number} gapY
 * @property {number} fontSize  the root font size, for rem tracks
 * @property {number} contentW  the grid's content box, which its tracks share
 * @property {number} contentH
 */
/**
 * The computed-style properties this reads; a CSSStyleDeclaration has them all.
 * @typedef {Record<'gridTemplateColumns' | 'gridTemplateRows' | 'columnGap' | 'rowGap'
 *   | 'paddingLeft' | 'paddingRight' | 'paddingTop' | 'paddingBottom'
 *   | 'borderLeftWidth' | 'borderRightWidth' | 'borderTopWidth' | 'borderBottomWidth', string>} GridStyle
 */

const px = (/** @type {string} */ v) => parseFloat(v) || 0

/**
 * Track spans along one axis: computed track sizes (always px), laid out from `start` with `gap` between.
 * @param {string} template  e.g. `120px 240.5px`
 * @param {number} start
 * @param {number} gap
 * @returns {Span[]}
 */
function spans(template, start, gap) {
  let p = start
  return splitTracks(template).map((t) => {
    const span = { start: p, end: p + px(t) }
    p = span.end + gap
    return span
  })
}

/**
 * @param {GridStyle} style  the screen's computed style
 * @param {{ left: number, top: number, width: number, height: number }} screen  its bounding box
 * @param {{ left: number, top: number }} canvas  the canvas's bounding box
 * @param {number} fontSize  the root font size
 * @returns {GridMeasure}
 */
export function measureGrid(style, screen, canvas, fontSize) {
  // The grid starts inside the screen's border and padding; its content box is what's left.
  const insetLeft = px(style.borderLeftWidth) + px(style.paddingLeft)
  const insetTop = px(style.borderTopWidth) + px(style.paddingTop)
  const insetX = insetLeft + px(style.paddingRight) + px(style.borderRightWidth)
  const insetY = insetTop + px(style.paddingBottom) + px(style.borderBottomWidth)
  return {
    cols: spans(style.gridTemplateColumns, screen.left - canvas.left + insetLeft, px(style.columnGap)),
    rows: spans(style.gridTemplateRows, screen.top - canvas.top + insetTop, px(style.rowGap)),
    gapX: px(style.columnGap),
    gapY: px(style.rowGap),
    fontSize,
    contentW: screen.width - insetX,
    contentH: screen.height - insetY,
  }
}
