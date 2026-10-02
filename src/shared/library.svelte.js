// The theme library, shared by both tools: the themer saves themes into it, the designer
// offers them beside the built-in ones. Kept in localStorage under its own key, and
// re-read when another window changes it.

import { palette, themeNames, themes as builtIns } from 'virtual:protokuda'
import { cleanTheme, readThemes, sameTheme } from '../themer/lib/library.js'

/** @typedef {import('../themer/lib/theme.js').Theme} Theme */

const STORAGE_KEY = 'pk-studio:themes'
/** The library's default theme; fills in tokens a saved theme lacks. */
const BASE = builtIns.greysmoke?.tokens ?? Object.values(builtIns)[0].tokens
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

  /**
   * Add themes carried in a design file that the library doesn't have yet. Where the library
   * already has a theme by that name, it wins. Returns the names added and the names that differed.
   * @param {any} raw  a design file's `themes`
   */
  merge(raw) {
    const added = []
    const differed = []
    for (const [name, theme] of Object.entries(readThemes(raw, PKG))) {
      const mine = this.themes[name]
      if (!mine) {
        this.themes[name] = theme
        added.push(name)
      } else if (!sameTheme(mine, theme)) differed.push(name)
    }
    if (added.length) this.#persist()
    return { added, differed }
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
