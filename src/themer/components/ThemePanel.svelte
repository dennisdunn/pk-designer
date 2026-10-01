<script>
  // The theme's name and label, a starting point, and the preview options.
  import { contrastChecks, fileBaseName, isValidName, nameFor } from '../lib/theme.js'
  import { palette, startFrom, store, themes } from '../lib/store.svelte.js'

  const theme = $derived(store.theme)
  const failing = $derived(contrastChecks(theme, palette).filter((c) => !c.pass).length)

  let base = $state(Object.keys(themes)[0])
  let nameError = $state(false)

  function setName(e) {
    const value = e.currentTarget.value.trim()
    nameError = !isValidName(value)
    if (!nameError) theme.name = value
  }

  function setVersion(e) {
    const n = Number(e.currentTarget.value)
    if (Number.isInteger(n) && n >= 1) theme.version = n
    else e.currentTarget.value = String(theme.version)
  }

  // Typing a label suggests a name while the name still matches the old label.
  function setLabel(e) {
    const value = e.currentTarget.value
    if (theme.name === nameFor(theme.label) && isValidName(nameFor(value))) theme.name = nameFor(value)
    theme.label = value
  }
</script>

<section class="panel" aria-labelledby="ins-theme-heading">
  <h2 id="ins-theme-heading">Theme</h2>

  <div class="field">
    <label for="ins-label">Label</label>
    <input id="ins-label" value={theme.label} autocomplete="off" oninput={setLabel} />
  </div>

  <div class="field">
    <label for="ins-name">Name</label>
    <input
      id="ins-name"
      value={theme.name}
      spellcheck="false"
      autocomplete="off"
      aria-invalid={nameError}
      aria-describedby="ins-name-help"
      oninput={setName}
    />
    <p id="ins-name-help" class="help" class:error={nameError}>
      {#if nameError}
        Lowercase letters, digits and hyphens, starting with a letter.
      {:else}
        File <code>{theme.name}.css</code>, class <code>pk-theme-{theme.name}</code>
      {/if}
    </p>
  </div>

  <div class="field">
    <label for="ins-version">Version</label>
    <div class="version">
      <input
        id="ins-version"
        type="number"
        min="1"
        step="1"
        value={theme.version}
        aria-describedby="ins-version-help"
        onchange={setVersion}
      />
      <button type="button" class="small" onclick={() => theme.version++}>Next version</button>
    </div>
    <p id="ins-version-help" class="help">Export filename: <code class="filename">{fileBaseName(theme)}.zip</code></p>
  </div>

  <div class="field">
    <label for="ins-base">Start from</label>
    <div class="row">
      <select id="ins-base" bind:value={base}>
        {#each Object.values(themes) as t (t.name)}
          <option value={t.name}>{t.label}</option>
        {/each}
      </select>
      <button type="button" class="small" onclick={() => store.replace(startFrom(base))}>Load</button>
    </div>
    <p class="help">Replaces every token with a copy of a built-in theme. Undo brings yours back.</p>
  </div>

  <p class="help summary" class:error={failing > 0}>
    {failing === 0 ? '✓ All contrast checks pass.' : `✗ ${failing} contrast ${failing === 1 ? 'check fails' : 'checks fail'}.`}
    <a href="#ins-contrast-heading">Contrast</a>
  </p>
</section>

<section class="panel" aria-labelledby="ins-preview-heading">
  <h2 id="ins-preview-heading">Preview</h2>
  <div class="field">
    <label for="ins-radius">Inner radius <output for="ins-radius">{store.preview.innerRadius}rem</output></label>
    <input id="ins-radius" type="range" min="0" max="3" step="0.25" bind:value={store.preview.innerRadius} />
  </div>
  <label class="choice">
    <input type="checkbox" bind:checked={store.preview.alert} />
    Alert (whole screen)
  </label>
  <p class="help">Preview settings only; they aren't part of the theme.</p>
</section>
