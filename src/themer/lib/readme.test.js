import { describe, expect, it } from 'vitest'
import { fill, readme } from './readme.js'

describe('readme', () => {
  const t = { name: 'ember', label: 'Ember', version: 3, tokens: {} }

  it('fills every placeholder', () => {
    const md = readme(t, '3.0.1')
    expect(md).not.toMatch(/\{\{/)
    expect(md).toMatch(/^# Ember\n/)
    expect(md).toContain('version 3')
    expect(md).toContain('https://cdn.jsdelivr.net/npm/protokuda@3.0.1/dist/protokuda.min.css')
    expect(md).toContain('href="ember.css"')
    expect(md).toContain('pk-theme-ember')
  })

  it('refuses a placeholder it has no value for', () => {
    expect(() => fill('{{nope}}', {})).toThrow('{{nope}}')
  })
})
