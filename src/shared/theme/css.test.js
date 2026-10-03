import { describe, expect, it } from 'vitest'
import { classCss, classRule, parseTheme, rootDeclarations, themeCss } from './css.js'
import { pkg, palette } from './fixtures.js'
import { TOKENS } from './tokens.js'

const STAMP = { pkVersion: '3.0.1', version: 7 }

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

  it("round-trips through the exported file, stamped with the project's version", () => {
    const t = { ...parseTheme(pkg('themes/atomic.css'), 'atomic'), label: 'Atomic' }
    const css = themeCss(t, STAMP)
    expect(css).toMatch(/^\/\*\*\nAtomic\nVersion 7\nMade with Protokuda Studio for Protokuda 3\.0\.1\n\*\//)
    expect(parseTheme(css, 'x')).toEqual(t)
  })

  it('writes and reads geometry after the colors', () => {
    const t = { ...parseTheme(pkg('themes/atomic.css'), 'atomic'), name: 'ember', label: 'Ember' }
    t.tokens['--pk-inner-radius'] = '1.5rem'
    t.tokens['--pk-end-radius'] = '0'
    const css = classCss(t, STAMP)
    expect(css).toMatch(/--pk-button-hover-fg: [^;]+;\n\n {4}--pk-end-radius: 0;\n {4}--pk-inner-radius: 1\.5rem;/)
    expect(parseTheme(css, 'x').tokens).toEqual(t.tokens)
  })

  it('writes a class-only file that leaves :root alone and reads back', () => {
    const t = { ...parseTheme(pkg('themes/atomic.css'), 'atomic'), name: 'ember', label: 'Ember' }
    const css = classCss(t, STAMP)
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
    expect(themeCss(t, STAMP)).toMatch(/^\/\*\*\nA \* \/ B\n/)
  })

  it('reads a theme in the library source form, which has no version', () => {
    const t = parseTheme('/**\nEmber\n*/\n.pk-theme-ember {\n  --pk-primary: #f60;\n}\n', 'x')
    expect(t).toEqual({ name: 'ember', label: 'Ember', tokens: { '--pk-primary': '#f60' } })
  })

  it('reads a one-line header comment', () => {
    const t = parseTheme('/* Ember */ .pk-theme-ember { --pk-primary: #f60; }')
    expect(t.label).toBe('Ember')
  })

  it('takes the name from the class, else the filename', () => {
    expect(parseTheme('.pk-theme-foo { --pk-primary: #fff; }', 'bar').name).toBe('foo')
    expect(parseTheme(':root { --pk-primary: #fff; }', 'My File').name).toBe('myfile')
  })

  it('rejects CSS with no theme tokens', () => {
    expect(() => parseTheme('body { color: red }')).toThrow()
  })
})
