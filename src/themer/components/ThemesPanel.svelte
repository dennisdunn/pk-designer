<script>
  // Which theme to edit, picked with the same options as the designer's theme pickers: a project
  // theme opens it, a built-in makes an editable copy, a library theme adds it to the project.
  // The open theme can be removed from the project here.
  import { themeNames } from 'virtual:protokuda'
  import ThemeOptions from '../../shared/ThemeOptions.svelte'
  import { projectThemes } from '../../shared/themes.svelte.js'
  import { store } from '../lib/store.svelte.js'

  /** Announcements for the controls below. */
  let note = $state('')
  /** Whether Remove was pressed once; a second press removes the theme. */
  let confirming = $state(false)

  /** @param {Event & { currentTarget: HTMLSelectElement }} e */
  function pick(e) {
    const name = e.currentTarget.value
    confirming = false
    if (themeNames.includes(name)) {
      note = `Made ${store.create(name)}, a copy of ${name}, to edit.`
    } else {
      if (projectThemes.adopt(name)) note = `Added ${name} from your library to the project.`
      else note = ''
      projectThemes.editing = name
    }
    // The select shows the open theme, which for a built-in is the new copy.
    e.currentTarget.value = projectThemes.editing
  }

  // No confirm(): some browsers block dialogs. The button asks again instead.
  function remove() {
    const name = projectThemes.editing
    if (!confirming) {
      confirming = true
      note = `Press Remove again to take ${name} out of the project.`
      return
    }
    projectThemes.remove(name)
    confirming = false
    note = `Removed ${name}. Undo brings it back.`
  }
</script>

<section class="panel" aria-labelledby="ins-themes-heading">
  <h2 id="ins-themes-heading">Themes</h2>

  <div class="field">
    <label for="ins-editing">Theme</label>
    <div class="row">
      <select id="ins-editing" value={projectThemes.editing} aria-describedby="ins-editing-help" onchange={pick}>
        {#if !store.theme}
          <option value="" disabled>Choose a theme…</option>
        {/if}
        <ThemeOptions value={projectThemes.editing} copies />
      </select>
      <button
        type="button"
        class="small danger"
        disabled={!store.theme}
        aria-label={confirming ? `Really remove ${projectThemes.editing}?` : `Remove ${projectThemes.editing} from the project`}
        onclick={remove}
        onblur={() => (confirming = false)}
      >
        {confirming ? 'Sure?' : 'Remove'}
      </button>
    </div>
    <p id="ins-editing-help" class="help">
      Pick one of the project's themes to edit. A built-in makes a copy to edit; a library theme is added
      to the project. The designer offers the same choices.
    </p>
  </div>
  <p class="help" role="status">{note}</p>
</section>

<style>
  .row {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.4rem;
  }
</style>
