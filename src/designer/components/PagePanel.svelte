<script>
  // Page-level settings: theme, alert, and the grid tracks as text. The title and version are the
  // project's, in the toolbar; geometry (edge widths, corners) is the theme's, in the themer.
  import { projectThemes } from '../../shared/themes.svelte.js'
  import { isValidTrack, setTracks, splitTracks } from '../lib/model.js'
  import { store } from '../lib/store.svelte.js'
  import ThemeOptions from './ThemeOptions.svelte'

  const page = $derived(store.design.page)
  const grid = $derived(store.design.grid)

  let gridError = $state({ columns: false, rows: false })

  // Applied on change (not every keystroke): dropping a track deletes frames inside it.
  function setTemplate(axis, e) {
    const sizes = splitTracks(e.currentTarget.value)
    const ok = sizes.length > 0 && sizes.every(isValidTrack)
    gridError[axis] = !ok
    if (ok) setTracks(store.design, axis, sizes)
  }
</script>

<section class="panel" aria-labelledby="ins-page-heading">
  <h2 id="ins-page-heading">Page</h2>

  <div class="field">
    <label for="ins-page-theme">Theme</label>
    <select id="ins-page-theme" bind:value={page.theme} aria-describedby="ins-page-theme-help"
      onchange={(e) => projectThemes.adopt(e.currentTarget.value)}>
      <ThemeOptions value={page.theme} />
    </select>
    <p id="ins-page-theme-help" class="help">
      Colors and frame shape, corners included. Make your own in the <a href="#/themer">Themer</a>.
    </p>
  </div>

  <label class="choice">
    <input type="checkbox" bind:checked={page.alert} />
    Alert (whole screen)
  </label>

  <fieldset>
    <legend>Grid tracks</legend>
    {#each [['columns', 'Columns'], ['rows', 'Rows']] as [axis, label] (axis)}
      <div class="field">
        <label for="ins-grid-{axis}">{label}</label>
        <input
          id="ins-grid-{axis}"
          value={grid[axis].join(' ')}
          spellcheck="false"
          autocomplete="off"
          aria-invalid={gridError[axis]}
          aria-describedby="ins-grid-help"
          onchange={(e) => setTemplate(axis, e)}
        />
      </div>
    {/each}
    <p id="ins-grid-help" class="help" class:error={gridError.columns || gridError.rows}>
      {gridError.columns || gridError.rows
        ? 'Each track needs a size like 1fr, 200px, 12rem, auto or minmax(8rem, 1fr).'
        : 'Space-separated sizes. Removing a track deletes frames that sit only in it.'}
    </p>
  </fieldset>
</section>

<style>
  .panel > label.choice {
    margin-bottom: 0.75rem;
  }
</style>
