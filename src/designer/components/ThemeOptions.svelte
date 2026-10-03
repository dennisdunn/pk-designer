<script>
  // A theme picker's options: the package's themes, the project's, then the library's that the
  // project doesn't have (choosing one copies it into the project: see `adopt`). A design can name
  // a theme the project no longer has (removed since); it stays selectable so the picker says so.
  import { library } from '../../shared/library.svelte.js'
  import { projectThemes } from '../../shared/themes.svelte.js'
  import { themeNames } from '../lib/store.svelte.js'

  /** @type {{ value: string }} */
  let { value } = $props()

  const fromLibrary = $derived(library.list.filter((t) => !projectThemes.has(t.name)))
  const missing = $derived(Boolean(value) && !themeNames.includes(value) && !projectThemes.has(value))
</script>

<optgroup label="Built-in">
  {#each themeNames as t (t)}
    <option value={t}>{t}</option>
  {/each}
</optgroup>
{#if projectThemes.list.length}
  <optgroup label="This project">
    {#each projectThemes.list as t (t.name)}
      <option value={t.name}>{t.name}</option>
    {/each}
  </optgroup>
{/if}
{#if fromLibrary.length}
  <optgroup label="Your library (adds to the project)">
    {#each fromLibrary as t (t.name)}
      <option value={t.name}>{t.name}</option>
    {/each}
  </optgroup>
{/if}
{#if missing}
  <option {value}>{value} (not in this project)</option>
{/if}
