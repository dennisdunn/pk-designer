// Files opened with the installed app ("Open with" on a .json or .css; the manifest's
// file_handlers, Chromium on desktop). A .css goes to the themer, anything else to the designer;
// each view opens what's waiting for it, so its usual messages and undo apply.

/** @typedef {{ file: File, handle: import('./files.js').FileHandle }} Launched */

export const launch = $state({
  /** @type {Launched | null} */
  design: null,
  /** @type {Launched | null} */
  theme: null,
})

/** Not in TypeScript's DOM types yet. @type {any} */
const launchQueue = 'launchQueue' in window ? window.launchQueue : null

launchQueue?.setConsumer(async (/** @type {any} */ params) => {
  for (const handle of params.files ?? []) {
    const file = await handle.getFile()
    if (/\.css$/i.test(file.name)) {
      launch.theme = { file, handle }
      location.hash = '#/themer'
    } else {
      launch.design = { file, handle }
      location.hash = '#/designer'
    }
  }
})
