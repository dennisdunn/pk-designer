// The project's own themes: the ones the themer edits and the designer offers beside the built-in
// ones. They travel in the project file. The library (library.svelte.js) is separate: themes kept
// in this browser for any project, copied in and out.

import { defaultTheme, palette, themeNames, themes as builtIns } from 'virtual:protokuda'
import { library } from './library.svelte.js'
import { legacy, savedProject } from './saved.js'
import { cleanTheme, readThemes } from './theme/library.js'
import { isValidName } from './theme/theme.js'

/** @typedef {import('./theme/theme.js').Theme} Theme */

/** The package's default theme's tokens; fill in tokens a loaded theme lacks. */
const BASE = builtIns[defaultTheme].tokens
const PKG = { base: BASE, palette, builtIn: themeNames }

/**
 * Valid themes from untrusted JSON (a project file's `themes`, a list or by name), cleaned.
 * @param {any} raw
 * @returns {Theme[]}
 */
export const readProjectThemes = (raw) => Object.values(readThemes(raw, PKG))

/** Theme names a design from before the project file uses: its page's and its frames'. */
function legacyNames(/** @type {any} */ design) {
  const names = [design?.page?.theme, ...(Array.isArray(design?.frames) ? design.frames.map((/** @type {any} */ f) => f?.theme) : [])]
  return names.filter((n) => typeof n === 'string' && n)
}

/**
 * The themes the project starts with: the autosaved project's, or (migrating) the old themer's
 * theme plus the library themes the old designer autosave used.
 * @returns {{ list: Theme[], editing: string }}
 */
function initial() {
  if (savedProject) {
    const list = readProjectThemes(savedProject.themes)
    const editing = list.some((t) => t.name === savedProject.editing) ? savedProject.editing : (list[0]?.name ?? '')
    return { list, editing }
  }
  const list = readProjectThemes([legacy.theme, ...legacyNames(legacy.design).map((n) => library.themes[n])].filter(Boolean))
  const unique = list.filter((t, i) => list.findIndex((u) => u.name === t.name) === i)
  return { list: unique, editing: unique[0]?.name ?? '' }
}

class ProjectThemes {
  #start = initial()
  /** In the order they were added. @type {Theme[]} */
  list = $state(this.#start.list)
  /** The name of the theme the themer edits, or '' when the project has none. */
  editing = $state(this.#start.editing)

  names = $derived(this.list.map((t) => t.name))

  /** @type {((from: string, to: string) => void)[]} */
  #renameListeners = []

  /** @param {string} name */
  get(name) {
    return this.list.find((t) => t.name === name) ?? null
  }

  /** @param {string} name */
  has(name) {
    return this.list.some((t) => t.name === name)
  }

  /** Whether `name` is free for a project theme: valid, not built-in, not another project theme's. */
  canUse(/** @type {string} */ name, /** @type {string} */ self = '') {
    return isValidName(name) && !themeNames.includes(name) && (name === self || !this.has(name))
  }

  /**
   * Add a clean copy of a theme, replacing the project's theme of the same name. Returns its name.
   * @param {Theme} theme
   */
  add(theme) {
    const clean = cleanTheme($state.snapshot(theme), BASE, palette)
    const i = this.list.findIndex((t) => t.name === clean.name)
    if (i >= 0) this.list[i] = clean
    else this.list.push(clean)
    return clean.name
  }

  /** @param {string} name */
  remove(name) {
    this.list = this.list.filter((t) => t.name !== name)
    if (this.editing === name) this.editing = this.list[0]?.name ?? ''
  }

  /**
   * Rename a project theme; whatever refers to it (the design) follows through `onRename`.
   * @param {string} from
   * @param {string} to
   */
  rename(from, to) {
    const theme = this.get(from)
    if (!theme || from === to || !this.canUse(to, from)) return false
    theme.name = to
    if (this.editing === from) this.editing = to
    for (const fn of this.#renameListeners) fn(from, to)
    return true
  }

  /** @param {(from: string, to: string) => void} fn */
  onRename(fn) {
    this.#renameListeners.push(fn)
  }

  /**
   * Copy a library theme into the project if the project doesn't have one by that name.
   * For the designer's pickers, which offer library themes too.
   * @param {string} name
   */
  adopt(name) {
    if (this.has(name) || !library.themes[name]) return false
    this.add(library.themes[name])
    return true
  }

  /**
   * Replace them all: New, Open, undo.
   * @param {Theme[]} list  already clean
   * @param {string} editing
   */
  replaceAll(list, editing) {
    this.list = list
    this.editing = list.some((t) => t.name === editing) ? editing : (list[0]?.name ?? '')
  }
}

export const projectThemes = new ProjectThemes()
