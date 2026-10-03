<script>
  // One token: a palette color, another token, or a custom hex color.
  import { titleCase } from '../../shared/theme/theme.js'
  import { COLOR_TOKENS, bare, isHex, valueKind } from '../../shared/theme/tokens.js'
  import { resolve, wouldCycle } from '../lib/color.js'
  import { palette, store } from '../lib/store.svelte.js'

  /** @type {{ token: import('../../shared/theme/tokens.js').TokenDef }} */
  let { token } = $props()

  // The select's option values: a palette or token reference is its own CSS value;
  // the other kinds get a sentinel.
  const UNSET = ''
  const CUSTOM = '#custom'
  const OTHER = '#other'

  const theme = $derived(/** @type {import('../../shared/theme/theme.js').Theme} */ (store.theme))
  const value = $derived(theme.tokens[token.name] ?? '')
  const kind = $derived(valueKind(value, palette))
  const color = $derived(resolve(theme, token.name, palette))
  const choice = $derived({ unset: UNSET, custom: CUSTOM, other: OTHER, palette: value, token: value }[kind])
  const id = $derived(`tok${token.name}`)

  function choose(e) {
    const v = e.currentTarget.value
    if (v === CUSTOM) theme.tokens[token.name] = color ?? '#ffffff'
    else if (v === UNSET) delete theme.tokens[token.name]
    else if (v !== OTHER) theme.tokens[token.name] = v
  }

  function setHex(e) {
    let v = e.currentTarget.value.trim()
    if (v && !v.startsWith('#')) v = `#${v}`
    const ok = isHex(v)
    e.currentTarget.setAttribute('aria-invalid', String(!ok))
    if (ok) theme.tokens[token.name] = v.toLowerCase()
  }
</script>

<div class="token">
  <span class="swatch" class:unknown={!color} style:background={color ?? undefined} aria-hidden="true"></span>
  <label for={id}>{token.label} <code>{token.name}</code></label>
  <select {id} value={choice} onchange={choose}>
    {#if token.optional}
      <option value={UNSET}>Unset (follows {token.unset})</option>
    {/if}
    {#if kind === 'other'}
      <option value={OTHER}>{value}</option>
    {/if}
    <option value={CUSTOM}>Custom color…</option>
    <optgroup label="Palette">
      {#each Object.entries(palette) as [name, hex] (name)}
        <option value="var(--pk-{name})">{titleCase(name)} {hex}</option>
      {/each}
    </optgroup>
    <optgroup label="Theme tokens">
      {#each COLOR_TOKENS as t (t.name)}
        {#if t.name !== token.name}
          <option value="var({t.name})" disabled={wouldCycle(theme, token.name, t.name)}>{t.label} ({bare(t.name)})</option>
        {/if}
      {/each}
    </optgroup>
  </select>
  {#if kind === 'custom'}
    <div class="custom">
      <input type="color" aria-label="{token.label} color" value={color ?? '#000000'}
        oninput={(e) => (theme.tokens[token.name] = e.currentTarget.value)} />
      <input aria-label="{token.label} hex" value={value} spellcheck="false" autocomplete="off" oninput={setHex} />
    </div>
  {/if}
</div>

<style>
  /* Swatch, label, then the value. */
  .token {
    display: grid;
    grid-template-columns: 2.4rem 1fr;
    gap: 0.2rem 0.6rem;
    align-items: center;
    margin-bottom: 0.7rem;
  }
  .swatch {
    grid-row: span 2;
    align-self: stretch;
    border: 1px solid var(--ui-muted);
  }
  /* Unresolvable value: hatched, so it doesn't read as a color. */
  .swatch.unknown {
    background: repeating-linear-gradient(45deg, var(--ui-line) 0 4px, transparent 4px 8px);
  }
  .custom {
    grid-column: 2;
    display: grid;
    grid-template-columns: 2.4rem 1fr;
    gap: 0.4rem;
  }
  input[type='color'] {
    width: 100%;
    height: 100%;
    padding: 0;
    background: none;
    border: 1px solid #789;
    cursor: pointer;
  }
</style>
