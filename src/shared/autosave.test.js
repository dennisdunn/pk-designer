import { afterEach, describe, expect, it, vi } from 'vitest'
import { autosave, loadAutosave } from './autosave.js'
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
  it('saves the JSON and notes it in the history', () => {
    const storage = fakeStorage()
    vi.stubGlobal('localStorage', storage)
    const history = new History()
    autosave('k', '{"n":1}', history)
    autosave('k', '{"n":2}', history)
    expect(storage.items.get('k')).toBe('{"n":2}')
    expect(history.canUndo).toBe(true)
  })

  it('still notes the change when storage refuses it', () => {
    vi.stubGlobal('localStorage', fakeStorage({ full: true }))
    const history = new History()
    autosave('k', '{"n":1}', history)
    autosave('k', '{"n":2}', history)
    expect(history.canUndo).toBe(true)
  })
})
