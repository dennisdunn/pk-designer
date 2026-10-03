<script>
  // The open theme's label and name, resetting its colors, and how its contrast checks are doing.
  import { projectThemes } from '../../shared/themes.svelte.js'
  import { isValidName, nameFor } from '../../shared/theme/theme.js'
  import { store, themes } from '../lib/store.svelte.js'

  const theme = $derived(/** @type {import('../../shared/theme/theme.js').Theme} */ (store.theme))
  const failing = $derived(store.failing)

  let base = $state(Object.keys(themes)[0])
  /** Why the typed name can't be used, or ''. */
  let nameError = $state('')

  /** @param {string} value */
  function rename(value) {
    nameError = !isValidName(value)
      ? 'Lowercase letters, digits and hyphens, starting with a letter.'
      : !projectThemes.canUse(value, theme.name)
        ? `${value} is taken by ${themes[value] ? 'a built-in theme' : 'another of the project’s themes'}.`
        : ''
    if (!nameError) projectThemes.rename(theme.name, value)
  }

  // Typing a label suggests a name while the name still matches the old label.
  /** @param {Event & { currentTarget: HTMLInputElement }} e */
  function setLabel(e) {
    const value = e.currentTarget.value
    const suggested = nameFor(value)
    if (theme.name === nameFor(theme.label) && projectThemes.canUse(suggested, theme.name)) {
      projectThemes.rename(theme.name, suggested)
    }
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
      aria-invalid={Boolean(nameError)}
      aria-describedby="ins-name-help"
      oninput={(e) => rename(e.currentTarget.value.trim())}
    />
    <p id="ins-name-help" class="help" class:error={nameError}>
      {#if nameError}
        {nameError}
      {:else}
        File <code>{theme.name}.css</code>, class <code>pk-theme-{theme.name}</code>
      {/if}
    </p>
  </div>

  <div class="field">
    <label for="ins-base">Reset colors to</label>
    <div class="row">
      <select id="ins-base" bind:value={base}>
        {#each Object.values(themes) as t (t.name)}
          <option value={t.name}>{t.label}</option>
        {/each}
      </select>
      <button type="button" class="small" onclick={() => store.resetTo(base)}>Load</button>
    </div>
    <p class="help">Replaces every color with a copy of a built-in theme's; the geometry stays. Undo brings yours back.</p>
  </div>

  <p class="help summary" class:error={failing > 0}>
    {failing === 0 ? '✓ All contrast checks pass.' : `✗ ${failing} contrast ${failing === 1 ? 'check fails' : 'checks fail'}.`}
    <a href="#ins-contrast-heading">Contrast</a>
  </p>
</section>

<style>
  .row {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.4rem;
  }
</style>
