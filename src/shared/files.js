// Opening and saving files. Where the browser has the File System Access API (Chromium on
// desktop), Open keeps a handle and Save writes back to the same file; elsewhere (Safari,
// Firefox, iPad) Open uses a file input and Save downloads.

/** @typedef {{ description: string, accept: Record<string, string[]> }} FileType */
/**
 * The File System Access API's handle; not in TypeScript's DOM types yet.
 * @typedef {{ name: string, getFile(): Promise<File>, createWritable(): Promise<any>, requestPermission?(o: object): Promise<string> }} FileHandle
 */

/**
 * Where the pickers come from: the window, or a stand-in in tests.
 * @typedef {{ showOpenFilePicker?: Function, showSaveFilePicker?: Function }} FileAccess
 */

/** @type {FileAccess} */
const browser = typeof window === 'undefined' ? {} : /** @type {any} */ (window)

const supports = (/** @type {FileAccess} */ api) => 'showOpenFilePicker' in api && 'showSaveFilePicker' in api

/** Whether Open and Save can use real files (and Save write back in place). */
export const hasFileAccess = supports(browser)

/** @param {unknown} err */
const cancelled = (err) => err instanceof DOMException && err.name === 'AbortError'

/**
 * The file chosen in a file input, clearing the input so that choosing the same file again still
 * fires `change`. For an input's `onchange`.
 * @param {Event} e
 * @returns {File | null}
 */
export function takeFile(e) {
  const input = /** @type {HTMLInputElement} */ (e.currentTarget)
  const file = input.files?.[0] ?? null
  input.value = ''
  return file
}

/**
 * Ask for a file with the system picker. Returns null if the user cancels.
 * Only where `hasFileAccess`; elsewhere use a file input.
 * @param {FileType} type
 * @param {FileAccess} [api]
 * @returns {Promise<{ file: File, handle: FileHandle } | null>}
 */
export async function pickFile(type, api = browser) {
  try {
    const [handle] = await /** @type {Function} */ (api.showOpenFilePicker)({ types: [type], excludeAcceptAllOption: false })
    return { file: await handle.getFile(), handle }
  } catch (err) {
    if (cancelled(err)) return null
    throw err
  }
}

/**
 * Save `data` as `name`. With File System Access: back to `handle` if it's that same file name,
 * else through the save picker; returns the handle written to, or null if the user cancelled.
 * Without it, downloads and returns undefined.
 * @param {{ name: string, data: BlobPart, type: FileType, handle?: FileHandle | null }} file
 * @param {FileAccess} [api]
 * @returns {Promise<FileHandle | null | undefined>}
 */
export async function saveFile({ name, data, type, handle = null }, api = browser) {
  const mime = Object.keys(type.accept)[0]
  if (!supports(api)) {
    download(name, data, mime)
    return undefined
  }
  try {
    let target = handle?.name === name ? handle : null
    if (target && (await target.requestPermission?.({ mode: 'readwrite' })) === 'denied') target = null
    target ??= /** @type {FileHandle} */ (await /** @type {Function} */ (api.showSaveFilePicker)({ suggestedName: name, types: [type] }))
    const out = await target.createWritable()
    await out.write(new Blob([data], { type: mime }))
    await out.close()
    return target
  } catch (err) {
    if (cancelled(err)) return null
    throw err
  }
}

/**
 * Download through a temporary link: for exports, and for saving without File System Access.
 * @param {string} filename
 * @param {BlobPart} data
 * @param {string} type
 */
export function download(filename, data, type) {
  const url = URL.createObjectURL(new Blob([data], { type }))
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
