<script>
  // The project's own themes: pick one to edit, start a new one from a built-in, or remove one.
  import { projectThemes } from '../../shared/themes.svelte.js'
  import { store, themes } from '../lib/store.svelte.js'

  let base = $state(Object.keys(themes)[0])
  /** Announcements for the buttons below. */
  let note = $state('')
  /** A theme whose Remove was pressed once; a second press removes it. */
  let confirming = $state(/** @type {string | null} */ (null))

  function create() {
    note = `Created ${store.create(base)}.`
  }

  // No confirm(): some browsers block dialogs. The button asks again instead.
  /** @param {string} name */
  function remove(name) {
    if (confirming !== name) {
      confirming = name
      note = `Press Remove again to take ${name} out of the project.`
      return
    }
    projectThemes.remove(name)
    confirming = null
    note = `Removed ${name}. Undo brings it back.`
  }
</script>

<section class="panel" aria-labelledby="ins-themes-heading">
  <h2 id="ins-themes-heading">Themes</h2>

  {#if projectThemes.list.length}
    <ul class="themes" aria-label="This project's themes">
      {#each projectThemes.list as t (t.name)}
        <li class:open={t.name === projectThemes.editing}>
          <button type="button" class="pick" aria-pressed={t.name === projectThemes.editing}
            onclick={() => (projectThemes.editing = t.name)}>{t.label} <code>{t.name}</code></button>
          <button
            type="button"
            class="small danger"
            aria-label={confirming === t.name ? `Really remove ${t.name}?` : `Remove ${t.name}`}
            onclick={() => remove(t.name)}
            onblur={() => {
              if (confirming === t.name) confirming = null
            }}
          >
            {confirming === t.name ? 'Sure?' : 'Remove'}
          </button>
        </li>
      {/each}
    </ul>
  {/if}

  <div class="field">
    <label for="ins-new-base">New theme from</label>
    <div class="row">
      <select id="ins-new-base" bind:value={base}>
        {#each Object.values(themes) as t (t.name)}
          <option value={t.name}>{t.label}</option>
        {/each}
      </select>
      <button type="button" class="small" onclick={create}>Create</button>
    </div>
    <p class="help">Themes travel in the project file. The designer offers them beside the built-in ones.</p>
  </div>
  <p class="help" role="status">{note}</p>
</section>

<style>
  .row {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.4rem;
  }
  .themes {
    margin: 0 0 0.75rem;
    padding: 0;
    list-style: none;
  }
  .themes li {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.3rem;
    align-items: center;
    padding: 0.2rem 0;
    border-bottom: 1px solid var(--ui-line);
  }
  /* The theme as a plain row button; the open one marked by a bar. */
  .themes button.pick {
    min-width: 0;
    padding: 0.3rem 0.5rem;
    text-transform: none;
    letter-spacing: normal;
    overflow-wrap: anywhere;
    color: var(--ui-text);
    background: none;
    border-left: 3px solid transparent;
  }
  .themes li.open button.pick {
    border-left-color: var(--ui-primary);
  }
</style>
