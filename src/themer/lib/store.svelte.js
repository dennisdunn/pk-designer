// App state: the theme (the one model) plus editor state: history and preview options.
// The theme file is the save format, so Open reads the same CSS that Export writes.

import { strToU8, zipSync } from 'fflate'
import { untrack } from 'svelte'
import { palette, themes, version } from 'virtual:protokuda'
import { History } from './history.svelte.js'
import { completeTheme, fileBaseName, isValidName, parseTheme, readme, sourceCss, themeCss } from './theme.js'

/** @typedef {import('./theme.js').Theme} Theme */

const STORAGE_KEY = 'pk-themer:theme'
/** The library's default; fills in tokens a loaded file leaves out. */
const BASE = themes.greysmoke?.tokens ?? Object.values(themes)[0].tokens

/**
 * A copy of a built-in theme under a new name, as a starting point.
 * @param {string} from
 * @returns {Theme}
 */
export function startFrom(from) {
  return { name: `my${from}`, label: `My ${themes[from].label}`, version: 1, tokens: { ...themes[from].tokens } }
}

/** @returns {Theme | null} */
function loadAutosave() {
  try {
    const json = localStorage.getItem(STORAGE_KEY)
    if (!json) return null
    const t = JSON.parse(json)
    if (!isValidName(t.name) || typeof t.label !== 'string' || typeof t.tokens !== 'object') return null
    return completeTheme(t, BASE)
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
  /** @type {Theme} */
  theme = $state(loadAutosave() ?? startFrom(themes.goldentanoi ? 'goldentanoi' : Object.keys(themes)[0]))

  /** Preview-only settings; not part of the theme. */
  preview = $state({ alert: false, innerRadius: 0 })

  history = new History()

  /** Call from an effect: reads the whole theme, so it runs on every change. */
  changed() {
    const json = JSON.stringify(this.theme)
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
    this.theme = JSON.parse(json)
  }

  /** @param {Theme} theme */
  replace(theme) {
    this.theme = theme
  }

  /** @param {File} file */
  async openCss(file) {
    const theme = parseTheme(await file.text(), file.name.replace(/(\.min)?\.css$/, ''))
    this.replace(completeTheme(theme, BASE))
  }

  /** One zip: the theme file and a README on how to use it. The CSS keeps a stable name for linking. */
  exportZip() {
    const zip = zipSync({
      [`${this.theme.name}.css`]: strToU8(themeCss(this.theme, { version })),
      'README.md': strToU8(readme(this.theme, { version })),
    })
    download(`${fileBaseName(this.theme)}.zip`, zip, 'application/zip')
  }

  /** The protokuda `src/themes/` form, for adding the theme to the library. */
  async copySource() {
    await navigator.clipboard.writeText(sourceCss(this.theme))
  }
}

export const store = new Store()
export { palette, themes, version }
