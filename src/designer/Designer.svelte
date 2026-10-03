<script>
  import Toolbar from '../shared/Toolbar.svelte'
  import { undoShortcuts } from '../shared/shortcuts.js'
  import { status } from '../shared/status.svelte.js'
  import Canvas from './components/Canvas.svelte'
  import FramePanel from './components/FramePanel.svelte'
  import PagePanel from './components/PagePanel.svelte'
  import { store } from './lib/store.svelte.js'

  function addFrame() {
    status.message = store.addFrame() ? '' : 'No empty cell left. Add a row or column first.'
  }
</script>

<svelte:window onkeydown={undoShortcuts(store)} />
<svelte:head><title>Designer · Protokuda Studio</title></svelte:head>

<Toolbar history={store}>
  <button type="button" data-code="03-0001" onclick={addFrame}>Add frame</button>
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

<style>
  p.hint.panel {
    font-size: 0.9rem;
    line-height: 1.4;
    color: var(--ui-muted);
  }
</style>
