<script>
  // A theme picker's options: the package's themes, then the library's. A design can name a
  // theme the library no longer has (deleted since); it stays selectable so the picker says so.
  import { library } from '../../shared/library.svelte.js'
  import { themeNames } from '../lib/store.svelte.js'

  /** @type {{ value: string }} */
  let { value } = $props()

  const missing = $derived(Boolean(value) && !themeNames.includes(value) && !library.themes[value])
</script>

<optgroup label="Built-in">
  {#each themeNames as t (t)}
    <option value={t}>{t}</option>
  {/each}
</optgroup>
{#if library.list.length}
  <optgroup label="Your themes">
    {#each library.list as t (t.name)}
      <option value={t.name}>{t.name}</option>
    {/each}
  </optgroup>
{/if}
{#if missing}
  <option {value}>{value} (not in your library)</option>
{/if}
