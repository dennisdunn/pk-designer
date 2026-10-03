<script>
  // The theme library: themes kept in this browser for any project. Save the open theme into it,
  // add a saved one to this project, or delete one.
  import { library } from '../../shared/library.svelte.js'
  import { projectThemes } from '../../shared/themes.svelte.js'
  import { sameTheme } from '../../shared/theme/library.js'
  import { store } from '../lib/store.svelte.js'

  const theme = $derived(store.theme)
  const saved = $derived(theme && library.themes[theme.name])
  const status = $derived(
    !theme
      ? ''
      : !saved
        ? `${theme.name} isn't in your library yet.`
        : sameTheme(saved, theme)
          ? `${theme.name} is saved in your library.`
          : `${theme.name} has changed since you saved it.`,
  )

  /** Announcements for the buttons below. */
  let note = $state('')
  /** A theme whose Delete was pressed once; a second press deletes it. */
  let confirming = $state(/** @type {string | null} */ (null))

  function save() {
    if (!theme) return
    library.save(theme)
    note = `Saved ${theme.name} to your library, for any project.`
  }

  /** @param {string} name */
  function add(name) {
    const replaced = projectThemes.has(name)
    projectThemes.editing = projectThemes.add(library.themes[name])
    note = `${replaced ? 'Replaced the project’s' : 'Added'} ${name}${replaced ? ' with your library’s' : ' to the project'}. Undo brings the previous themes back.`
  }

  // No confirm(): some browsers block dialogs. The button asks again instead.
  /** @param {string} name */
  function remove(name) {
    if (confirming !== name) {
      confirming = name
      note = `Press Delete again to remove ${name} from your library.`
      return
    }
    library.remove(name)
    confirming = null
    note = `Deleted ${name} from your library. Projects that have it keep their copy.`
  }
</script>

<section class="panel" aria-labelledby="ins-library-heading">
  <h2 id="ins-library-heading">Library</h2>

  {#if theme}
    <p class="help summary">{status}</p>
    <div class="field">
      <button type="button" disabled={saved && sameTheme(saved, theme)} onclick={save}>Save to library</button>
    </div>
  {/if}

  {#if library.list.length}
    <ul class="library" aria-label="Your library">
      {#each library.list as t (t.name)}
        {@const inProject = projectThemes.get(t.name)}
        <li class:open={t.name === theme?.name}>
          <span class="name">{t.label} <code>{t.name}</code></span>
          <button type="button" class="small" disabled={inProject && sameTheme(inProject, t)}
            aria-label="{inProject ? 'Replace the project’s' : 'Add'} {t.name}{inProject ? '' : ' to the project'}"
            onclick={() => add(t.name)}>{inProject ? 'Replace' : 'Add'}</button>
          <button
            type="button"
            class="small danger"
            aria-label={confirming === t.name ? `Really delete ${t.name}?` : `Delete ${t.name}`}
            onclick={() => remove(t.name)}
            onblur={() => {
              if (confirming === t.name) confirming = null
            }}
          >
            {confirming === t.name ? 'Sure?' : 'Delete'}
          </button>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="help">Themes you save appear here, ready to add to any project.</p>
  {/if}
  <p class="help" role="status">{note}</p>
</section>

<style>
  /* One row per saved theme, the open one marked. */
  .library {
    margin: 0.75rem 0 0;
    padding: 0;
    list-style: none;
  }
  .library li {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 0.3rem;
    align-items: center;
    padding: 0.3rem 0 0.3rem 0.5rem;
    border-bottom: 1px solid var(--ui-line);
    border-left: 3px solid transparent;
  }
  .library li.open {
    border-left-color: var(--ui-primary);
  }
  .name {
    min-width: 0;
    overflow-wrap: anywhere;
  }
</style>
