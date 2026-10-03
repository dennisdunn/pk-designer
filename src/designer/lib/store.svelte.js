// App state: the design (the designer's part of the project) plus editor state: selection, history.
// Frames and tracks are edited with the functions in model.js, called on `store.design`.
// Files are the project's (src/shared/project.svelte.js); this store registers the design with it.

import { rootTokens, themeNames, version } from 'virtual:protokuda'
import { noteHistory } from '../../shared/autosave.js'
import { History } from '../../shared/history.svelte.js'
import { project } from '../../shared/project.svelte.js'
import { legacy, savedProject } from '../../shared/saved.js'
import { projectThemes } from '../../shared/themes.svelte.js'
import { isLength, sameLength, tokenDef } from '../../shared/theme/tokens.js'
import { indexHtml, layoutCss } from './markup.js'
import {
  emptyDesign, firstEmptyCell, legacyTokens, newFrame, normalizeDesign, rectFits, starterDesign, usedThemes,
} from './model.js'

/** @typedef {import('./model.js').Design} Design */
/** @typedef {import('./model.js').Rect} Rect */

/** Theme names a design may use: the package's and the project's. */
const knownThemes = () => [...themeNames, ...projectThemes.names]

/**
 * An older design's page geometry now belongs in a theme: move it into the page theme if that's
 * one of the project's (where the theme doesn't set it already). Values equal to Protokuda's
 * defaults are dropped quietly. Returns what to tell the user.
 * @param {any} raw  the design as loaded
 * @param {string} pageTheme
 * @returns {string[]}
 */
function migrateTokens(raw, pageTheme) {
  const moving = Object.entries(legacyTokens(raw)).filter(
    ([k, v]) => tokenDef(k)?.kind === 'length' && isLength(v) && !sameLength(v, rootTokens[k] ?? ''),
  )
  if (!moving.length) return []
  const names = moving.map(([k]) => k).join(', ')
  const theme = projectThemes.get(pageTheme)
  if (!theme) return [`Page geometry (${names}) belongs in a theme now; ${pageTheme} is built-in, so it was left out.`]
  for (const [k, v] of moving) theme.tokens[k] ??= v
  return [`Moved the page geometry (${names}) into the ${pageTheme} theme.`]
}

/** The design the session starts with: the project autosave's, an older autosave's, or the example. */
function initialDesign() {
  const raw = savedProject ? savedProject.design : legacy.design
  if (raw) {
    try {
      const design = normalizeDesign(raw, knownThemes())
      if (!savedProject) migrateTokens(raw, design.page.theme)
      return design
    } catch {
      // Not a design after all: start over.
    }
  }
  return starterDesign()
}

class Store {
  design = $state(initialDesign())
  /** @type {string | null} */
  selectedId = $state(null)

  selected = $derived(this.design.frames.find((f) => f.id === this.selectedId) ?? null)

  /** The project themes the design uses (built-ins come from protokuda.css). */
  customThemes = $derived(usedThemes(this.design).flatMap((name) => projectThemes.get(name) ?? []))

  history = new History()

  constructor() {
    // A renamed project theme keeps its place in the design.
    projectThemes.onRename((from, to) => {
      if (this.design.page.theme === from) this.design.page.theme = to
      for (const f of this.design.frames) if (f.theme === from) f.theme = to
    })
    const store = this
    project.setDesign({
      // A getter: `design` is replaced wholesale on undo, New and Open.
      get meta() {
        return store.design.page
      },
      json: () => $state.snapshot(this.design),
      check: (raw) => void normalizeDesign(raw),
      load: (raw) => {
        if (raw === null) {
          this.#replace(emptyDesign())
          return []
        }
        const design = normalizeDesign(raw, knownThemes())
        const notes = migrateTokens(raw, design.page.theme)
        this.#replace(design)
        return notes
      },
      files: (themeFiles) => ({
        'index.html': indexHtml(this.design, { version, themeFiles }),
        'layout.css': layoutCss(this.design),
      }),
      usedThemes: () => this.customThemes.map((t) => t.name),
    })
  }

  /** Call from an effect: reads the whole design, so it runs on every change. */
  changed() {
    noteHistory(this.history, JSON.stringify(this.design))
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

  /** @param {Design} design */
  #replace(design) {
    this.design = design
    this.selectedId = null
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
}

export const store = new Store()
export { themeNames, version }
