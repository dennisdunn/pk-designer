import { describe, expect, it } from 'vitest'
import { drawRect, moveRect, nudgeRect, resizeRect, trackAt } from './gestures.js'
import { MODEL_VERSION, newFrame } from './model.js'

/** @typedef {import('./model.js').Design} Design */
/** @typedef {import('./model.js').Rect} Rect */

/** @type {(id: string, rect: Rect) => import('./model.js').Frame} */
const frame = (id, rect) => ({ ...newFrame({ frames: [] }, rect), id, area: id })

/**
 * A 4x4 grid with an obstacle `o` in cell (2, 2) and `f` in the top-left cell.
 * @returns {Design}
 */
const design = () => ({
  version: MODEL_VERSION,
  grid: { columns: ['1fr', '1fr', '1fr', '1fr'], rows: ['1fr', '1fr', '1fr', '1fr'] },
  page: { title: 't', version: 1, theme: 'greysmoke', alert: false },
  frames: [frame('f', { x: 0, y: 0, w: 1, h: 1 }), frame('o', { x: 2, y: 2, w: 1, h: 1 })],
})

describe('trackAt', () => {
  const spans = [{ start: 24, end: 124 }, { start: 148, end: 248 }]
  it('finds the track under a point, splitting gaps down the middle', () => {
    expect(trackAt(spans, 50)).toBe(0)
    expect(trackAt(spans, 135)).toBe(0)
    expect(trackAt(spans, 137)).toBe(1)
  })
  it('clamps points outside the grid to the first or last track', () => {
    expect(trackAt(spans, -10)).toBe(0)
    expect(trackAt(spans, 900)).toBe(1)
  })
})

describe('drawRect', () => {
  it('spans from the start cell to the pointer, in any direction', () => {
    const d = design()
    expect(drawRect(d, { x: 1, y: 1 }, { x: 0, y: 3 }, { x: 1, y: 1 })?.rect).toEqual({ x: 0, y: 1, w: 2, h: 3 })
  })
  it('slides along an obstacle instead of sticking', () => {
    const d = design()
    // From (1,1) diagonally to (3,3) would cover the obstacle at (2,2). Coming from a
    // corner at (3,1), keep the columns and stay on row 1.
    const next = drawRect(d, { x: 1, y: 1 }, { x: 3, y: 3 }, { x: 3, y: 1 })
    expect(next?.rect).toEqual({ x: 1, y: 1, w: 3, h: 1 })
    expect(next?.corner).toEqual({ x: 3, y: 1 })
  })
  it('stays put when the pointer is blocked on both axes', () => {
    const d = design()
    // Dragging right along row 2 from (1,2) runs straight into the obstacle at (2,2).
    expect(drawRect(d, { x: 1, y: 2 }, { x: 3, y: 2 }, { x: 1, y: 2 })?.rect).toEqual({ x: 1, y: 2, w: 1, h: 1 })
  })
  it('returns null when even the start cell is taken', () => {
    const d = design()
    expect(drawRect(d, { x: 2, y: 2 }, { x: 3, y: 3 }, { x: 2, y: 2 })).toBeNull()
  })
})

describe('moveRect', () => {
  it('keeps the grab offset and stays inside the grid', () => {
    const d = design()
    d.frames[0].rect = { x: 0, y: 0, w: 2, h: 1 }
    expect(moveRect(d, d.frames[0], { x: 3, y: 0 }, { x: 1, y: 0 })).toEqual({ x: 2, y: 0, w: 2, h: 1 })
    expect(moveRect(d, d.frames[0], { x: 9, y: 9 }, { x: 0, y: 0 })).toEqual({ x: 2, y: 3, w: 2, h: 1 })
  })
  it('slides along an obstacle on the free axis', () => {
    const d = design()
    // Moving f from (0,0) to (2,2) hits o; moving only in x to (2,0) is free.
    expect(moveRect(d, d.frames[0], { x: 2, y: 2 }, { x: 0, y: 0 })).toEqual({ x: 2, y: 0, w: 1, h: 1 })
  })
})

describe('resizeRect', () => {
  it('moves only the dragged sides and keeps at least one cell', () => {
    const d = design()
    const orig = d.frames[0].rect
    expect(resizeRect(d, 'f', orig, 'e', { x: 3, y: 0 })).toEqual({ x: 0, y: 0, w: 4, h: 1 })
    expect(resizeRect(d, 'f', orig, 's', { x: 3, y: 1 })).toEqual({ x: 0, y: 0, w: 1, h: 2 })
    expect(resizeRect(d, 'f', { x: 1, y: 0, w: 2, h: 1 }, 'w', { x: 3, y: 0 })).toEqual({ x: 2, y: 0, w: 1, h: 1 })
  })
  it('keeps the free axis when a corner drag would cover an obstacle', () => {
    const d = design()
    expect(resizeRect(d, 'f', d.frames[0].rect, 'se', { x: 3, y: 3 })).toEqual({ x: 0, y: 0, w: 4, h: 1 })
  })
})

describe('nudgeRect', () => {
  it('moves by a cell, or grows and shrinks from the right/bottom edge', () => {
    const d = design()
    const f = d.frames[0]
    expect(nudgeRect(d, f, 1, 0, false)).toEqual({ x: 1, y: 0, w: 1, h: 1 })
    expect(nudgeRect(d, f, 0, 1, true)).toEqual({ x: 0, y: 0, w: 1, h: 2 })
  })
  it('refuses leaving the grid, overlap and shrinking to nothing', () => {
    const d = design()
    expect(nudgeRect(d, d.frames[0], -1, 0, false)).toBeNull()
    expect(nudgeRect(d, d.frames[0], -1, 0, true)).toBeNull()
    expect(nudgeRect(d, d.frames[1], 0, -1, true)).toBeNull()
    d.frames[0].rect = { x: 1, y: 2, w: 1, h: 1 }
    expect(nudgeRect(d, d.frames[0], 1, 0, false)).toBeNull()
  })
})
