<script>
  // A theme picker's options, the same in both tools: the package's themes, the project's, then
  // the library's that the project doesn't have (choosing one adds it to the project: see
  // `projectThemes.adopt`). In the themer, choosing a built-in makes an editable copy (`copies`).
  // A design can name a theme the project no longer has (removed since); it stays selectable so
  // the picker says so.
  import { themeNames } from 'virtual:protokuda'
  import { library } from './library.svelte.js'
  import { projectThemes } from './themes.svelte.js'

  /** @type {{ value: string, copies?: boolean }} */
  let { value, copies = false } = $props()

  const fromLibrary = $derived(library.list.filter((t) => !projectThemes.has(t.name)))
  const missing = $derived(Boolean(value) && !themeNames.includes(value) && !projectThemes.has(value))
</script>

<optgroup label={copies ? 'Built-in (makes a copy)' : 'Built-in'}>
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
