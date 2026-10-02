// Keyboard shortcuts both tools share.

/** Fields that keep their own native undo, so Ctrl/Cmd+Z there isn't the tool's. */
const TEXT_FIELD = 'textarea, [contenteditable], input:not([type=checkbox], [type=radio], [type=range], [type=file], [type=color])'

/**
 * A keydown handler for undo (Ctrl/Cmd+Z) and redo (Shift+Ctrl/Cmd+Z, or Ctrl+Y), except in text
 * fields. For `<svelte:window onkeydown={...}>`.
 * @param {{ undo(): void, redo(): void }} target
 * @returns {(e: KeyboardEvent) => void}
 */
export function undoShortcuts(target) {
  return (e) => {
    const el = /** @type {Element | null} */ (e.target)
    if (!(e.metaKey || e.ctrlKey) || e.altKey || el?.matches?.(TEXT_FIELD)) return
    const key = e.key.toLowerCase()
    if (key === 'z') {
      e.preventDefault()
      if (e.shiftKey) target.redo()
      else target.undo()
    } else if (key === 'y' && e.ctrlKey) {
      e.preventDefault()
      target.redo()
    }
  }
}
