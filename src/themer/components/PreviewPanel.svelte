<script>
  // Preview-only settings: a screen alert. Not part of the theme.
  import { store } from '../lib/store.svelte.js'
</script>

<section class="panel" aria-labelledby="ins-preview-heading">
  <h2 id="ins-preview-heading">Preview</h2>
  <label class="choice">
    <input type="checkbox" bind:checked={store.preview.alert} />
    Alert (whole screen)
  </label>
  <p class="help">Preview settings only; they aren't part of the theme.</p>
</section>

<style>
  label.choice {
    margin-bottom: 0.5rem;
  }
</style>
