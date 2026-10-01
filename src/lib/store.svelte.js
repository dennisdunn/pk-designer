// App state: the design (the one JSON model) plus editor-only state like selection.

import { strToU8, zipSync } from 'fflate'
import { themes, version } from 'virtual:protokuda'
import { indexHtml, layoutCss } from './markup.js'
import {
  firstEmptyCell, insertTrack, newFrame, normalizeDesign, rectFits, removeTrack, starterDesign,
} from './model.js'

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

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'design'

class Store {
  design = $state(loadAutosave() ?? starterDesign())
  selectedId = $state(null)

  selected = $derived(this.design.frames.find((f) => f.id === this.selectedId) ?? null)

  autosave() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.design))
    } catch {
      // Private window or storage full: autosave is a convenience, carry on without it.
    }
  }

  select(id) {
    this.selectedId = id
  }

  replace(design) {
    this.design = design
    this.selectedId = null
  }

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

  deleteFrame(id) {
    this.design.frames = this.design.frames.filter((f) => f.id !== id)
    if (this.selectedId === id) this.selectedId = null
  }

  /** Move or resize a frame, only if the result is a valid placement. */
  setRect(id, rect) {
    const frame = this.design.frames.find((f) => f.id === id)
    if (!frame || !rectFits(this.design, rect, id)) return false
    frame.rect = rect
    return true
  }

  insertTrack(axis, index, size) {
    insertTrack(this.design, axis, index, size)
  }

  removeTrack(axis, index) {
    removeTrack(this.design, axis, index)
    if (this.selectedId && !this.selected) this.selectedId = null
  }

  saveJson() {
    download(`${slug(this.design.page.title)}.json`, JSON.stringify(this.design, null, 2) + '\n', 'application/json')
  }

  async openJson(file) {
    this.replace(normalizeDesign(JSON.parse(await file.text()), themes))
  }

  /** One zip with index.html and layout.css side by side, ready to unzip and open. */
  exportZip() {
    const zip = zipSync({
      'index.html': strToU8(indexHtml(this.design, { version })),
      'layout.css': strToU8(layoutCss(this.design)),
    })
    download(`${slug(this.design.page.title)}.zip`, zip, 'application/zip')
  }
}

export const store = new Store()
export { themes, version }
