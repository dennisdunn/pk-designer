// Test fixtures: the installed protokuda package's built files. Tests only; not bundled.

import { readFileSync } from 'node:fs'
import { paletteFrom } from './css.js'

/** A file from protokuda's dist/, e.g. `themes/lilac.css`. */
export const pkg = (/** @type {string} */ file) =>
  readFileSync(new URL(`../../../node_modules/protokuda/dist/${file}`, import.meta.url), 'utf8')

export const palette = paletteFrom(pkg('protokuda.css'))
