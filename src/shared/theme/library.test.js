import { describe, expect, it } from 'vitest'
import { parseTheme } from './css.js'
import { pkg, palette } from './fixtures.js'
import { cleanTheme, mergeThemes, readThemes, sameTheme } from './library.js'

const base = parseTheme(pkg('themes/greysmoke.css')).tokens
const PKG = { base, palette, builtIn: ['greysmoke', 'lilac'] }
const ember = () => ({
  name: 'ember',
  label: 'Ember',
  version: 2,
  tokens: { ...base, '--pk-primary': '#f60', '--pk-accent': 'var(--pk-golden-tanoi)' },
})

describe('cleanTheme', () => {
  it('keeps hex colors and var()s of palette colors and tokens', () => {
    const t = { ...ember(), tokens: { ...ember().tokens, '--pk-button-bg': 'var(--pk-secondary-light)' } }
    expect(cleanTheme(t, base, palette)).toEqual(t)
  })

  it('drops anything else and fills it from the base, so it is safe in a <style>', () => {
    const t = ember()
    t.tokens['--pk-primary'] = 'red}</style><script>alert(1)</script>'
    t.tokens['--pk-accent'] = 'rgb(1, 2, 3)'
    const clean = cleanTheme(t, base, palette)
    expect(clean.tokens['--pk-primary']).toBe(base['--pk-primary'])
    expect(clean.tokens['--pk-accent']).toBe(base['--pk-accent'])
  })
})

describe('readThemes', () => {
  it('reads valid themes by name', () => {
    expect(readThemes({ ember: ember() }, PKG)).toEqual({ ember: ember() })
  })

  it('skips built-in names, bad names and things that are not themes', () => {
    const raw = {
      a: { ...ember(), name: 'lilac' },
      b: { ...ember(), name: 'Not A Name' },
      c: { ...ember(), label: 7 },
      d: { ...ember(), tokens: null },
      e: 'ember',
      f: null,
    }
    expect(readThemes(raw, PKG)).toEqual({})
  })

  it('reads nothing from something that is not an object', () => {
    expect(readThemes(null, PKG)).toEqual({})
    expect(readThemes('themes', PKG)).toEqual({})
  })
})

describe('sameTheme', () => {
  it('ignores token order', () => {
    const a = ember()
    const b = { ...ember(), tokens: Object.fromEntries(Object.entries(ember().tokens).reverse()) }
    expect(sameTheme(a, b)).toBe(true)
  })

  it('notices a changed token, label or version', () => {
    expect(sameTheme(ember(), { ...ember(), tokens: { ...ember().tokens, '--pk-primary': '#f61' } })).toBe(false)
    expect(sameTheme(ember(), { ...ember(), label: 'Embers' })).toBe(false)
    expect(sameTheme(ember(), { ...ember(), version: 3 })).toBe(false)
  })
})

describe('mergeThemes', () => {
  const lilac2 = () => ({ ...ember(), name: 'mylilac', label: 'My Lilac' })

  it('adds the themes the library lacks', () => {
    const { add, differed } = mergeThemes({ ember: ember() }, { ember: ember(), mylilac: lilac2() })
    expect(add).toEqual([lilac2()])
    expect(differed).toEqual([])
  })

  it("keeps the library's theme on a clash, and reports it only if they differ", () => {
    const changed = { ...ember(), version: 3 }
    expect(mergeThemes({ ember: ember() }, { ember: changed })).toEqual({ add: [], differed: ['ember'] })
    expect(mergeThemes({ ember: ember() }, { ember: ember() })).toEqual({ add: [], differed: [] })
  })

  it('does nothing with nothing incoming', () => {
    expect(mergeThemes({ ember: ember() }, {})).toEqual({ add: [], differed: [] })
  })
})
