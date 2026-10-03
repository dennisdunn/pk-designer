import { afterEach, describe, expect, it, vi } from 'vitest'
import { autosave, loadAutosave, noteHistory } from './autosave.js'
import { History } from './history.svelte.js'

/** An in-memory localStorage; `full` makes writes throw, as a full or blocked storage does. */
function fakeStorage({ full = false } = {}) {
  const items = new Map()
  return {
    getItem: (/** @type {string} */ k) => items.get(k) ?? null,
    setItem: (/** @type {string} */ k, /** @type {string} */ v) => {
      if (full) throw new DOMException('full', 'QuotaExceededError')
      items.set(k, v)
    },
    items,
  }
}

afterEach(() => vi.unstubAllGlobals())

describe('loadAutosave', () => {
  it('reads and validates the saved document', () => {
    vi.stubGlobal('localStorage', fakeStorage())
    localStorage.setItem('k', '{"n":2}')
    expect(loadAutosave('k', (raw) => raw.n * 10)).toBe(20)
  })

  it('is null with nothing saved, bad JSON, a rejected document, or no storage', () => {
    const storage = fakeStorage()
    vi.stubGlobal('localStorage', storage)
    expect(loadAutosave('k', (raw) => raw)).toBeNull()
    storage.items.set('k', '{not json')
    expect(loadAutosave('k', (raw) => raw)).toBeNull()
    storage.items.set('k', '{}')
    expect(loadAutosave('k', () => null)).toBeNull()
    expect(loadAutosave('k', () => { throw new Error('not a design') })).toBeNull()
    vi.stubGlobal('localStorage', undefined)
    expect(loadAutosave('k', (raw) => raw)).toBeNull()
  })
})

describe('autosave', () => {
  it('saves the JSON', () => {
    const storage = fakeStorage()
    vi.stubGlobal('localStorage', storage)
    autosave('k', '{"n":1}')
    autosave('k', '{"n":2}')
    expect(storage.items.get('k')).toBe('{"n":2}')
  })

  it('carries on when storage refuses it', () => {
    vi.stubGlobal('localStorage', fakeStorage({ full: true }))
    expect(() => autosave('k', '{"n":1}')).not.toThrow()
  })
})

describe('noteHistory', () => {
  it('notes each state in the history', () => {
    const history = new History()
    noteHistory(history, '{"n":1}')
    noteHistory(history, '{"n":2}')
    expect(history.canUndo).toBe(true)
  })
})
