import { describe, expect, it } from 'vitest'
import { resizeTrackPair } from './tracks.js'

describe('resizeTrackPair', () => {
  it('redistributes two fr tracks, keeping their sum', () => {
    expect(resizeTrackPair(['1fr', '1fr'], 0, 400, 400, 200)).toEqual(['1.5fr', '0.5fr'])
  })
  it('changes only the fixed track next to an fr track, in its own unit', () => {
    expect(resizeTrackPair(['14rem', '1fr'], 0, 224, 600, 32, { fontSize: 16 })).toEqual(['16rem', '1fr'])
    expect(resizeTrackPair(['1fr', '200px'], 0, 600, 200, 50)).toEqual(['1fr', '150px'])
  })
  it('changes both fixed tracks, turning auto into px', () => {
    expect(resizeTrackPair(['auto', '10%'], 0, 100, 100, 20, { available: 1000 })).toEqual(['120px', '8%'])
  })
  it('stops at a minimum size', () => {
    expect(resizeTrackPair(['100px', '100px'], 0, 100, 100, 500)).toEqual(['184px', '16px'])
  })
})
