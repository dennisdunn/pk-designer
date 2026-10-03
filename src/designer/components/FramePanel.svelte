<script>
  // Inspector for the selected frame. Keyed on the frame id by the parent, so local
  // state (the area-name draft, position errors) resets when the selection changes.
  // Edits go straight into the store's design, which is the one source of truth.
  import { FRAME_TYPES, MODIFIERS, areaNameError, deleteFrame, placeFrame } from '../lib/model.js'
  import { store } from '../lib/store.svelte.js'
  import { projectThemes } from '../../shared/themes.svelte.js'
  import ThemeOptions from './ThemeOptions.svelte'

  // Only mounted while a frame is selected.
  const frame = $derived(/** @type {import('../lib/model.js').Frame} */ (store.selected))

  // svelte-ignore state_referenced_locally
  let areaDraft = $state(frame.area)
  // Follow the model when it changes underneath us (undo/redo).
  $effect.pre(() => {
    if (frame) areaDraft = frame.area
  })
  const areaError = $derived(areaNameError(areaDraft, store.design, frame.id))
  let rectError = $state('')

  function setArea(e) {
    areaDraft = e.currentTarget.value.trim()
    if (!areaError) frame.area = areaDraft
  }

  function toggleModifier(mod, on) {
    frame.modifiers = MODIFIERS.map((m) => m.value).filter((m) => (m === mod ? on : frame.modifiers.includes(m)))
  }

  function setRect(key, e) {
    const n = parseInt(e.currentTarget.value, 10)
    const value = key === 'x' || key === 'y' ? n - 1 : n
    if (Number.isInteger(n) && placeFrame(store.design, frame.id, { ...frame.rect, [key]: value })) {
      rectError = ''
    } else {
      rectError = 'That would overlap another frame or leave the grid.'
      e.currentTarget.value = String(key === 'x' || key === 'y' ? frame.rect[key] + 1 : frame.rect[key])
    }
  }

  function moveItem(i, d) {
    const items = frame.items
    ;[items[i], items[i + d]] = [items[i + d], items[i]]
  }

  const RECT_FIELDS = [
    { key: 'x', label: 'Column' },
    { key: 'y', label: 'Row' },
    { key: 'w', label: 'Width' },
    { key: 'h', label: 'Height' },
  ]
</script>

<section class="panel" aria-labelledby="ins-frame-heading">
  <h2 id="ins-frame-heading">Frame</h2>

  <div class="field">
    <label for="ins-area">Area name</label>
    <input
      id="ins-area"
      value={areaDraft}
      spellcheck="false"
      autocomplete="off"
      aria-invalid={!!areaError}
      aria-describedby="ins-area-help"
      oninput={setArea}
      onblur={() => (areaDraft = frame.area)}
    />
    <p id="ins-area-help" class="help" class:error={areaError}>
      {areaError ?? 'Used for grid-area and the element id.'}
    </p>
  </div>

  <fieldset>
    <legend>Type</legend>
    <div class="choices">
      {#each FRAME_TYPES as t (t.value)}
        <label class="choice">
          <input type="radio" name="ins-type" value={t.value} bind:group={frame.type} />
          {t.label}
        </label>
      {/each}
    </div>
  </fieldset>

  <fieldset>
    <legend>Modifiers</legend>
    <div class="choices">
      {#each MODIFIERS as mod (mod.value)}
        <label class="choice">
          <input
            type="checkbox"
            checked={frame.modifiers.includes(mod.value)}
            onchange={(e) => toggleModifier(mod.value, e.currentTarget.checked)}
          />
          {mod.label}
        </label>
      {/each}
    </div>
  </fieldset>

  <div class="field">
    <label for="ins-frame-theme">Theme</label>
    <select id="ins-frame-theme" bind:value={frame.theme} onchange={(e) => projectThemes.adopt(e.currentTarget.value)}>
      <option value="">Same as page</option>
      <ThemeOptions value={frame.theme} />
    </select>
  </div>

  <div class="field">
    <label for="ins-title">Title</label>
    <input id="ins-title" bind:value={frame.title} autocomplete="off" />
  </div>

  <div class="field">
    <label for="ins-label">Label <span class="hint">(one line each)</span></label>
    <textarea
      id="ins-label"
      rows="2"
      value={frame.label.join('\n')}
      oninput={(e) => (frame.label = e.currentTarget.value ? e.currentTarget.value.split('\n') : [])}
    ></textarea>
  </div>

  {#if frame.modifiers.includes('sidebar')}
    <fieldset>
      <legend>Sidebar buttons</legend>
      {#each frame.items as item, i (i)}
        <div class="item">
          <input bind:value={item.text} aria-label="Button {i + 1} text" placeholder="Text" autocomplete="off" />
          <input
            bind:value={item.code}
            aria-label="Button {i + 1} code"
            placeholder="00-0000"
            class="code"
            autocomplete="off"
          />
          <button type="button" class="icon" aria-label="Move button {i + 1} up" disabled={i === 0}
            onclick={() => moveItem(i, -1)}>↑</button>
          <button type="button" class="icon" aria-label="Move button {i + 1} down"
            disabled={i === frame.items.length - 1} onclick={() => moveItem(i, 1)}>↓</button>
          <button type="button" class="icon" aria-label="Remove button {i + 1}"
            onclick={() => frame.items.splice(i, 1)}>×</button>
        </div>
      {/each}
      <button type="button" class="small" onclick={() => frame.items.push({ text: 'Button', code: '' })}>
        Add button
      </button>
    </fieldset>
  {/if}

  {#if frame.modifiers.includes('statusline')}
    <div class="field">
      <label for="ins-status">Status text</label>
      <input id="ins-status" bind:value={frame.status} autocomplete="off" />
    </div>
  {/if}

  <fieldset>
    <legend>Position <span class="hint">(cells)</span></legend>
    <div class="rect">
      {#each RECT_FIELDS as f (f.key)}
        <label>
          {f.label}
          <input
            type="number"
            min="1"
            value={f.key === 'x' || f.key === 'y' ? frame.rect[f.key] + 1 : frame.rect[f.key]}
            onchange={(e) => setRect(f.key, e)}
          />
        </label>
      {/each}
    </div>
    {#if rectError}<p class="help error" role="status">{rectError}</p>{/if}
  </fieldset>

  <button type="button" class="danger" data-code="DEL" onclick={() => deleteFrame(store.design, frame.id)}>
    Delete frame
  </button>
</section>

<style>
  textarea {
    resize: vertical;
  }

  .choices {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem 0.9rem;
  }

  /* A sidebar button: text, code, then move up, move down and remove. */
  .item {
    display: grid;
    grid-template-columns: 1fr 5rem repeat(3, 1.6rem);
    gap: 0.2rem;
    margin-bottom: 0.3rem;
  }
  button.icon {
    padding: 0;
    font: inherit;
    color: var(--ui-text);
    background: transparent;
    border: 1px solid var(--ui-line);
    cursor: pointer;
  }
  button.icon:hover:not(:disabled) {
    color: var(--ui-on-accent);
    background: var(--ui-accent);
  }
  button.icon:disabled {
    opacity: 0.35;
    cursor: default;
  }

  /* The cell rectangle: x, y, w, h. */
  .rect {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.4rem;
  }
  .rect label {
    display: grid;
    gap: 0.2rem;
    font-size: 0.75rem;
  }
</style>
