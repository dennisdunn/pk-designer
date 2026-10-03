// The Studio project: the one document both tools work on, saved as one `.json` file. It holds
// the design (the designer's) and the project's themes (themes.svelte.js), plus one title and
// version, which live in the design's page and name every file.
//
// The designer registers its part here (`setDesign`), so this module never imports a tool.
// New, Open, Save and Export are the toolbar's and act on the whole project; each tool's undo
// history covers its own part, so after New or Open either tool's Undo brings its part back.

import { strToU8, zipSync } from 'fflate'
import { version as pkVersion } from 'virtual:protokuda'
import { autosave } from './autosave.js'
import { download, saveFile } from './files.js'
import { readme } from './readme.js'
import { PROJECT_KEY } from './saved.js'
import { classCss, parseTheme } from './theme/css.js'
import { projectThemes, readProjectThemes } from './themes.svelte.js'

/** The file format. 1 was the designer's own file: a design with its library themes beside it. */
export const FORMAT = 2

/** For the file pickers. @type {import('./files.js').FileType} */
export const PROJECT_FILE = { description: 'Protokuda Studio project', accept: { 'application/json': ['.json'] } }

/** What Open takes: a project, an older design file, or a theme `.css` to add. */
export const OPEN_FILE = {
  description: 'Protokuda Studio project or theme',
  accept: { 'application/json': ['.json'], 'text/css': ['.css'] },
}

/**
 * The designer's part of the project.
 * @typedef {object} DesignPart
 * @property {{ title: string, version: number }} meta  the project's title and version (reactive)
 * @property {() => any} json  the design, as saved
 * @property {(raw: any) => void} check  throws if `raw` isn't a design, before anything changes
 * @property {(raw: any | null) => string[]} load  replace the design (null: a new one); returns notes
 * @property {(themeFiles: string[]) => Record<string, string>} files  the export's page files
 * @property {() => string[]} usedThemes  the project themes the design uses
 */

/** `Main Bridge`, 3 → `main-bridge-v3` */
export function baseName(/** @type {{ title: string, version: number }} */ meta) {
  const title = meta.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'project'
  return `${title}-v${meta.version}`
}

class Project {
  /** @type {DesignPart | null} */
  #design = null

  /**
   * The file the project came from or was last saved to, where the browser lets Save write back.
   * @type {import('./files.js').FileHandle | null}
   */
  fileHandle = null

  /** @param {DesignPart} part */
  setDesign(part) {
    this.#design = part
  }

  get #part() {
    if (!this.#design) throw new Error('the designer has not registered its part')
    return this.#design
  }

  get meta() {
    return this.#part.meta
  }

  get baseName() {
    return baseName(this.meta)
  }

  toJSON() {
    return {
      format: FORMAT,
      design: this.#part.json(),
      themes: $state.snapshot(projectThemes.list),
      editing: projectThemes.editing,
    }
  }

  /** Call from an effect: reads the whole project, so it runs on every change. */
  changed() {
    autosave(PROJECT_KEY, JSON.stringify(this.toJSON()))
  }

  /** No confirm(): New is undoable in each tool, and some browsers block dialogs. */
  newProject() {
    projectThemes.replaceAll([], '')
    this.#part.load(null)
    this.fileHandle = null
  }

  /**
   * Open a project file, a designer file from before projects, or a theme `.css` (added to the
   * project's themes, replacing one by the same name). Returns what to tell the user.
   * @param {File} file
   * @param {import('./files.js').FileHandle | null} [handle]  for saving back to it
   * @returns {Promise<{ message: string, theme: boolean }>}
   */
  async open(file, handle = null) {
    const text = await file.text()
    if (/\.css$/i.test(file.name)) {
      const parsed = parseTheme(text, file.name.replace(/(\.min)?\.css$/i, ''))
      const [theme] = readProjectThemes([parsed])
      if (!theme) throw new Error(`${parsed.name} is a built-in theme's name`)
      const replaced = projectThemes.has(theme.name)
      projectThemes.add(theme)
      projectThemes.editing = theme.name
      const what = replaced ? `Replaced the project's ${theme.name}` : `Added ${theme.name} to the project`
      return { message: `${what}. Undo brings the previous themes back.`, theme: true }
    }
    const raw = JSON.parse(text)
    const v2 = raw?.format === FORMAT
    const design = v2 ? raw.design : raw
    this.#part.check(design)
    projectThemes.replaceAll(readProjectThemes(raw.themes), v2 ? raw.editing : '')
    const notes = this.#part.load(design)
    this.fileHandle = handle
    return { message: [`Opened ${file.name}.`, ...notes].join(' '), theme: false }
  }

  /**
   * Save as `<title>-v<version>.json`. Writes back to the open file while the name still matches;
   * a new title or version asks where to put the new file. Where the browser can't or won't write
   * files, it's downloaded. Returns the file's name and whether it was downloaded, or null if
   * the user cancelled.
   * @returns {Promise<{ name: string, downloaded: boolean } | null>}
   */
  async save() {
    const name = `${this.baseName}.json`
    const data = JSON.stringify(this.toJSON(), null, 2) + '\n'
    const handle = await saveFile({ name, data, type: PROJECT_FILE, handle: this.fileHandle })
    if (handle === null) return null
    if (handle) this.fileHandle = handle
    return { name: handle ? handle.name : name, downloaded: !handle }
  }

  /**
   * One zip, ready to unzip and open: the page (index.html, layout.css), a class-only `<name>.css`
   * for each of the project's themes (the CDN only has the built-in ones), and a README.
   * Returns the zip's name.
   */
  exportZip() {
    const { title, version } = this.meta
    const stamp = { pkVersion, version }
    const used = this.#part.usedThemes()
    const page = this.#part.files(used)
    const themes = $state.snapshot(projectThemes.list)
    const themeFiles = Object.fromEntries(themes.map((t) => [`${t.name}.css`, classCss(t, stamp)]))
    const files = { ...page, ...themeFiles }
    const all = {
      ...files,
      'README.md': readme({ title, version, pkVersion, files: Object.keys(files), themes }),
    }
    const name = `${this.baseName}.zip`
    download(name, zipSync(Object.fromEntries(Object.entries(all).map(([k, v]) => [k, strToU8(v)]))), 'application/zip')
    return name
  }
}

export const project = new Project()
