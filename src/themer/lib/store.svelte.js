// App state: the theme being edited (one of the project's themes, src/shared/themes.svelte.js)
// plus editor state: history over the project's themes, and preview options. Files are the
// project's (src/shared/project.svelte.js).

// `version` is the Protokuda package's; `pkVersion` keeps it apart from the project's version.
import { knownTokens, palette, themes, version as pkVersion } from 'virtual:protokuda'
import { noteHistory } from '../../shared/autosave.js'
import { History } from '../../shared/history.svelte.js'
import { projectThemes } from '../../shared/themes.svelte.js'
import { freeName, startFrom } from '../../shared/theme/theme.js'
import { tokenDef } from '../../shared/theme/tokens.js'
import { contrastChecks } from './color.js'

/** @typedef {import('../../shared/theme/theme.js').Theme} Theme */

class Store {
  /** The theme being edited, or null when the project has none. */
  theme = $derived(projectThemes.get(projectThemes.editing))

  checks = $derived(this.theme ? contrastChecks(this.theme, palette) : [])
  failing = $derived(this.checks.filter((c) => !c.pass).length)

  /** Preview-only settings; not part of the theme. */
  preview = $state({ alert: false })

  /** Undo covers the project's themes: their tokens, names, which exist and which is open. */
  history = new History()

  /** Call from an effect: reads all the project's themes, so it runs on every change. */
  changed() {
    noteHistory(this.history, JSON.stringify({ list: projectThemes.list, editing: projectThemes.editing }))
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
    const { list, editing } = JSON.parse(json)
    projectThemes.replaceAll(list, editing)
  }

  /** A new project theme, copied from a built-in one, and open it. @param {string} name */
  create(name) {
    const theme = startFrom(themes[name])
    theme.name = freeName(theme.name, (n) => !projectThemes.canUse(n))
    projectThemes.editing = projectThemes.add(theme)
    return theme.name
  }

  /** Replace the open theme's colors with a copy of a built-in theme's; its geometry stays. @param {string} name */
  resetTo(name) {
    if (!this.theme) return
    const geometry = Object.entries(this.theme.tokens).filter(([k]) => tokenDef(k)?.kind === 'length')
    this.theme.tokens = { ...themes[name].tokens, ...Object.fromEntries(geometry) }
  }
}

export const store = new Store()

/** Whether the installed protokuda.css knows a token (geometry tokens newer than it are hidden). */
export const supported = (/** @type {string} */ name) => knownTokens.includes(name)

export { palette, pkVersion, themes }
