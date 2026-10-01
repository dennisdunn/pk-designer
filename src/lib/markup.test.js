import { describe, expect, it } from 'vitest'
import { indexHtml, layoutCss, screenMarkup, templateAreas } from './markup.js'
import { starterDesign } from './model.js'

describe('export', () => {
  const d = starterDesign()

  it('builds aligned grid-template-areas with dots for empty cells', () => {
    const e = structuredClone(d)
    e.frames = e.frames.filter((f) => f.area !== 'status')
    expect(templateAreas(e)).toEqual(['"header header"', '"nav    main"', '"nav    ."'])
  })

  it('writes layout.css with tokens, tracks and one grid-area rule per frame', () => {
    const css = layoutCss(d)
    expect(css).toContain(':root {\n  --pk-inner-radius: 0rem;\n}')
    expect(css).toContain('grid-template-columns: 14rem 1fr;')
    expect(css).toContain('#nav {\n  grid-area: nav;\n}')
    expect(css).not.toMatch(/style=/)
  })

  it('scopes the preview CSS and matches frames by data-area', () => {
    const css = layoutCss(d, { scope: '.pv' })
    expect(css).toContain('.pv {\n  --pk-inner-radius')
    expect(css).toContain('.pv .pk-screen {')
    expect(css).toContain('.pv [data-area="nav"] {')
  })

  it('links protokuda at the given version, the font and layout.css, with no inline styles', () => {
    const html = indexHtml(d, { version: '9.8.7' })
    expect(html).toContain('https://cdn.jsdelivr.net/npm/protokuda@9.8.7/dist/protokuda.min.css')
    expect(html).toContain('family=Antonio')
    expect(html).toContain('href="layout.css"')
    expect(html).toContain('<meta name="version" content="1" />')
    expect(html).toContain('<html lang="en" class="pk-theme-greysmoke">')
    expect(html).not.toContain('style=')
  })

  it('renders frame classes and placeholder content, escaping text', () => {
    const e = structuredClone(d)
    const nav = e.frames.find((f) => f.area === 'nav')
    nav.modifiers = ['sidebar', 'statusline', 'mirror']
    nav.theme = 'navy'
    nav.status = 'A & B'
    nav.title = '<b>'
    const html = screenMarkup(e)
    expect(html).toContain('<div class="pk-frame pk-std pk-sidebar pk-statusline pk-mirror pk-theme-navy" id="nav">')
    expect(html).toContain('<button type="button" class="pk-button" data-code="47-1138">Course</button>')
    expect(html).toContain('<div class="pk-status">A &amp; B</div>')
    expect(html).toContain('<div class="pk-title">&lt;b&gt;</div>')
  })

  it('omits sidebar items and status when the modifier is off', () => {
    const e = structuredClone(d)
    const nav = e.frames.find((f) => f.area === 'nav')
    nav.modifiers = []
    nav.status = 'hidden'
    const html = screenMarkup(e)
    expect(html).not.toContain('pk-items')
    expect(html).not.toContain('pk-status')
  })

  it('marks the preview screen inert and puts alert on the screen', () => {
    const e = structuredClone(d)
    e.page.alert = true
    expect(screenMarkup(e, { preview: true })).toMatch(/^<div class="pk-screen pk-alert" inert>/)
  })
})
