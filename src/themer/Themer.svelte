<script>
  import { takeFile } from '../shared/files.js'
  import { launch } from '../shared/launch.svelte.js'
  import { undoShortcuts } from '../shared/shortcuts.js'
  import { fileBaseName } from '../shared/theme/theme.js'
  import { GROUPS } from '../shared/theme/tokens.js'
  import Toolbar from '../shared/Toolbar.svelte'
  import ContrastPanel from './components/ContrastPanel.svelte'
  import LibraryPanel from './components/LibraryPanel.svelte'
  import Preview from './components/Preview.svelte'
  import PreviewPanel from './components/PreviewPanel.svelte'
  import ThemePanel from './components/ThemePanel.svelte'
  import TokenRow from './components/TokenRow.svelte'
  import { store } from './lib/store.svelte.js'

  let fileInput
  let message = $state('')

  $effect(() => {
    store.changed()
  })

  // A theme file opened with the installed app.
  $effect(() => {
    const waiting = launch.theme
    if (!waiting) return
    launch.theme = null
    openFile(waiting.file)
  })

  function inputChanged(e) {
    const file = takeFile(e)
    if (file) openFile(file)
  }

  /** @param {File} file */
  async function openFile(file) {
    try {
      await store.openCss(file)
      message = `Opened ${file.name}. Undo brings the previous theme back.`
    } catch (err) {
      message = `Couldn't open ${file.name}: ${err instanceof Error ? err.message : err}`
    }
  }

  function exportZip() {
    store.exportZip()
    message = `Exported ${fileBaseName(store.theme)}.zip.`
  }
</script>

<svelte:window onkeydown={undoShortcuts(store)} />
<svelte:head><title>Themer · Protokuda Studio</title></svelte:head>

<Toolbar {message}>
  <nav aria-label="Theme file">
    <button type="button" data-code="01-0001" title="Open a theme .css file" onclick={() => fileInput.click()}>Open</button>
    <input bind:this={fileInput} type="file" accept=".css,text/css" hidden onchange={inputChanged} />
  </nav>
  <nav aria-label="Edit">
    <button type="button" data-code="02-0001" aria-keyshortcuts="Control+Z Meta+Z" title="Undo (Ctrl/Cmd+Z)"
      disabled={!store.history.canUndo} onclick={() => store.undo()}>Undo</button>
    <button type="button" data-code="02-0002" aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z Control+Y"
      title="Redo (Shift+Ctrl/Cmd+Z)" disabled={!store.history.canRedo} onclick={() => store.redo()}>Redo</button>
  </nav>
  <nav aria-label="Export">
    <button type="button" class="alt" data-code="03-0001" title="Download the theme .css and a README as a zip"
      onclick={exportZip}>Export</button>
  </nav>
</Toolbar>

<main class="workspace themer">
  <Preview />
  <aside class="inspector" aria-label="Inspector">
    <ThemePanel />
    <LibraryPanel />
    <PreviewPanel />
    {#each GROUPS as group (group.name)}
      <section class="panel" aria-labelledby="grp-{group.name}">
        <h2 id="grp-{group.name}">{group.name}</h2>
        {#each group.tokens as token (token.name)}
          <TokenRow {token} />
        {/each}
      </section>
    {/each}
    <ContrastPanel />
  </aside>
</main>
