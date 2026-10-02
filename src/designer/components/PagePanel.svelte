<script>
  // Page-level settings: theme, tokens, and the grid tracks as text.
  import {
    DEFAULT_INNER_RADIUS, PAGE_TOKENS, fileBaseName, isValidLength, isValidTrack, setTracks, splitTracks,
  } from '../lib/model.js'
  import { store } from '../lib/store.svelte.js'
  import ThemeOptions from './ThemeOptions.svelte'

  const page = $derived(store.design.page)
  const grid = $derived(store.design.grid)
  const radius = $derived.by(() => {
    const set = page.tokens['--pk-inner-radius']
    return set === undefined ? DEFAULT_INNER_RADIUS : parseFloat(set) || 0
  })

  let gridError = $state({ columns: false, rows: false })

  function setVersion(e) {
    const n = Number(e.currentTarget.value)
    if (Number.isInteger(n) && n >= 1) page.version = n
    else e.currentTarget.value = String(page.version)
  }

  function setToken(name, e) {
    const value = e.currentTarget.value.trim()
    const ok = isValidLength(value)
    e.currentTarget.setAttribute('aria-invalid', String(!ok))
    if (!ok) return
    if (value) page.tokens[name] = value
    else delete page.tokens[name]
  }

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
    <label for="ins-page-title">Page title</label>
    <input id="ins-page-title" bind:value={page.title} autocomplete="off" />
  </div>

  <div class="field">
    <label for="ins-page-version">Version</label>
    <div class="version">
      <input
        id="ins-page-version"
        type="number"
        min="1"
        step="1"
        value={page.version}
        aria-describedby="ins-version-help"
        onchange={setVersion}
      />
      <button type="button" class="small" onclick={() => page.version++}>Next version</button>
    </div>
    <p id="ins-version-help" class="help">Save and Export filenames: <code class="filename">{fileBaseName(store.design)}</code></p>
  </div>

  <div class="field">
    <label for="ins-page-theme">Theme</label>
    <select id="ins-page-theme" bind:value={page.theme} aria-describedby="ins-page-theme-help">
      <ThemeOptions value={page.theme} />
    </select>
    <p id="ins-page-theme-help" class="help">Make your own in the <a href="#/themer">Themer</a> and save it to your library.</p>
  </div>

  <div class="field">
    <label for="ins-radius">Inner radius <output for="ins-radius">{radius}rem</output></label>
    <input
      id="ins-radius"
      type="range"
      min="0"
      max="3"
      step="0.25"
      value={radius}
      aria-describedby="ins-radius-help"
      oninput={(e) => (page.tokens['--pk-inner-radius'] = `${e.currentTarget.value}rem`)}
    />
    <p id="ins-radius-help" class="help">0 is the square prototype elbow; about 1.5rem is the LCARS curve.</p>
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

  <details>
    <summary>Geometry tokens</summary>
    {#each PAGE_TOKENS as t (t.name)}
      <div class="field">
        <label for="ins-{t.name}">{t.label} <code>{t.name}</code></label>
        <input
          id="ins-{t.name}"
          value={page.tokens[t.name] ?? ''}
          placeholder={t.placeholder}
          spellcheck="false"
          autocomplete="off"
          oninput={(e) => setToken(t.name, e)}
        />
      </div>
    {/each}
  </details>
</section>

<style>
  .panel > label.choice {
    margin-bottom: 0.75rem;
  }

  details summary {
    cursor: pointer;
    margin-bottom: 0.5rem;
  }
</style>
