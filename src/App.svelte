<script>
  import Designer from './designer/Designer.svelte'
  import { route } from './shared/route.svelte.js'
  import Themer from './themer/Themer.svelte'
</script>

{#if route.view === 'themer'}
  <Themer />
{:else}
  <Designer />
{/if}
