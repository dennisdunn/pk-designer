import { describe, expect, it } from 'vitest'
import { classCss, classRule, parseTheme, rootDeclarations, sourceCss, themeCss } from './css.js'
import { pkg, palette } from './fixtures.js'
import { TOKENS } from './tokens.js'

describe('palette', () => {
  it('reads the named colors and none of the theme tokens', () => {
    expect(palette['golden-tanoi']).toBe('#fc6')
    expect(palette.black).toBe('#000')
    expect(Object.keys(palette).some((c) => TOKENS.some((t) => t.name === `--pk-${c}`))).toBe(false)
  })
})

describe('root declarations', () => {
  it("reads protokuda.css's :root values, not a theme class's", () => {
    const root = rootDeclarations(pkg('protokuda.css'))
    expect(root['--pk-primary']).toBe(parseTheme(pkg('themes/greysmoke.css')).tokens['--pk-primary'])
    expect(root['--pk-primary']).not.toBe(parseTheme(pkg('themes/lilac.css')).tokens['--pk-primary'])
  })

  it('reads nothing from CSS without a :root rule', () => {
    expect(rootDeclarations('.pk-theme-x { --pk-primary: #fff; }')).toEqual({})
  })
})

describe('parse and write', () => {
  it('reads a built theme file', () => {
    const t = parseTheme(pkg('themes/lilac.css'), 'lilac')
    expect(t.name).toBe('lilac')
    expect(t.tokens['--pk-primary']).toBe('var(--pk-lilac)')
  })

  it('round-trips through the exported file, version included', () => {
    const t = { ...parseTheme(pkg('themes/atomic.css'), 'atomic'), label: 'Atomic', version: 7 }
    const css = themeCss(t, '3.0.1')
    expect(css).toMatch(/^\/\*\*\nAtomic\nVersion 7\nMade with Protokuda Themer for Protokuda 3\.0\.1\n\*\//)
    expect(parseTheme(css, 'x')).toEqual(t)
  })

  it('writes a class-only file that leaves :root alone and reads back', () => {
    const t = { ...parseTheme(pkg('themes/atomic.css'), 'atomic'), name: 'ember', label: 'Ember', version: 2 }
    const css = classCss(t, '3.0.1')
    expect(css).not.toContain(':root')
    expect(css).toContain('@layer protokuda.theme {\n  .pk-theme-ember {')
    expect(parseTheme(css, 'x')).toEqual(t)
  })

  it('writes a bare class rule for previews, with no comment', () => {
    const t = { ...parseTheme(pkg('themes/atomic.css'), 'atomic'), name: 'ember', label: 'x */ y' }
    const css = classRule(t)
    expect(css).toMatch(/^@layer protokuda\.theme \{\n {2}\.pk-theme-ember \{/)
    expect(css).not.toContain('/*')
  })

  it("keeps a label from ending the header comment", () => {
    const t = { ...parseTheme(pkg('themes/atomic.css'), 'atomic'), label: 'A */ B' }
    expect(themeCss(t, '3.0.1')).toMatch(/^\/\*\*\nA \* \/ B\n/)
    expect(sourceCss(t)).toMatch(/^\/\*\*\nA \* \/ B\n/)
  })

  it('round-trips through the source form, which has no version', () => {
    const t = { ...parseTheme(pkg('themes/atomic.css'), 'atomic'), label: 'Atomic' }
    expect(parseTheme(sourceCss(t), 'x')).toEqual({ ...t, version: 1 })
  })

  it('reads a one-line header comment', () => {
    const t = parseTheme('/* Ember */ .pk-theme-ember { --pk-primary: #f60; }')
    expect(t.label).toBe('Ember')
    expect(t.version).toBe(1)
  })

  it('takes the name from the class, else the filename', () => {
    expect(parseTheme('.pk-theme-foo { --pk-primary: #fff; }', 'bar').name).toBe('foo')
    expect(parseTheme(':root { --pk-primary: #fff; }', 'My File').name).toBe('myfile')
  })

  it('rejects CSS with no theme tokens', () => {
    expect(() => parseTheme('body { color: red }')).toThrow()
  })
})
