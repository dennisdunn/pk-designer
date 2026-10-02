import { describe, expect, it } from 'vitest'
import { parseTheme } from '../../shared/theme/css.js'
import { pkg, palette } from '../../shared/theme/fixtures.js'
import { contrast, contrastChecks, resolve, wouldCycle } from './color.js'

describe('resolve', () => {
  const theme = {
    name: 't', label: 'T', version: 1,
    tokens: { '--pk-primary': 'var(--pk-lilac)', '--pk-button-bg': 'var(--pk-primary)', '--pk-text': '#ABC' },
  }
  it('follows palette and token references', () => {
    expect(resolve(theme, '--pk-button-bg', palette)).toBe('#cc99cc')
    expect(resolve(theme, '--pk-text', palette)).toBe('#aabbcc')
  })
  it('falls back for unset optional tokens', () => {
    expect(resolve(theme, '--pk-on-backdrop', palette)).toBe('#cc99cc')
  })
  it('returns null on a cycle', () => {
    const loop = { ...theme, tokens: { '--pk-primary': 'var(--pk-accent)', '--pk-accent': 'var(--pk-primary)' } }
    expect(resolve(loop, '--pk-primary', palette)).toBeNull()
  })
  it('spots a reference that would make a cycle', () => {
    expect(wouldCycle(theme, '--pk-primary', '--pk-button-bg')).toBe(true)
    expect(wouldCycle(theme, '--pk-primary', '--pk-text')).toBe(false)
    expect(wouldCycle(theme, '--pk-primary', '--pk-on-backdrop')).toBe(true)
  })
})

describe('contrast', () => {
  it('matches WCAG for black on white', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21)
    expect(contrast('#777777', '#ffffff')).toBeCloseTo(4.48, 2)
  })
  it('checks every pair of a library theme', () => {
    const checks = contrastChecks(parseTheme(pkg('themes/navy.css')), palette)
    expect(checks.every((c) => c.ratio !== null)).toBe(true)
  })
})
