<script>
  // One geometry token: a length, or unset (Protokuda's default). Corners get a slider too.
  import { rootTokens } from 'virtual:protokuda'
  import { isLength } from '../../shared/theme/tokens.js'
  import { store } from '../lib/store.svelte.js'

  /** @type {{ token: import('../../shared/theme/tokens.js').TokenDef }} */
  let { token } = $props()

  const theme = $derived(/** @type {import('../../shared/theme/theme.js').Theme} */ (store.theme))
  const value = $derived(theme.tokens[token.name] ?? '')
  const id = $derived(`tok${token.name}`)
  const corner = $derived(token.name.endsWith('-radius'))

  /** What an unset value comes to: another token's value, or Protokuda's default. @returns {string} */
  function fallback(/** @type {string} */ name) {
    const def = name === token.name ? token.unset : undefined
    if (def) return theme.tokens[def] ?? fallback(def)
    return rootTokens[name] ?? ''
  }
  const effective = $derived(value || fallback(token.name))
  // The slider works in rem; a value in other units leaves it at its end, with the text field in charge.
  const rem = $derived(/rem$/.test(effective) || effective === '0' ? parseFloat(effective) || 0 : null)

  /** @param {Event & { currentTarget: HTMLInputElement }} e */
  function setText(e) {
    const v = e.currentTarget.value.trim()
    const ok = !v || isLength(v)
    e.currentTarget.setAttribute('aria-invalid', String(!ok))
    if (!ok) return
    if (v) theme.tokens[token.name] = v
    else delete theme.tokens[token.name]
  }
</script>

<div class="geometry">
  <label for={id}>{token.label} <code>{token.name}</code></label>
  <div class="value" class:corner>
    {#if corner}
      <input type="range" min="0" max="3" step="0.25" value={rem ?? 3} aria-label="{token.label}, in rem"
        aria-valuetext={effective} oninput={(e) => (theme.tokens[token.name] = `${e.currentTarget.value}rem`)} />
    {/if}
    <input {id} {value} placeholder={effective} spellcheck="false" autocomplete="off" oninput={setText}
      aria-describedby="{id}-help" />
    <button type="button" class="small" disabled={!value} aria-label="Unset {token.label}"
      onclick={() => delete theme.tokens[token.name]}>Unset</button>
  </div>
  <p id="{id}-help" class="help">
    {#if value}Set.{:else if token.unset}Unset: follows <code>{token.unset}</code> ({effective}).{:else}Unset: Protokuda's {effective}.{/if}
  </p>
</div>

<style>
  .geometry {
    margin-bottom: 0.7rem;
  }
  .geometry label {
    display: block;
    margin-bottom: 0.2rem;
  }
  .value {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.4rem;
    align-items: center;
  }
  .value.corner {
    grid-template-columns: 1fr 5rem auto;
  }
  .help {
    margin: 0.2rem 0 0;
  }
</style>
