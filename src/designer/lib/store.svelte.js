// App state: the design (the one JSON model) plus editor state: selection, history, files.
// Frames and tracks are edited with the functions in model.js, called on `store.design`.

import { strToU8, zipSync } from 'fflate'
import { untrack } from 'svelte'
import { themeNames, version } from 'virtual:protokuda'
import { download, saveFile } from '../../shared/files.js'
import { History } from '../../shared/history.svelte.js'
import { library } from '../../shared/library.svelte.js'
import { classCss } from '../../themer/lib/css.js'
import { indexHtml, layoutCss } from './markup.js'
import {
  fileBaseName, firstEmptyCell, newFrame, normalizeDesign, rectFits, starterDesign, usedThemes,
} from './model.js'

/** @typedef {import('./model.js').Design} Design */
/** @typedef {import('./model.js').Rect} Rect */

const STORAGE_KEY = 'pk-designer:design'

/** Theme names a design may use: the package's and the library's. */
const knownThemes = () => [...themeNames, ...Object.keys(library.themes)]

function loadAutosave() {
  try {
    const json = localStorage.getItem(STORAGE_KEY)
    return json ? normalizeDesign(JSON.parse(json), knownThemes()) : null
  } catch {
    return null
  }
}

/** For the file pickers. @type {import('../../shared/files.js').FileType} */
export const DESIGN_FILE = { description: 'Protokuda Studio design', accept: { 'application/json': ['.json'] } }

class Store {
  design = $state(loadAutosave() ?? starterDesign())
  /** @type {string | null} */
  selectedId = $state(null)

  selected = $derived(this.design.frames.find((f) => f.id === this.selectedId) ?? null)

  /** The library themes the design uses (built-ins come from protokuda.css). */
  customThemes = $derived(
    usedThemes(this.design).flatMap((name) => (themeNames.includes(name) ? [] : library.themes[name] ?? [])),
  )

  history = new History()

  /**
   * The file the design came from or was last saved to, where the browser lets Save write back.
   * @type {import('../../shared/files.js').FileHandle | null}
   */
  fileHandle = null

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

  /**
   * @param {Design} design
   * @param {import('../../shared/files.js').FileHandle | null} [handle]  the file it came from
   */
  replace(design, handle = null) {
    this.design = design
    this.selectedId = null
    this.fileHandle = handle
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

  /**
   * Save the design as `<title>-v<version>.json`, carrying copies of its custom themes so it opens
   * anywhere. Writes back to the open file while the name still matches; a new title or version
   * asks where to put the new file. Returns the name written, or null if it was downloaded or cancelled.
   */
  async saveJson() {
    const themes = Object.fromEntries(this.customThemes.map((t) => [t.name, t]))
    const file = this.customThemes.length ? { ...this.design, themes } : this.design
    const name = `${fileBaseName(this.design)}.json`
    const data = JSON.stringify(file, null, 2) + '\n'
    const handle = await saveFile({ name, data, type: DESIGN_FILE, handle: this.fileHandle })
    if (handle) this.fileHandle = handle
    return handle ? handle.name : null
  }

  /**
   * Open a design file. Themes it carries that the library lacks are added to the library;
   * where the library has a theme by the same name, the library's wins.
   * @param {File} file
   * @param {import('../../shared/files.js').FileHandle | null} [handle]  for saving back to it
   * @returns {Promise<{ added: string[], differed: string[] }>}
   */
  async openJson(file, handle = null) {
    const raw = JSON.parse(await file.text())
    normalizeDesign(raw) // throws if it isn't a design, before the library changes
    const merged = library.merge(raw.themes)
    this.replace(normalizeDesign(raw, knownThemes()), handle)
    return merged
  }

  /**
   * One zip, ready to unzip and open: index.html and layout.css side by side, plus a
   * `<name>.css` for each custom theme, since the CDN only has the built-in ones.
   */
  exportZip() {
    const zip = zipSync({
      'index.html': strToU8(indexHtml(this.design, { version, themeFiles: this.customThemes.map((t) => t.name) })),
      'layout.css': strToU8(layoutCss(this.design)),
      ...Object.fromEntries(this.customThemes.map((t) => [`${t.name}.css`, strToU8(classCss(t, version))])),
    })
    download(`${fileBaseName(this.design)}.zip`, zip, 'application/zip')
  }
}

export const store = new Store()
export { themeNames, version }
