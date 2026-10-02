<script>
  import { hasFileAccess, pickFile } from '../shared/files.js'
  import { launch } from '../shared/launch.svelte.js'
  import Toolbar from '../shared/Toolbar.svelte'
  import Canvas from './components/Canvas.svelte'
  import FramePanel from './components/FramePanel.svelte'
  import PagePanel from './components/PagePanel.svelte'
  import { emptyDesign } from './lib/model.js'
  import { DESIGN_FILE, store } from './lib/store.svelte.js'

  let fileInput
  let message = $state('')

  $effect(() => {
    store.changed()
  })

  // A design opened with the installed app.
  $effect(() => {
    const waiting = launch.design
    if (!waiting) return
    launch.design = null
    openFile(waiting.file, waiting.handle)
  })

  // Undo/redo shortcuts, except in text fields, which keep their own native undo.
  const TEXT_FIELD = 'textarea, [contenteditable], input:not([type=checkbox], [type=radio], [type=range], [type=file])'

  function shortcuts(e) {
    if (!(e.metaKey || e.ctrlKey) || e.altKey || e.target.matches?.(TEXT_FIELD)) return
    const key = e.key.toLowerCase()
    if (key === 'z') {
      e.preventDefault()
      if (e.shiftKey) store.redo()
      else store.undo()
    } else if (key === 'y' && e.ctrlKey) {
      e.preventDefault()
      store.redo()
    }
  }

  // No confirm(): New is undoable, and some browsers block dialogs (which would make New do nothing).
  function newDesign() {
    store.replace(emptyDesign())
    message = 'New design. Undo brings the previous one back.'
  }

  // With File System Access, the system picker, so Save can write back to the file; else a file input.
  async function open() {
    if (!hasFileAccess) return fileInput.click()
    try {
      const picked = await pickFile(DESIGN_FILE)
      if (picked) await openFile(picked.file, picked.handle)
    } catch (err) {
      message = `Couldn't open the file: ${err instanceof Error ? err.message : err}`
    }
  }

  function inputChanged(e) {
    const file = e.currentTarget.files?.[0]
    e.currentTarget.value = ''
    if (file) openFile(file)
  }

  /**
   * @param {File} file
   * @param {import('../shared/files.js').FileHandle | null} [handle]
   */
  async function openFile(file, handle = null) {
    try {
      const { added, differed } = await store.openJson(file, handle)
      message = [
        `Opened ${file.name}.`,
        added.length && `Added ${added.join(', ')} to your theme library.`,
        differed.length && `${differed.join(', ')} differ${differed.length === 1 ? 's' : ''} from your library's; using your library's.`,
      ].filter(Boolean).join(' ')
    } catch (err) {
      message = `Couldn't open ${file.name}: ${err instanceof Error ? err.message : err}`
    }
  }

  async function save() {
    try {
      const saved = await store.saveJson()
      if (saved) message = `Saved ${saved}.`
    } catch (err) {
      message = `Couldn't save: ${err instanceof Error ? err.message : err}`
    }
  }

  function addFrame() {
    message = store.addFrame() ? '' : 'No empty cell left. Add a row or column first.'
  }
</script>

<svelte:window onkeydown={shortcuts} />
<svelte:head><title>Designer · Protokuda Studio</title></svelte:head>

<Toolbar {message}>
  <nav aria-label="Design">
    <button type="button" data-code="01-0001" onclick={newDesign}>New</button>
    <button type="button" data-code="01-0002" onclick={open}>Open</button>
    <button type="button" data-code="01-0003" onclick={save}>Save</button>
    <input bind:this={fileInput} type="file" accept=".json,application/json" hidden onchange={inputChanged} />
  </nav>
  <nav aria-label="Edit">
    <button type="button" data-code="02-0002" aria-keyshortcuts="Control+Z Meta+Z" title="Undo (Ctrl/Cmd+Z)"
      disabled={!store.history.canUndo} onclick={() => store.undo()}>Undo</button>
    <button type="button" data-code="02-0003" aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z Control+Y"
      title="Redo (Shift+Ctrl/Cmd+Z)" disabled={!store.history.canRedo} onclick={() => store.redo()}>Redo</button>
    <button type="button" data-code="02-0001" onclick={addFrame}>Add frame</button>
  </nav>
  <nav aria-label="Export">
    <button type="button" class="alt" data-code="03-0001" title="Download index.html and layout.css as a zip"
      onclick={() => store.exportZip()}>Export</button>
  </nav>
</Toolbar>

<main class="workspace designer">
  <Canvas />
  <aside class="inspector" aria-label="Inspector">
    {#if store.selected}
      {#key store.selected.id}
        <FramePanel />
      {/key}
    {:else}
      <p class="hint panel">
        Drag across empty cells to draw a frame. Click a frame to select it; drag to move it, or use its
        handles to resize. With a frame focused: arrows move it, Shift+arrows resize, Delete removes it. Ctrl/Cmd+Z undoes.
      </p>
    {/if}
    <PagePanel />
  </aside>
</main>
