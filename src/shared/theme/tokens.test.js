import { describe, expect, it } from 'vitest'
import { declarations } from './css.js'
import { pkg, palette } from './fixtures.js'
import { TOKENS, bare, valueKind, varName } from './tokens.js'

describe('schema', () => {
  it('covers every token the default theme sets', () => {
    const set = Object.keys(declarations(pkg('themes/greysmoke.css')))
    const required = TOKENS.filter((t) => !t.optional).map((t) => t.name)
    expect(required.sort()).toEqual(set.sort())
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
  })
})
