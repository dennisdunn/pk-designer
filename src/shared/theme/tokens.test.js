import { describe, expect, it } from 'vitest'
import { declarations } from './css.js'
import { pkg, palette } from './fixtures.js'
import { TOKENS, bare, isLength, sameLength, valueKind, varName } from './tokens.js'

describe('schema', () => {
  it('covers every token the default theme sets', () => {
    const set = Object.keys(declarations(pkg('themes/greysmoke.css')))
    const required = TOKENS.filter((t) => !t.optional).map((t) => t.name)
    expect(required.sort()).toEqual(set.sort())
  })

  it("lists geometry tokens protokuda.css reads", () => {
    const css = pkg('protokuda.css')
    const geometry = TOKENS.filter((t) => t.kind === 'length').map((t) => t.name)
    for (const name of geometry) expect(css, name).toContain(`var(${name}`)
  })
})

describe('values', () => {
  it('strips the prefix', () => {
    expect(bare('--pk-golden-tanoi')).toBe('golden-tanoi')
    expect(bare('golden-tanoi')).toBe('golden-tanoi')
  })

  it('reads var() references', () => {
    expect(varName(' var( --pk-lilac ) ')).toBe('--pk-lilac')
    expect(varName('#fff')).toBeNull()
  })

  it('tells the kinds of value apart', () => {
    expect(valueKind(undefined, palette)).toBe('unset')
    expect(valueKind('', palette)).toBe('unset')
    expect(valueKind('#FC6', palette)).toBe('custom')
    expect(valueKind('var(--pk-lilac)', palette)).toBe('palette')
    expect(valueKind('var(--pk-secondary-light)', palette)).toBe('token')
    expect(valueKind('var(--pk-nonesuch)', palette)).toBe('other')
    expect(valueKind('rgb(1 2 3)', palette)).toBe('other')
    expect(valueKind('var(--pk-inner-radius)', palette)).toBe('other')
  })

  it('takes only plain lengths for geometry', () => {
    for (const v of ['3px', '1.5rem', '.5em', '0']) expect(isLength(v), v).toBe(true)
    for (const v of ['', '1', '-1rem', '1rem;', 'calc(1rem)', '10%']) expect(isLength(v), v).toBe(false)
  })

  it('compares lengths however they are written', () => {
    expect(sameLength('.5rem', '0.5rem')).toBe(true)
    expect(sameLength('0rem', '0')).toBe(true)
    expect(sameLength('0.5rem', '0.5em')).toBe(false)
    expect(sameLength('1rem', '1.5rem')).toBe(false)
  })
})
