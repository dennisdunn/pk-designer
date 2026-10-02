// App state: the theme (the one model) plus editor state: history and preview options.
// The theme file is the save format, so Open reads the same CSS that Export writes.

import { strToU8, zipSync } from 'fflate'
import { untrack } from 'svelte'
// `version` is the Protokuda package's; `pkVersion` keeps it apart from a theme's own version.
import { palette, themes, version as pkVersion } from 'virtual:protokuda'
import { contrastChecks } from './color.js'
import { parseTheme, sourceCss, themeCss } from './css.js'
import { download } from '../../shared/files.js'
import { History } from '../../shared/history.svelte.js'
import { readme } from './readme.js'
import { completeTheme, fileBaseName, isValidName, startFrom } from './theme.js'

/** @typedef {import('./theme.js').Theme} Theme */

const STORAGE_KEY = 'pk-themer:theme'
/** The library's default; fills in tokens a loaded file leaves out. */
const BASE = themes.greysmoke?.tokens ?? Object.values(themes)[0].tokens

/** The first theme a new visitor sees. */
const FIRST = themes.goldentanoi ?? Object.values(themes)[0]

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

class Store {
  /** @type {Theme} */
  theme = $state(loadAutosave() ?? startFrom(FIRST))

  checks = $derived(contrastChecks(this.theme, palette))
  failing = $derived(this.checks.filter((c) => !c.pass).length)

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

  /** Replace the theme with a copy of a built-in one. @param {string} name */
  startFrom(name) {
    this.replace(startFrom(themes[name]))
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
      [`${this.theme.name}.css`]: strToU8(themeCss(this.theme, pkVersion)),
      'README.md': strToU8(readme(this.theme, pkVersion)),
    })
    download(`${fileBaseName(this.theme)}.zip`, zip, 'application/zip')
  }

  /** The protokuda `src/themes/` form, for adding the theme to the library. */
  async copySource() {
    await navigator.clipboard.writeText(sourceCss(this.theme))
  }
}

export const store = new Store()
export { palette, pkVersion, themes }
