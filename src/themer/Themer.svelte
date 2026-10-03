<script>
  import Toolbar from '../shared/Toolbar.svelte'
  import { undoShortcuts } from '../shared/shortcuts.js'
  import { GROUPS } from '../shared/theme/tokens.js'
  import ContrastPanel from './components/ContrastPanel.svelte'
  import GeometryRow from './components/GeometryRow.svelte'
  import LibraryPanel from './components/LibraryPanel.svelte'
  import Preview from './components/Preview.svelte'
  import PreviewPanel from './components/PreviewPanel.svelte'
  import ThemePanel from './components/ThemePanel.svelte'
  import ThemesPanel from './components/ThemesPanel.svelte'
  import TokenRow from './components/TokenRow.svelte'
  import { store, supported } from './lib/store.svelte.js'

  // Geometry first: a theme is what the frames look like, shape as well as color.
  const groups = [...GROUPS].sort((a, b) => Number(b.name === 'Geometry') - Number(a.name === 'Geometry'))
</script>

<svelte:window onkeydown={undoShortcuts(store)} />
<svelte:head><title>Themer · Protokuda Studio</title></svelte:head>

<Toolbar history={store} />

<main class="workspace themer">
  {#if store.theme}
    <Preview />
  {:else}
    <div class="stage empty">
      <p>This project has no themes of its own yet. Start one from a built-in theme in <a href="#ins-themes-heading">Themes</a>.</p>
    </div>
  {/if}
  <aside class="inspector" aria-label="Inspector">
    <ThemesPanel />
    {#if store.theme}
      <ThemePanel />
      {#each groups as group (group.name)}
        <section class="panel" aria-labelledby="grp-{group.name}">
          <h2 id="grp-{group.name}">{group.name}</h2>
          {#if group.name === 'Geometry'}
            <p class="help">Unset values follow Protokuda's defaults, or the page theme's when this theme is on one frame.</p>
          {/if}
          {#each group.tokens.filter((t) => supported(t.name)) as token (token.name)}
            {#if token.kind === 'length'}
              <GeometryRow {token} />
            {:else}
              <TokenRow {token} />
            {/if}
          {/each}
        </section>
      {/each}
      <PreviewPanel />
      <ContrastPanel />
    {/if}
    <LibraryPanel />
  </aside>
</main>
