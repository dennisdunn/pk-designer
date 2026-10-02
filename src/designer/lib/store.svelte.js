// App state: the design (the one JSON model) plus editor state: selection, history, files.
// Frames and tracks are edited with the functions in model.js, called on `store.design`.

import { strToU8, zipSync } from 'fflate'
import { untrack } from 'svelte'
import { themes, version } from 'virtual:protokuda'
import { History } from './history.svelte.js'
import { indexHtml, layoutCss } from './markup.js'
import {
  fileBaseName, firstEmptyCell, newFrame, normalizeDesign, rectFits, starterDesign,
} from './model.js'

/** @typedef {import('./model.js').Design} Design */
/** @typedef {import('./model.js').Rect} Rect */

const STORAGE_KEY = 'pk-designer:design'

function loadAutosave() {
  try {
    const json = localStorage.getItem(STORAGE_KEY)
    return json ? normalizeDesign(JSON.parse(json), themes) : null
  } catch {
    return null
  }
}

function download(filename, data, type) {
  const url = URL.createObjectURL(new Blob([data], { type }))
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

class Store {
  design = $state(loadAutosave() ?? starterDesign())
  /** @type {string | null} */
  selectedId = $state(null)

  selected = $derived(this.design.frames.find((f) => f.id === this.selectedId) ?? null)

  history = new History()

  /** Call from an effect: reads the whole design, so it runs on every change. */
  changed() {
    const json = JSON.stringify(this.design)
    untrack(() => {
      try {
        localStorage.setItem(STORAGE_KEY, json)
      } catch {
        // Private window or storage full: autosave is a convenience, carry on without it.
      }
      this.history.note(json)
    })
  }

  undo() {
    this.#restore(this.history.undo())
  }

  redo() {
    this.#restore(this.history.redo())
  }

  /** @param {string | null} json */
  #restore(json) {
    if (json === null) return
    this.design = JSON.parse(json)
  }

  /**
   * The id may outlive its frame (deleted, or undone away); `selected` is then null,
   * and the selection comes back if the frame does.
   * @param {string | null} id
   */
  select(id) {
    this.selectedId = id
  }

  /** @param {Design} design */
  replace(design) {
    this.design = design
    this.selectedId = null
  }

  /**
   * Add a frame at `rect`, or in the first empty cell. Returns null if there's no room.
   * @param {Rect | null} [rect]
   */
  addFrame(rect = null) {
    rect ??= (() => {
      const cell = firstEmptyCell(this.design)
      return cell && { ...cell, w: 1, h: 1 }
    })()
    if (!rect || !rectFits(this.design, rect)) return null
    const frame = newFrame(this.design, rect)
    this.design.frames.push(frame)
    this.selectedId = frame.id
    return frame
  }

  saveJson() {
    download(`${fileBaseName(this.design)}.json`, JSON.stringify(this.design, null, 2) + '\n', 'application/json')
  }

  /** @param {File} file */
  async openJson(file) {
    this.replace(normalizeDesign(JSON.parse(await file.text()), themes))
  }

  /** One zip with index.html and layout.css side by side, ready to unzip and open. */
  exportZip() {
    const zip = zipSync({
      'index.html': strToU8(indexHtml(this.design, { version })),
      'layout.css': strToU8(layoutCss(this.design)),
    })
    download(`${fileBaseName(this.design)}.zip`, zip, 'application/zip')
  }
}

export const store = new Store()
export { themes, version }
