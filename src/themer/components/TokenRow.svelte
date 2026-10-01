<script>
  // One token: a palette color, another token, or a custom hex color.
  import { TOKENS, isHex, resolve, titleCase, varName, wouldCycle } from '../lib/theme.js'
  import { palette, store } from '../lib/store.svelte.js'

  /** @type {{ token: import('../lib/theme.js').TokenDef }} */
  let { token } = $props()

  const CUSTOM = '#custom'
  const theme = $derived(store.theme)
  const value = $derived(theme.tokens[token.name] ?? '')
  const color = $derived(resolve(theme, token.name, palette))
  const ref = $derived(varName(value))
  const choice = $derived(
    !value ? '' : isHex(value) ? CUSTOM : ref && (palette[ref.slice(5)] || TOKENS.some((t) => t.name === ref)) ? value : 'other',
  )
  const id = $derived(`tok${token.name}`)

  function choose(e) {
    const v = e.currentTarget.value
    if (v === CUSTOM) theme.tokens[token.name] = color ?? '#ffffff'
    else if (v === '') delete theme.tokens[token.name]
    else if (v !== 'other') theme.tokens[token.name] = v
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
      <option value="">Unset (follows {token.unset})</option>
    {/if}
    {#if choice === 'other'}
      <option value="other">{value}</option>
    {/if}
    <option value={CUSTOM}>Custom color…</option>
    <optgroup label="Palette">
      {#each Object.entries(palette) as [name, hex] (name)}
        <option value="var(--pk-{name})">{titleCase(name)} {hex}</option>
      {/each}
    </optgroup>
    <optgroup label="Theme tokens">
      {#each TOKENS as t (t.name)}
        {#if t.name !== token.name}
          <option value="var({t.name})" disabled={wouldCycle(theme, token.name, t.name)}>{t.label} ({t.name.slice(5)})</option>
        {/if}
      {/each}
    </optgroup>
  </select>
  {#if choice === CUSTOM}
    <div class="custom">
      <input type="color" aria-label="{token.label} color" value={color ?? '#000000'}
        oninput={(e) => (theme.tokens[token.name] = e.currentTarget.value)} />
      <input aria-label="{token.label} hex" value={value} spellcheck="false" autocomplete="off" oninput={setHex} />
    </div>
  {/if}
</div>
