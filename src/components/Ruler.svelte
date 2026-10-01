<script>
  // Track sizes along one edge of the canvas: an editable size per track, a remove
  // button, and insert buttons at each line. Positions come from the canvas measurement.
  import { insertTrack, isValidTrack, removeTrack } from '../lib/model.js'
  import { store } from '../lib/store.svelte.js'

  /** @type {{ axis: 'columns' | 'rows', spans: { start: number, end: number }[] }} */
  let { axis, spans } = $props()

  const sizes = $derived(store.design.grid[axis])
  const noun = $derived(axis === 'columns' ? 'column' : 'row')
  const horizontal = $derived(axis === 'columns')
  const ready = $derived(spans.length === sizes.length)

  // Insert buttons sit in the gap before each track, and after the last one.
  const inserts = $derived.by(() => {
    if (!ready || !spans.length) return []
    const gap = spans.length > 1 ? spans[1].start - spans[0].end : 24
    return [
      ...spans.map((s, i) => ({ index: i, at: i === 0 ? s.start - gap / 2 : (spans[i - 1].end + s.start) / 2 })),
      { index: spans.length, at: spans[spans.length - 1].end + gap / 2 },
    ]
  })

  const place = (start, size) =>
    horizontal ? `left:${start}px;width:${size}px` : `top:${start}px;height:${size}px`

  function edit(e, i) {
    const value = e.currentTarget.value.trim()
    const ok = isValidTrack(value)
    e.currentTarget.setAttribute('aria-invalid', String(!ok))
    if (ok) store.design.grid[axis][i] = value
  }

  function reset(e, i) {
    e.currentTarget.value = sizes[i]
    e.currentTarget.setAttribute('aria-invalid', 'false')
  }
</script>

<div class="ruler" class:horizontal role="group" aria-label="{noun} sizes">
  {#if ready}
    {#each spans as span, i (i)}
      <div class="track" style={place(span.start, span.end - span.start)}>
        <input
          value={sizes[i]}
          aria-label="{noun} {i + 1} size"
          spellcheck="false"
          autocomplete="off"
          oninput={(e) => edit(e, i)}
          onblur={(e) => reset(e, i)}
          onkeydown={(e) => e.key === 'Escape' && reset(e, i)}
        />
        <button
          type="button"
          class="remove"
          aria-label="Remove {noun} {i + 1}"
          title="Remove {noun} {i + 1}"
          disabled={sizes.length <= 1}
          onclick={() => removeTrack(store.design, axis, i)}>×</button
        >
      </div>
    {/each}
    {#each inserts as ins (ins.index)}
      <button
        type="button"
        class="insert"
        style={horizontal ? `left:${ins.at}px` : `top:${ins.at}px`}
        aria-label={ins.index === sizes.length ? `Add ${noun} at the end` : `Insert ${noun} before ${noun} ${ins.index + 1}`}
        title={ins.index === sizes.length ? `Add ${noun}` : `Insert ${noun} here`}
        onclick={() => insertTrack(store.design, axis, ins.index, '1fr')}>+</button
      >
    {/each}
  {/if}
</div>

<style>
  .ruler {
    position: relative;
    background: var(--ui-panel);
  }
  .ruler.horizontal {
    border-bottom: 1px solid var(--ui-line);
  }
  .ruler:not(.horizontal) {
    border-right: 1px solid var(--ui-line);
  }

  .track {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 2px;
    box-sizing: border-box;
  }
  .horizontal .track {
    top: 0;
    bottom: 0;
    border-inline: 1px solid var(--ui-muted);
    border-bottom: 3px solid var(--ui-primary);
  }
  .ruler:not(.horizontal) .track {
    left: 0;
    right: 0;
    flex-direction: column;
    border-block: 1px solid var(--ui-muted);
    border-right: 3px solid var(--ui-primary);
  }

  input {
    width: 4.5rem;
    min-width: 0;
    padding: 1px 4px;
    font: inherit;
    font-size: 0.85rem;
    text-align: center;
    color: var(--ui-text);
    background: var(--ui-bg);
    border: 1px solid var(--ui-muted);
  }
  .ruler:not(.horizontal) input {
    width: 3.5rem;
  }
  input:global([aria-invalid='true']) {
    border-color: var(--ui-danger);
    outline-color: var(--ui-danger);
  }

  /* Antonio's × and + are tiny; a plain sans reads better at this size. */
  button {
    font: 600 1rem/1 system-ui, sans-serif;
    padding: 0;
    width: 1.1rem;
    height: 1.1rem;
    border: none;
    cursor: pointer;
  }
  .remove {
    color: var(--ui-text);
    background: transparent;
  }
  .remove:hover:not(:disabled) {
    color: var(--ui-on-danger);
    background: var(--ui-danger);
  }
  .remove:disabled {
    opacity: 0.35;
    cursor: default;
  }
  .insert {
    position: absolute;
    color: var(--ui-on-accent);
    background: var(--ui-accent);
    opacity: 0;
    z-index: 1;
  }
  .horizontal .insert {
    top: 50%;
    transform: translate(-50%, -50%);
  }
  .ruler:not(.horizontal) .insert {
    left: 50%;
    transform: translate(-50%, -50%);
  }
  .ruler:hover .insert,
  .insert:focus-visible {
    opacity: 1;
  }
</style>
