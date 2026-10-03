import { afterEach, describe, expect, it, vi } from 'vitest'
import { saveFile, takeFile } from './files.js'

const TYPE = { description: 'Design', accept: { 'application/json': ['.json'] } }

/** A file handle that records what's written to it. */
function handle(name, { permission = 'granted' } = {}) {
  const h = {
    name,
    written: /** @type {string[]} */ ([]),
    getFile: async () => new File([], name),
    requestPermission: vi.fn(async () => permission),
    createWritable: async () => {
      let data = ''
      return { write: async (/** @type {Blob} */ b) => (data = await b.text()), close: async () => h.written.push(data) }
    },
  }
  return h
}

/** Stand-in pickers. `pick` decides what the save picker returns (or throws). */
function api(pick = (/** @type {string} */ name) => handle(name)) {
  return {
    showOpenFilePicker: vi.fn(),
    showSaveFilePicker: vi.fn(async (/** @type {any} */ o) => pick(o.suggestedName)),
  }
}

const cancel = () => {
  throw new DOMException('The user aborted a request.', 'AbortError')
}

afterEach(() => vi.unstubAllGlobals())

describe('saveFile with File System Access', () => {
  it('writes back to the open file while the name matches, without a picker', async () => {
    const open = handle('bridge-v1.json')
    const fs = api()
    const saved = await saveFile({ name: 'bridge-v1.json', data: '{"v":1}', type: TYPE, handle: open }, fs)
    expect(saved).toBe(open)
    expect(open.written).toEqual(['{"v":1}'])
    expect(fs.showSaveFilePicker).not.toHaveBeenCalled()
  })

  it('asks where to save a new name, suggesting it, and writes there', async () => {
    const open = handle('bridge-v1.json')
    const fs = api()
    const saved = await saveFile({ name: 'bridge-v2.json', data: 'x', type: TYPE, handle: open }, fs)
    expect(fs.showSaveFilePicker).toHaveBeenCalledWith({ suggestedName: 'bridge-v2.json', types: [TYPE] })
    expect(saved?.name).toBe('bridge-v2.json')
    expect(open.written).toEqual([])
  })

  it('asks where to save when there is no open file, or write permission is denied', async () => {
    const fs = api()
    await saveFile({ name: 'a.json', data: 'x', type: TYPE }, fs)
    await saveFile({ name: 'a.json', data: 'x', type: TYPE, handle: handle('a.json', { permission: 'denied' }) }, fs)
    expect(fs.showSaveFilePicker).toHaveBeenCalledTimes(2)
  })

  it('returns null and writes nothing when the picker is cancelled', async () => {
    expect(await saveFile({ name: 'a.json', data: 'x', type: TYPE }, api(cancel))).toBeNull()
  })

  it('downloads instead when the browser refuses the picker or the write', async () => {
    const link = { click: vi.fn(), remove: vi.fn() }
    vi.stubGlobal('document', { createElement: () => link, body: { append: vi.fn() } })
    const refuse = (/** @type {string} */ kind) => () => {
      throw new DOMException('The request is not allowed.', kind)
    }
    expect(await saveFile({ name: 'a.json', data: 'x', type: TYPE }, api(refuse('NotAllowedError')))).toBeUndefined()
    const noWrite = { ...handle('b.json'), createWritable: refuse('SecurityError') }
    expect(await saveFile({ name: 'b.json', data: 'x', type: TYPE, handle: noWrite }, api())).toBeUndefined()
    expect(link.click).toHaveBeenCalledTimes(2)
    expect(link).toMatchObject({ download: 'b.json' })
  })

  it('passes other errors on', async () => {
    const fail = () => {
      throw new DOMException('Disk full.', 'QuotaExceededError')
    }
    await expect(saveFile({ name: 'a.json', data: 'x', type: TYPE }, api(fail))).rejects.toThrow('Disk full.')
  })
})

describe('saveFile without File System Access', () => {
  it('downloads the file and returns undefined', async () => {
    const link = { click: vi.fn(), remove: vi.fn() }
    vi.stubGlobal('document', { createElement: () => link, body: { append: vi.fn() } })
    expect(await saveFile({ name: 'a.json', data: 'x', type: TYPE }, {})).toBeUndefined()
    expect(link).toMatchObject({ download: 'a.json' })
    expect(link.click).toHaveBeenCalled()
  })
})

describe('takeFile', () => {
  it('returns the chosen file and clears the input, so choosing it again fires', () => {
    const file = new File([], 'a.json')
    const input = { files: [file], value: 'C:\\fakepath\\a.json' }
    expect(takeFile(/** @type {any} */ ({ currentTarget: input }))).toBe(file)
    expect(input.value).toBe('')
  })

  it('returns null when nothing was chosen', () => {
    expect(takeFile(/** @type {any} */ ({ currentTarget: { files: [], value: '' } }))).toBeNull()
  })
})
