import { describe, expect, it } from 'vitest'
import { fill, readme } from './readme.js'

describe('readme', () => {
  const ember = { name: 'ember', label: 'Ember', tokens: {} }
  const project = { title: 'Bridge', version: 3, pkVersion: '3.0.1', files: ['index.html', 'layout.css', 'ember.css'] }

  it('fills every placeholder', () => {
    const md = readme({ ...project, themes: [ember] })
    expect(md).not.toMatch(/\{\{/)
    expect(md).toMatch(/^# Bridge\n/)
    expect(md).toContain('version 3')
    expect(md).toContain('https://cdn.jsdelivr.net/npm/protokuda@3.0.1/dist/protokuda.min.css')
    expect(md).toContain('- `layout.css`')
    expect(md).toContain('href="ember.css"')
    expect(md).toContain('pk-theme-ember')
  })

  it('says so when the project has no themes of its own', () => {
    expect(readme({ ...project, themes: [] })).toContain("built-in themes")
  })

  it('refuses a placeholder it has no value for', () => {
    expect(() => fill('{{nope}}', {})).toThrow('{{nope}}')
  })
})
