import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { History } from './history.svelte.js'

describe('History', () => {
  let h
  beforeEach(() => {
    vi.useFakeTimers()
    h = new History({ groupMs: 500 })
    h.note('a')
  })
  afterEach(() => vi.useRealTimers())

  it('starts with nothing to undo', () => {
    expect(h.canUndo).toBe(false)
    expect(h.undo()).toBeNull()
  })

  it('undoes and redoes separate changes one at a time', () => {
    h.note('b')
    vi.advanceTimersByTime(600)
    h.note('c')
    expect(h.undo()).toBe('b')
    expect(h.undo()).toBe('a')
    expect(h.canUndo).toBe(false)
    expect(h.redo()).toBe('b')
    expect(h.redo()).toBe('c')
    expect(h.canRedo).toBe(false)
  })

  it('groups changes that arrive close together', () => {
    h.note('ab')
    vi.advanceTimersByTime(200)
    h.note('abc')
    vi.advanceTimersByTime(200)
    h.note('abcd')
    expect(h.undo()).toBe('a')
    expect(h.canUndo).toBe(false)
  })

  it('keeps a gesture in one step however long it takes', () => {
    h.begin()
    h.note('x1')
    vi.advanceTimersByTime(5000)
    h.note('x2')
    h.end()
    h.note('y')
    expect(h.undo()).toBe('x2')
    expect(h.undo()).toBe('a')
  })

  it('leaves no step for a group that ends where it started', () => {
    h.begin()
    h.note('moved')
    h.note('a')
    h.end()
    expect(h.canUndo).toBe(false)
  })

  it('ignores the restored state being reported back, and a new change clears redo', () => {
    h.note('b')
    expect(h.undo()).toBe('a')
    h.note('a') // the store reports the state it just restored
    expect(h.canRedo).toBe(true)
    h.note('z')
    expect(h.canRedo).toBe(false)
    expect(h.undo()).toBe('a')
  })

  it('caps the history', () => {
    const small = new History({ limit: 2, groupMs: 0 })
    small.note('0')
    for (const s of ['1', '2', '3']) {
      small.note(s)
      vi.advanceTimersByTime(1)
    }
    expect(small.undo()).toBe('2')
    expect(small.undo()).toBe('1')
    expect(small.undo()).toBeNull()
  })
})
