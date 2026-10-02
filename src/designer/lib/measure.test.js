import { describe, expect, it } from 'vitest'
import { measureGrid } from './measure.js'

/** A computed style: tracks as the browser reports them (px), with padding, border and gaps. */
const style = (o = {}) => ({
  gridTemplateColumns: '100px 200px',
  gridTemplateRows: '50px 60px 70px',
  columnGap: '10px',
  rowGap: '5px',
  paddingLeft: '24px',
  paddingRight: '24px',
  paddingTop: '24px',
  paddingBottom: '24px',
  borderLeftWidth: '0px',
  borderRightWidth: '0px',
  borderTopWidth: '0px',
  borderBottomWidth: '0px',
  ...o,
})

describe('measureGrid', () => {
  it('lays tracks out from the content edge with gaps between, relative to the canvas', () => {
    const m = measureGrid(style(), { left: 40, top: 30, width: 358, height: 238 }, { left: 10, top: 20 }, 16)
    // 40 - 10 + 24 padding = 54; 30 - 20 + 24 = 34.
    expect(m.cols).toEqual([{ start: 54, end: 154 }, { start: 164, end: 364 }])
    expect(m.rows).toEqual([{ start: 34, end: 84 }, { start: 89, end: 149 }, { start: 154, end: 224 }])
    expect(m).toMatchObject({ gapX: 10, gapY: 5, fontSize: 16 })
  })

  it('takes padding and border off the content box, on every side', () => {
    const s = style({ borderLeftWidth: '2px', borderRightWidth: '3px', borderTopWidth: '4px', borderBottomWidth: '5px' })
    const m = measureGrid(s, { left: 0, top: 0, width: 400, height: 300 }, { left: 0, top: 0 }, 16)
    expect(m.cols[0].start).toBe(26)
    expect(m.rows[0].start).toBe(28)
    expect(m.contentW).toBe(400 - 24 - 24 - 2 - 3)
    expect(m.contentH).toBe(300 - 24 - 24 - 4 - 5)
  })

  it('keeps fractional track sizes', () => {
    const m = measureGrid(style({ gridTemplateColumns: '120.5px 79.25px', columnGap: '0px', paddingLeft: '0px' }),
      { left: 0, top: 0, width: 200, height: 100 }, { left: 0, top: 0 }, 16)
    expect(m.cols).toEqual([{ start: 0, end: 120.5 }, { start: 120.5, end: 199.75 }])
  })
})
