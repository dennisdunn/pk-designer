<script>
  import ContrastPanel from './components/ContrastPanel.svelte'
  import Preview from './components/Preview.svelte'
  import ThemePanel from './components/ThemePanel.svelte'
  import TokenRow from './components/TokenRow.svelte'
  import { GROUPS, fileBaseName } from './lib/theme.js'
  import { store, version } from './lib/store.svelte.js'

  let fileInput
  let message = $state('')

  $effect(() => {
    store.changed()
  })

  // Undo/redo shortcuts, except in text fields, which keep their own native undo.
  const TEXT_FIELD = 'textarea, [contenteditable], input:not([type=checkbox], [type=radio], [type=range], [type=file], [type=color])'

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

  async function open(e) {
    const file = e.currentTarget.files?.[0]
    e.currentTarget.value = ''
    if (!file) return
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

  async function copySource() {
    try {
      await store.copySource()
      message = `Copied the src/themes/${store.theme.name}.css source to the clipboard.`
    } catch {
      message = "Couldn't copy to the clipboard."
    }
  }
</script>

<svelte:window onkeydown={shortcuts} />

<header class="toolbar">
  <h1><span class="mark">Protokuda</span> Themer <span class="version">pk {version}</span></h1>
  <nav aria-label="Theme file">
    <button type="button" data-code="01-0001" title="Open a theme .css file" onclick={() => fileInput.click()}>Open</button>
    <input bind:this={fileInput} type="file" accept=".css,text/css" hidden onchange={open} />
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
    <button type="button" class="alt" data-code="03-0002"
      title="Copy the theme in protokuda's src/themes form" onclick={copySource}>Copy source</button>
  </nav>
  <p class="message" role="status">{message}</p>
</header>

<main class="workspace">
  <Preview />
  <aside class="inspector" aria-label="Inspector">
    <ThemePanel />
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
