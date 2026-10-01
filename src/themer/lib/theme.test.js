import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  TOKENS, completeTheme, contrast, contrastChecks, declarations, labelFor, nameFor, paletteFrom,
  parseTheme, resolve, sourceCss, themeCss, wouldCycle,
} from './theme.js'

const pkg = (f) => readFileSync(new URL(`../../node_modules/protokuda/dist/${f}`, import.meta.url), 'utf8')
const palette = paletteFrom(pkg('protokuda.css'))

describe('palette', () => {
  it('reads the named colors and none of the theme tokens', () => {
    expect(palette['golden-tanoi']).toBe('#fc6')
    expect(palette.black).toBe('#000')
    expect(Object.keys(palette).some((c) => TOKENS.some((t) => t.name === `--pk-${c}`))).toBe(false)
  })
})

describe('schema', () => {
  it('covers every token the default theme sets', () => {
    const set = Object.keys(declarations(pkg('themes/greysmoke.css')))
    const required = TOKENS.filter((t) => !t.optional).map((t) => t.name)
    expect(required.sort()).toEqual(set.sort())
  })
})

describe('parse and write', () => {
  it('reads a built theme file', () => {
    const t = parseTheme(pkg('themes/lilac.css'), 'lilac')
    expect(t.name).toBe('lilac')
    expect(t.tokens['--pk-primary']).toBe('var(--pk-lilac)')
  })

  it('round-trips through the exported file and the source form', () => {
    const t = { ...parseTheme(pkg('themes/atomic.css'), 'atomic'), label: 'Atomic' }
    expect(parseTheme(themeCss(t), 'x')).toEqual(t)
    expect(parseTheme(sourceCss(t), 'x')).toEqual(t)
  })

  it('takes the name from the class, else the filename', () => {
    expect(parseTheme('.pk-theme-foo { --pk-primary: #fff; }', 'bar').name).toBe('foo')
    expect(parseTheme(':root { --pk-primary: #fff; }', 'My File').name).toBe('myfile')
  })

  it('rejects CSS with no theme tokens', () => {
    expect(() => parseTheme('body { color: red }')).toThrow()
  })

  it('fills in missing tokens from a base, leaving optional ones unset', () => {
    const base = parseTheme(pkg('themes/greysmoke.css')).tokens
    const t = completeTheme({ name: 'x', label: 'X', tokens: { '--pk-primary': '#123456' } }, base)
    expect(t.tokens['--pk-primary']).toBe('#123456')
    expect(t.tokens['--pk-text']).toBe(base['--pk-text'])
    expect('--pk-on-backdrop' in t.tokens).toBe(false)
  })
})

describe('names', () => {
  it('labels themes named after palette colors', () => {
    expect(labelFor('goldentanoi', palette)).toBe('Golden Tanoi')
    expect(labelFor('greysmoke', palette)).toBe('Greysmoke')
  })
  it('makes a name from a label', () => {
    expect(nameFor('My Theme 2!')).toBe('mytheme2')
  })
})

describe('resolve', () => {
  const theme = {
    name: 't', label: 'T',
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
