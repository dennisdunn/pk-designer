<script>
  import Canvas from './components/Canvas.svelte'
  import FramePanel from './components/FramePanel.svelte'
  import PagePanel from './components/PagePanel.svelte'
  import { starterDesign } from './lib/model.js'
  import { store, version } from './lib/store.svelte.js'

  let fileInput
  let message = $state('')

  $effect(() => {
    store.autosave()
  })

  function newDesign() {
    if (confirm('Start a new design? The current one will be replaced.')) store.replace(starterDesign())
  }

  async function open(e) {
    const file = e.currentTarget.files?.[0]
    e.currentTarget.value = ''
    if (!file) return
    try {
      await store.openJson(file)
      message = `Opened ${file.name}.`
    } catch (err) {
      message = `Couldn't open ${file.name}: ${err.message}`
    }
  }

  function addFrame() {
    message = store.addFrame() ? '' : 'No empty cell left. Add a row or column first.'
  }
</script>

<header class="toolbar">
  <h1><span class="mark">Protokuda</span> Designer <span class="version">pk {version}</span></h1>
  <nav aria-label="Design">
    <button type="button" data-code="01-0001" onclick={newDesign}>New</button>
    <button type="button" data-code="01-0002" onclick={() => fileInput.click()}>Open</button>
    <button type="button" data-code="01-0003" onclick={() => store.saveJson()}>Save</button>
    <input bind:this={fileInput} type="file" accept=".json,application/json" hidden onchange={open} />
  </nav>
  <nav aria-label="Edit">
    <button type="button" data-code="02-0001" onclick={addFrame}>Add frame</button>
  </nav>
  <nav aria-label="Export">
    <button type="button" class="alt" data-code="03-0001" onclick={() => store.exportHtml()}>index.html</button>
    <button type="button" class="alt" data-code="03-0002" onclick={() => store.exportCss()}>layout.css</button>
  </nav>
  <p class="message" role="status">{message}</p>
</header>

<main class="workspace">
  <Canvas />
  <aside class="inspector" aria-label="Inspector">
    {#if store.selected}
      {#key store.selected.id}
        <FramePanel />
      {/key}
    {:else}
      <p class="hint panel">
        Drag across empty cells to draw a frame. Click a frame to select it; drag to move it, or use its
        handles to resize. With a frame focused: arrows move it, Shift+arrows resize, Delete removes it.
      </p>
    {/if}
    <PagePanel />
  </aside>
</main>
