<script>
  // The theme library: save the open theme for the designer to use, or edit or delete a saved one.
  import { library } from '../../shared/library.svelte.js'
  import { sameTheme } from '../../shared/theme/library.js'
  import { store } from '../lib/store.svelte.js'

  const theme = $derived(store.theme)
  const saved = $derived(library.themes[theme.name])
  const builtIn = $derived(library.isBuiltIn(theme.name))
  const status = $derived(
    builtIn
      ? `${theme.name} is a built-in theme's name. Rename yours to save it.`
      : !saved
        ? 'Not in your library yet.'
        : sameTheme(saved, theme)
          ? 'Saved. The designer has this version.'
          : 'Changed since you saved it.',
  )

  /** Announcements for the buttons below. */
  let note = $state('')
  /** A theme whose Delete was pressed once; a second press deletes it. */
  let confirming = $state(/** @type {string | null} */ (null))

  function save() {
    library.save(theme)
    note = `Saved ${theme.name}. The designer can use it now.`
  }

  /** @param {string} name */
  function edit(name) {
    store.replace($state.snapshot(library.themes[name]))
    note = `Editing ${name}. Undo brings the previous theme back.`
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
    note = `Deleted ${name}. Designs that use it show it as not in your library.`
  }
</script>

<section class="panel" aria-labelledby="ins-library-heading">
  <h2 id="ins-library-heading">Library</h2>

  <p class="help summary">{status}</p>
  <div class="field">
    <button type="button" disabled={builtIn || (saved && sameTheme(saved, theme))} onclick={save}>
      Save to library
    </button>
  </div>

  {#if library.list.length}
    <ul class="library" aria-label="Your themes">
      {#each library.list as t (t.name)}
        <li class:open={t.name === theme.name}>
          <span class="name">{t.label} <code>{t.name}</code> v{t.version}</span>
          <button type="button" class="small" aria-label="Edit {t.name}" onclick={() => edit(t.name)}>Edit</button>
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
    <p class="help">Saved themes appear here and in the designer's theme pickers.</p>
  {/if}
  <p class="help" role="status">{note}</p>
</section>
