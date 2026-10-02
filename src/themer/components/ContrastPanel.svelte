<script>
  // WCAG AA checks over the pairs of tokens that sit on each other.
  import { store } from '../lib/store.svelte.js'
  import { bare } from '../../shared/theme/tokens.js'

  const checks = $derived(store.checks)
</script>

<section class="panel" aria-labelledby="ins-contrast-heading">
  <h2 id="ins-contrast-heading">Contrast</h2>
  <p class="help">Text needs 4.5:1 (WCAG AA); frame edges and focus rings need 3:1.</p>
  <ul class="checks">
    {#each checks as c (c.label)}
      <li class:fail={!c.pass}>
        <span class="sample" style:color={c.fgColor} style:background={c.bgColor} aria-hidden="true">Aa</span>
        <span class="what">{c.label}<br /><code>{bare(c.fg)} / {bare(c.bg)}</code></span>
        <span class="ratio">
          {#if c.ratio === null}
            ? unknown
          {:else}
            {c.pass ? '✓' : '✗'} {c.ratio.toFixed(1)}{c.pass ? '' : ` < ${c.min}`}
          {/if}
        </span>
      </li>
    {/each}
  </ul>
</section>
