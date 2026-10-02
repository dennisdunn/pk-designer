<script>
  // Preview-only settings: inner radius and a screen alert. Not part of the theme.
  import { store } from '../lib/store.svelte.js'
</script>

<section class="panel" aria-labelledby="ins-preview-heading">
  <h2 id="ins-preview-heading">Preview</h2>
  <div class="field">
    <label for="ins-radius">Inner radius <output for="ins-radius">{store.preview.innerRadius}rem</output></label>
    <input id="ins-radius" type="range" min="0" max="3" step="0.25" bind:value={store.preview.innerRadius} />
  </div>
  <label class="choice">
    <input type="checkbox" bind:checked={store.preview.alert} />
    Alert (whole screen)
  </label>
  <p class="help">Preview settings only; they aren't part of the theme.</p>
</section>
