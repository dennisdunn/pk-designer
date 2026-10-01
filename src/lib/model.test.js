import { describe, expect, it } from 'vitest'
import {
  areaNameError, insertTrack, isValidTrack, normalizeDesign, rectFits, removeTrack, setTracks,
  splitTracks, starterDesign,
} from './model.js'

const design = () => ({
  grid: { columns: ['1fr', '1fr', '1fr'], rows: ['1fr', '1fr'] },
  page: { title: 't', theme: 'greysmoke', alert: false, tokens: {} },
  frames: [
    { id: 'a', area: 'a', rect: { x: 0, y: 0, w: 2, h: 1 } },
    { id: 'b', area: 'b', rect: { x: 2, y: 0, w: 1, h: 2 } },
  ],
})

describe('tracks', () => {
  it('splits templates at top-level spaces only', () => {
    expect(splitTracks('14rem  minmax(0, 1fr) auto')).toEqual(['14rem', 'minmax(0, 1fr)', 'auto'])
  })
  it('accepts single tracks and rejects lists, repeat() and junk', () => {
    for (const ok of ['1fr', '200px', '12.5rem', 'auto', 'minmax(8rem, 1fr)']) expect(isValidTrack(ok), ok).toBe(true)
    for (const bad of ['', '1fr 2fr', 'repeat(2, 1fr)', 'banana', '[a] 1fr']) expect(isValidTrack(bad), bad).toBe(false)
  })
})

describe('geometry', () => {
  it('refuses overlap and leaving the grid', () => {
    const d = design()
    expect(rectFits(d, { x: 0, y: 1, w: 2, h: 1 })).toBe(true)
    expect(rectFits(d, { x: 1, y: 0, w: 1, h: 1 })).toBe(false)
    expect(rectFits(d, { x: 1, y: 0, w: 1, h: 1 }, 'a')).toBe(true)
    expect(rectFits(d, { x: 0, y: 1, w: 4, h: 1 })).toBe(false)
  })
  it('grows spanning frames and shifts later ones when inserting a track', () => {
    const d = design()
    insertTrack(d, 'columns', 1)
    expect(d.grid.columns).toHaveLength(4)
    expect(d.frames[0].rect).toEqual({ x: 0, y: 0, w: 3, h: 1 })
    expect(d.frames[1].rect).toEqual({ x: 3, y: 0, w: 1, h: 2 })
  })
  it('deletes frames only inside a removed track and shrinks spanning ones', () => {
    const d = design()
    removeTrack(d, 'columns', 2)
    expect(d.frames.map((f) => f.id)).toEqual(['a'])
    removeTrack(d, 'columns', 0)
    expect(d.frames[0].rect).toEqual({ x: 0, y: 0, w: 1, h: 1 })
  })
  it('never removes the last track', () => {
    const d = design()
    setTracks(d, 'rows', ['1fr'])
    removeTrack(d, 'rows', 0)
    expect(d.grid.rows).toEqual(['1fr'])
  })
})

describe('area names', () => {
  it('validates identifiers, reserved words and uniqueness', () => {
    const d = design()
    expect(areaNameError('nav', d, 'a')).toBeNull()
    expect(areaNameError('b', d, 'a')).toMatch(/Already/)
    expect(areaNameError('1st', d, 'a')).toBeTruthy()
    expect(areaNameError('auto', d, 'a')).toMatch(/reserved/)
  })
})

describe('normalizeDesign', () => {
  it('round-trips the starter design', () => {
    const d = starterDesign()
    const n = normalizeDesign(JSON.parse(JSON.stringify(d)), ['greysmoke', 'navy'])
    expect(n.grid).toEqual(d.grid)
    expect(n.frames.map((f) => [f.area, f.rect, f.type, f.modifiers])).toEqual(
      d.frames.map((f) => [f.area, f.rect, f.type, f.modifiers]),
    )
  })
  it('drops overlapping and out-of-grid frames, and cleans bad values', () => {
    const n = normalizeDesign({
      grid: { columns: ['1fr', 'nope'], rows: ['1fr'] },
      page: { theme: 'plaid', tokens: { '--pk-inner-radius': '1rem}' } },
      frames: [
        { area: 'a', rect: { x: 0, y: 0, w: 1, h: 1 }, type: 'weird', modifiers: ['mirror', 'x'] },
        { area: 'b', rect: { x: 0, y: 0, w: 2, h: 1 } },
        { area: 'c', rect: { x: 1, y: 0, w: 5, h: 1 } },
      ],
    }, ['greysmoke'])
    expect(n.grid.columns).toEqual(['1fr', '1fr'])
    expect(n.page.theme).toBe('greysmoke')
    expect(n.page.tokens).toEqual({})
    expect(n.frames).toHaveLength(1)
    expect(n.frames[0]).toMatchObject({ area: 'a', type: 'std', modifiers: ['mirror'] })
  })
  it('rejects things that are not designs', () => {
    expect(() => normalizeDesign({ hello: 1 })).toThrow()
  })
})
