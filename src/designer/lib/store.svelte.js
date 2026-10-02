// App state: the design (the one JSON model) plus editor state: selection, history, files.
// Frames and tracks are edited with the functions in model.js, called on `store.design`.

import { strToU8, zipSync } from 'fflate'
import { untrack } from 'svelte'
import { themeNames, version } from 'virtual:protokuda'
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

  /** The library themes the design uses (built-ins come from protokuda.css). */
  customThemes = $derived(
    usedThemes(this.design).flatMap((name) => (themeNames.includes(name) ? [] : library.themes[name] ?? [])),
  )

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

  /** The design file carries copies of its custom themes, so it opens anywhere. */
  saveJson() {
    const themes = Object.fromEntries(this.customThemes.map((t) => [t.name, t]))
    const file = this.customThemes.length ? { ...this.design, themes } : this.design
    download(`${fileBaseName(this.design)}.json`, JSON.stringify(file, null, 2) + '\n', 'application/json')
  }

  /**
   * Open a design file. Themes it carries that the library lacks are added to the library;
   * where the library has a theme by the same name, the library's wins.
   * @param {File} file
   * @returns {Promise<{ added: string[], differed: string[] }>}
   */
  async openJson(file) {
    const raw = JSON.parse(await file.text())
    normalizeDesign(raw) // throws if it isn't a design, before the library changes
    const merged = library.merge(raw.themes)
    this.replace(normalizeDesign(raw, knownThemes()))
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
