// The theme library: themes kept in this browser for any project. The themer saves project themes
// into it and copies them back; the designer's pickers offer them, copying one into the project
// when it's chosen. Kept in localStorage under its own key, re-read when another window changes it.

import { defaultTheme, palette, themeNames, themes as builtIns } from 'virtual:protokuda'
import { cleanTheme, readThemes } from './theme/library.js'

/** @typedef {import('./theme/theme.js').Theme} Theme */

const STORAGE_KEY = 'pk-studio:themes'
/** The package's default theme's tokens; fill in tokens a saved theme lacks. */
const BASE = builtIns[defaultTheme].tokens
const PKG = { base: BASE, palette, builtIn: themeNames }

/** @returns {Record<string, Theme>} */
function load() {
  try {
    return readThemes(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}'), PKG)
  } catch {
    return {}
  }
}

class Library {
  /** By name. @type {Record<string, Theme>} */
  themes = $state(load())

  /** Sorted by name, for pickers and lists. */
  list = $derived(Object.values(this.themes).sort((a, b) => a.name.localeCompare(b.name)))

  constructor() {
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY) this.themes = load()
    })
  }

  /** Whether a name belongs to one of the package's themes, which the library can't hold. @param {string} name */
  isBuiltIn(name) {
    return themeNames.includes(name)
  }

  /** Add or replace a theme (by name). Stores a clean copy, so later edits don't leak in. @param {Theme} theme */
  save(theme) {
    if (this.isBuiltIn(theme.name)) throw new Error(`${theme.name} is a built-in theme`)
    this.themes[theme.name] = cleanTheme($state.snapshot(theme), BASE, palette)
    this.#persist()
  }

  /** @param {string} name */
  remove(name) {
    delete this.themes[name]
    this.#persist()
  }

  #persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.themes))
    } catch {
      // Private window or storage full: the library lasts until the page closes.
    }
  }
}

export const library = new Library()
