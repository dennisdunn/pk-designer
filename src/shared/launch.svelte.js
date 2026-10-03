// Files opened with the installed app ("Open with" on a .json or .css; the manifest's
// file_handlers, Chromium on desktop). They wait here for the shell, which opens them in the
// project like Open does.

/** @typedef {{ file: File, handle: import('./files.js').FileHandle }} Launched */

export const launch = $state({
  /** @type {Launched[]} */
  waiting: [],
})

/** Not in TypeScript's DOM types yet. @type {any} */
const launchQueue = 'launchQueue' in window ? window.launchQueue : null

launchQueue?.setConsumer(async (/** @type {any} */ params) => {
  for (const handle of params.files ?? []) {
    launch.waiting.push({ file: await handle.getFile(), handle })
  }
})
