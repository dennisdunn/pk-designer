// Dragging the line between two tracks. Works in pixels, then writes the sizes back
// in each track's own unit so `1fr`s stay fractions and `14rem` stays rems.

import { parseTrack } from './model.js'

export const MIN_TRACK_PX = 16

const round = (n, step) => Math.round(n / step) * step
const fmt = (n, unit) => `${+n.toFixed(2)}${unit}`

/**
 * New sizes for tracks `i` and `i + 1` after moving the line between them by `delta` px.
 * - both `fr`: the two fractions are redistributed, their sum kept (other tracks don't move);
 * - one `fr`: only the fixed track changes and the `fr` track absorbs the difference;
 * - neither: both change. Sizes that aren't a simple number+unit (auto, minmax()) become px.
 * `pxA`/`pxB` are the tracks' rendered sizes; `fontSize` and `available` convert to rem/em and %.
 */
export function resizeTrackPair(tracks, i, pxA, pxB, delta, { fontSize = 16, available = 1000 } = {}) {
  const min = Math.min(MIN_TRACK_PX, pxA, pxB)
  delta = Math.max(min - pxA, Math.min(pxB - min, delta))
  const a = parseTrack(tracks[i])
  const b = parseTrack(tracks[i + 1])
  const newA = pxA + delta
  const newB = pxB - delta

  if (a?.unit === 'fr' && b?.unit === 'fr') {
    const total = a.n + b.n
    const fa = Math.min(total - 0.01, Math.max(0.01, round((total * newA) / (newA + newB), 0.01)))
    return [fmt(fa, 'fr'), fmt(total - fa, 'fr')]
  }

  const convert = (px, t) => {
    switch (t?.unit) {
      case 'rem':
      case 'em':
        return fmt(Math.max(0.25, round(px / fontSize, 0.25)), t.unit)
      case '%':
        return fmt(Math.max(0.5, round((px / available) * 100, 0.5)), '%')
      default:
        return fmt(Math.round(px), 'px')
    }
  }
  return [
    a?.unit === 'fr' ? tracks[i] : convert(newA, a),
    b?.unit === 'fr' ? tracks[i + 1] : convert(newB, b),
  ]
}
