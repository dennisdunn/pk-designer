import { describe, expect, it, vi } from 'vitest'
import { undoShortcuts } from './shortcuts.js'

/** A keydown on an element that does or doesn't match the text-field selector. */
function key(k, { meta = false, ctrl = false, shift = false, alt = false, inTextField = false } = {}) {
  return {
    key: k,
    metaKey: meta,
    ctrlKey: ctrl,
    shiftKey: shift,
    altKey: alt,
    target: { matches: (/** @type {string} */ sel) => inTextField && sel.includes('textarea') },
    preventDefault: vi.fn(),
  }
}

function setup() {
  const target = { undo: vi.fn(), redo: vi.fn() }
  const handle = undoShortcuts(target)
  return { target, press: (/** @type {any} */ e) => (handle(e), e) }
}

describe('undoShortcuts', () => {
  it('undoes on Ctrl+Z and Cmd+Z', () => {
    const { target, press } = setup()
    expect(press(key('z', { ctrl: true })).preventDefault).toHaveBeenCalled()
    press(key('Z', { meta: true }))
    expect(target.undo).toHaveBeenCalledTimes(2)
    expect(target.redo).not.toHaveBeenCalled()
  })

  it('redoes on Shift+Ctrl/Cmd+Z and on Ctrl+Y, not Cmd+Y', () => {
    const { target, press } = setup()
    press(key('z', { meta: true, shift: true }))
    press(key('y', { ctrl: true }))
    press(key('y', { meta: true }))
    expect(target.redo).toHaveBeenCalledTimes(2)
  })

  it('leaves text fields their own undo, and ignores Alt and plain keys', () => {
    const { target, press } = setup()
    const inField = press(key('z', { ctrl: true, inTextField: true }))
    press(key('z', { ctrl: true, alt: true }))
    press(key('z'))
    expect(inField.preventDefault).not.toHaveBeenCalled()
    expect(target.undo).not.toHaveBeenCalled()
  })
})
