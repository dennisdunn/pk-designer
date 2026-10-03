// The project is autosaved to localStorage, and each tool's part of it is undoable. These keep the
// storage rules in one place.

import { untrack } from 'svelte'

/**
 * The document autosaved under `key`, passed through `read` (which validates it, and may throw
 * or return null to reject it). Null if there's none, or storage is unavailable.
 * @template T
 * @param {string} key
 * @param {(raw: any) => T | null} read
 * @returns {T | null}
 */
export function loadAutosave(key, read) {
  try {
    const json = localStorage.getItem(key)
    return json ? read(JSON.parse(json)) : null
  } catch {
    return null
  }
}

/**
 * Autosave a document's JSON. Call it from an effect that serializes the whole document, so it
 * runs on every change.
 * @param {string} key
 * @param {string} json
 */
export function autosave(key, json) {
  try {
    localStorage.setItem(key, json)
  } catch {
    // Private window or storage full: autosave is a convenience, carry on without it.
  }
}

/**
 * Note a state in an undo history. Call it from an effect that serializes the state; the history's
 * own writes are untracked.
 * @param {import('./history.svelte.js').History} history
 * @param {string} json
 */
export function noteHistory(history, json) {
  untrack(() => history.note(json))
}
