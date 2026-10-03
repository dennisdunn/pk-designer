import { describe, expect, it } from 'vitest'
import { parseTheme, rootDeclarations } from './css.js'
import { pkg, palette } from './fixtures.js'
import { completeTheme, defaultThemeOf, freeName, labelFor, nameFor, startFrom } from './theme.js'

describe('names', () => {
  it('labels themes named after palette colors', () => {
    expect(labelFor('goldentanoi', palette)).toBe('Golden Tanoi')
    expect(labelFor('greysmoke', palette)).toBe('Greysmoke')
  })
  it('makes a name from a label', () => {
    expect(nameFor('My Theme 2!')).toBe('mytheme2')
  })
  it('finds a free name by numbering', () => {
    const taken = new Set(['mylilac', 'mylilac2'])
    expect(freeName('mylilac', (n) => taken.has(n))).toBe('mylilac3')
    expect(freeName('ember', (n) => taken.has(n))).toBe('ember')
  })
})

describe('default theme', () => {
  const themes = Object.fromEntries(
    ['atomic', 'greysmoke', 'lilac'].map((name) => [name, { ...parseTheme(pkg(`themes/${name}.css`), name), name }]),
  )

  it("is the theme protokuda.css's :root matches", () => {
    expect(defaultThemeOf(rootDeclarations(pkg('protokuda.css')), themes)).toBe('greysmoke')
  })

  it('is null when no theme matches', () => {
    expect(defaultThemeOf({ '--pk-primary': '#123456' }, themes)).toBeNull()
  })
})

describe('start from', () => {
  it('copies a built-in theme under a new name', () => {
    const lilac = { name: 'lilac', label: 'Lilac', tokens: { '--pk-primary': 'var(--pk-lilac)' } }
    const t = startFrom(lilac)
    expect(t).toEqual({ name: 'mylilac', label: 'My Lilac', tokens: lilac.tokens })
    t.tokens['--pk-primary'] = '#000'
    expect(lilac.tokens['--pk-primary']).toBe('var(--pk-lilac)')
  })
})

describe('complete', () => {
  const base = parseTheme(pkg('themes/greysmoke.css')).tokens

  it('fills in missing tokens from a base, leaving optional ones unset', () => {
    const t = completeTheme({ name: 'x', label: 'X', tokens: { '--pk-primary': '#123456' } }, base)
    expect(t.tokens['--pk-primary']).toBe('#123456')
    expect(t.tokens['--pk-text']).toBe(base['--pk-text'])
    expect('--pk-on-backdrop' in t.tokens).toBe(false)
    expect('--pk-inner-radius' in t.tokens).toBe(false)
  })

  it('drops unknown tokens', () => {
    const t = completeTheme({ name: 'x', label: 'X', tokens: { '--pk-nonesuch': '#fff' } }, base)
    expect('--pk-nonesuch' in t.tokens).toBe(false)
  })
})
