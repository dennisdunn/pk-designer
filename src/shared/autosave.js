// Each tool's document is autosaved to localStorage and undoable. The stores keep the document in
// `$state`; these keep the storage rules in one place.

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
 * Autosave a document's JSON and note it in the undo history. Call it from the store's `changed()`,
 * which serializes the whole document inside an effect so it runs on every change; the writes
 * here are untracked.
 * @param {string} key
 * @param {string} json
 * @param {import('./history.svelte.js').History} history
 */
export function autosave(key, json, history) {
  untrack(() => {
    try {
      localStorage.setItem(key, json)
    } catch {
      // Private window or storage full: autosave is a convenience, carry on without it.
    }
    history.note(json)
  })
}
