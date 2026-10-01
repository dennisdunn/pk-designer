<script>
  // The live preview plus the editing layer on top of it.
  //
  // The preview is the exported markup and layout CSS (scoped to `.pv`), rendered with the
  // real protokuda.css. Over it sits a "guides" layer positioned from the measured grid:
  // empty-cell outlines, frame hit boxes with resize handles, and track separators.
  import { layoutCss, screenMarkup } from '../lib/markup.js'
  import { frameAtCell, rectFits, rectFromCells, splitTracks } from '../lib/model.js'
  import { store } from '../lib/store.svelte.js'
  import { resizeTrackPair } from '../lib/tracks.js'
  import Ruler from './Ruler.svelte'

  const EDGES = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']
  const KEY_STEP_PX = 8

  let canvas = $state()
  let guides = $state()
  /** Measured grid, in px relative to the canvas. */
  let m = $state({ cols: [], rows: [], gapX: 0, gapY: 0, fontSize: 16, contentW: 0, contentH: 0 })
  /** Current pointer gesture, if any. */
  let drag = null
  /** Rectangle being drawn. */
  let draft = $state(null)

  const design = $derived(store.design)
  const styleTag = $derived(`<style>${layoutCss(design, { scope: '.pv' })}</style>`)
  const markup = $derived(screenMarkup(design, { preview: true }))
  const measured = $derived(m.cols.length === design.grid.columns.length && m.rows.length === design.grid.rows.length)

  const emptyCells = $derived.by(() => {
    const out = []
    for (let y = 0; y < design.grid.rows.length; y++)
      for (let x = 0; x < design.grid.columns.length; x++) if (!frameAtCell(design, x, y)) out.push({ x, y })
    return out
  })

  // ---------- measurement ----------

  const px = (v) => parseFloat(v) || 0

  function measure() {
    const screen = canvas?.querySelector('.pk-screen')
    if (!screen) return
    const cs = getComputedStyle(screen)
    const cr = canvas.getBoundingClientRect()
    const sr = screen.getBoundingClientRect()
    const spans = (template, start, gap) => {
      let p = start
      return splitTracks(template).map((t) => {
        const size = px(t)
        const span = { start: p, end: p + size }
        p += size + gap
        return span
      })
    }
    const padX = px(cs.paddingLeft) + px(cs.paddingRight)
    const padY = px(cs.paddingTop) + px(cs.paddingBottom)
    m = {
      cols: spans(cs.gridTemplateColumns, sr.left - cr.left + px(cs.borderLeftWidth) + px(cs.paddingLeft), px(cs.columnGap)),
      rows: spans(cs.gridTemplateRows, sr.top - cr.top + px(cs.borderTopWidth) + px(cs.paddingTop), px(cs.rowGap)),
      gapX: px(cs.columnGap),
      gapY: px(cs.rowGap),
      fontSize: px(getComputedStyle(document.documentElement).fontSize) || 16,
      contentW: sr.width - padX,
      contentH: sr.height - padY,
    }
  }

  // Re-measure whenever the rendered preview changes...
  $effect(() => {
    styleTag
    markup
    measure()
  })

  // ...and when the canvas resizes or the font arrives.
  $effect(() => {
    if (!canvas) return
    const ro = new ResizeObserver(measure)
    ro.observe(canvas)
    document.fonts?.ready.then(measure)
    return () => ro.disconnect()
  })

  // ---------- geometry helpers ----------

  function box(rect) {
    const c0 = m.cols[rect.x]
    const c1 = m.cols[rect.x + rect.w - 1]
    const r0 = m.rows[rect.y]
    const r1 = m.rows[rect.y + rect.h - 1]
    if (!c0 || !c1 || !r0 || !r1) return 'display:none'
    return `left:${c0.start}px;top:${r0.start}px;width:${c1.end - c0.start}px;height:${r1.end - r0.start}px`
  }

  function indexAt(spans, p) {
    for (let i = 0; i < spans.length - 1; i++) if (p < (spans[i].end + spans[i + 1].start) / 2) return i
    return spans.length - 1
  }

  function cellAt(e) {
    const r = canvas.getBoundingClientRect()
    return { x: indexAt(m.cols, e.clientX - r.left), y: indexAt(m.rows, e.clientY - r.top) }
  }

  /** First candidate rectangle that fits, so drags slide along obstacles instead of sticking. */
  const firstFit = (candidates, ignoreId) => candidates.find((r) => rectFits(design, r, ignoreId)) ?? null

  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))

  // ---------- pointer gestures ----------

  function beginDraw(e) {
    if (e.button !== 0 || e.target !== guides || !measured) return
    const cell = cellAt(e)
    if (frameAtCell(design, cell.x, cell.y)) return
    drag = { kind: 'draw', start: cell, x0: e.clientX, y0: e.clientY, started: false }
    guides.setPointerCapture(e.pointerId)
  }

  function beginMove(e, frame) {
    if (e.button !== 0) return
    e.stopPropagation()
    store.select(frame.id)
    const cell = cellAt(e)
    drag = { kind: 'move', id: frame.id, offX: cell.x - frame.rect.x, offY: cell.y - frame.rect.y }
    store.history.begin()
    guides.setPointerCapture(e.pointerId)
  }

  function beginResize(e, frame, edge) {
    if (e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()
    drag = { kind: 'resize', id: frame.id, edge, orig: { ...frame.rect } }
    store.history.begin()
    guides.setPointerCapture(e.pointerId)
  }

  function beginTrack(e, axis, index) {
    if (e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()
    const spans = axis === 'columns' ? m.cols : m.rows
    drag = {
      kind: 'track',
      axis,
      index,
      p0: axis === 'columns' ? e.clientX : e.clientY,
      orig: [...design.grid[axis]],
      pxA: spans[index].end - spans[index].start,
      pxB: spans[index + 1].end - spans[index + 1].start,
    }
    store.history.begin()
    guides.setPointerCapture(e.pointerId)
  }

  function onMove(e) {
    if (!drag) return
    if (drag.kind === 'draw') {
      if (!drag.started) {
        if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 6) return
        drag.started = true
        draft = { ...drag.start, w: 1, h: 1 }
        drag.last = drag.start
      }
      const cur = cellAt(e)
      const last = drag.last
      const fit = firstFit([
        rectFromCells(drag.start, cur),
        rectFromCells(drag.start, { x: cur.x, y: last.y }),
        rectFromCells(drag.start, { x: last.x, y: cur.y }),
      ])
      if (fit) {
        draft = fit
        drag.last = {
          x: fit.x === drag.start.x ? fit.x + fit.w - 1 : fit.x,
          y: fit.y === drag.start.y ? fit.y + fit.h - 1 : fit.y,
        }
      }
    } else if (drag.kind === 'move') {
      const frame = design.frames.find((f) => f.id === drag.id)
      if (!frame) return
      const { w, h } = frame.rect
      const cur = cellAt(e)
      const x = clamp(cur.x - drag.offX, 0, design.grid.columns.length - w)
      const y = clamp(cur.y - drag.offY, 0, design.grid.rows.length - h)
      const fit = firstFit([{ x, y, w, h }, { x, y: frame.rect.y, w, h }, { x: frame.rect.x, y, w, h }], frame.id)
      if (fit) store.setRect(frame.id, fit)
    } else if (drag.kind === 'resize') {
      const o = drag.orig
      const cur = cellAt(e)
      let [x0, x1, y0, y1] = [o.x, o.x + o.w - 1, o.y, o.y + o.h - 1]
      if (drag.edge.includes('e')) x1 = Math.max(cur.x, x0)
      if (drag.edge.includes('w')) x0 = Math.min(cur.x, x1)
      if (drag.edge.includes('s')) y1 = Math.max(cur.y, y0)
      if (drag.edge.includes('n')) y0 = Math.min(cur.y, y1)
      const both = { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }
      const fit = firstFit([both, { ...both, y: o.y, h: o.h }, { ...both, x: o.x, w: o.w }], drag.id)
      if (fit) store.setRect(drag.id, fit)
    } else if (drag.kind === 'track') {
      const delta = (drag.axis === 'columns' ? e.clientX : e.clientY) - drag.p0
      applyTrackDelta(drag.axis, drag.index, drag.orig, drag.pxA, drag.pxB, delta)
    }
  }

  function onUp() {
    if (drag?.kind === 'draw') {
      if (drag.started && draft) store.addFrame(draft)
      else store.select(null)
    }
    drag = null
    draft = null
    store.history.end()
  }

  function applyTrackDelta(axis, index, tracks, pxA, pxB, delta) {
    const [a, b] = resizeTrackPair(tracks, index, pxA, pxB, delta, {
      fontSize: m.fontSize,
      available: axis === 'columns' ? m.contentW : m.contentH,
    })
    design.grid[axis][index] = a
    design.grid[axis][index + 1] = b
  }

  // ---------- keyboard ----------

  function frameKeys(e, frame) {
    const dirs = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
    if (dirs[e.key]) {
      e.preventDefault()
      const [dx, dy] = dirs[e.key]
      const r = frame.rect
      // Arrows move; Shift+arrows move the right/bottom edge.
      store.setRect(frame.id, e.shiftKey ? { ...r, w: r.w + dx, h: r.h + dy } : { ...r, x: r.x + dx, y: r.y + dy })
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      store.deleteFrame(frame.id)
      canvas.focus()
    } else if (e.key === 'Escape') {
      store.select(null)
      e.currentTarget.blur()
    }
  }

  function separatorKeys(e, axis, index) {
    const back = axis === 'columns' ? 'ArrowLeft' : 'ArrowUp'
    const fwd = axis === 'columns' ? 'ArrowRight' : 'ArrowDown'
    if (e.key !== back && e.key !== fwd) return
    e.preventDefault()
    const spans = axis === 'columns' ? m.cols : m.rows
    const step = (e.shiftKey ? 4 : 1) * KEY_STEP_PX * (e.key === fwd ? 1 : -1)
    applyTrackDelta(
      axis, index, [...design.grid[axis]],
      spans[index].end - spans[index].start, spans[index + 1].end - spans[index + 1].start, step,
    )
  }

  const between = (spans, i) => (spans[i].end + spans[i + 1].start) / 2
</script>

<div class="stage">
  <div class="stage-grid">
    <div class="corner" aria-hidden="true"></div>
    <Ruler axis="columns" spans={m.cols} />
    <Ruler axis="rows" spans={m.rows} />

    <section
      class="canvas pv pk-theme-{design.page.theme}"
      aria-label="Screen layout"
      tabindex="-1"
      bind:this={canvas}
    >
      {@html styleTag}
      {@html markup}

      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="guides"
        bind:this={guides}
        onpointerdown={beginDraw}
        onpointermove={onMove}
        onpointerup={onUp}
        onpointercancel={onUp}
      >
        {#if measured}
          {#each emptyCells as c (`${c.x},${c.y}`)}
            <div class="cell" style={box({ ...c, w: 1, h: 1 })}></div>
          {/each}

          {#each design.grid.columns.slice(1) as _, i (i)}
            <!-- A focusable separator is interactive (ARIA "window splitter"); Svelte doesn't know that. -->
            <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
            <div
              class="separator vertical"
              style="left:{between(m.cols, i)}px"
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize columns {i + 1} and {i + 2}"
              tabindex="0"
              onpointerdown={(e) => beginTrack(e, 'columns', i)}
              onkeydown={(e) => separatorKeys(e, 'columns', i)}
            ></div>
          {/each}
          {#each design.grid.rows.slice(1) as _, i (i)}
            <!-- A focusable separator is interactive (ARIA "window splitter"); Svelte doesn't know that. -->
            <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
            <div
              class="separator horizontal"
              style="top:{between(m.rows, i)}px"
              role="separator"
              aria-orientation="horizontal"
              aria-label="Resize rows {i + 1} and {i + 2}"
              tabindex="0"
              onpointerdown={(e) => beginTrack(e, 'rows', i)}
              onkeydown={(e) => separatorKeys(e, 'rows', i)}
            ></div>
          {/each}

          {#each design.frames as frame (frame.id)}
            {@const selected = frame.id === store.selectedId}
            <div
              class="hit"
              class:selected
              style={box(frame.rect)}
              role="button"
              tabindex="0"
              aria-pressed={selected}
              aria-label="Frame {frame.area}{frame.title ? `, ${frame.title}` : ''}"
              onpointerdown={(e) => beginMove(e, frame)}
              onfocus={() => store.select(frame.id)}
              onkeydown={(e) => frameKeys(e, frame)}
            >
              <span class="area-tag" aria-hidden="true">{frame.area}</span>
              {#if selected}
                {#each EDGES as edge (edge)}
                  <div
                    class="handle {edge}"
                    aria-hidden="true"
                    onpointerdown={(e) => beginResize(e, frame, edge)}
                  ></div>
                {/each}
              {/if}
            </div>
          {/each}

          {#if draft}
            <div class="draft" style={box(draft)}></div>
          {/if}
        {/if}
      </div>
    </section>
  </div>
</div>

<style>
  .stage {
    overflow: auto;
    background: var(--ui-bg);
  }
  .stage-grid {
    display: grid;
    grid-template: 'corner top' 2.25rem 'left canvas' 1fr / 4.75rem 1fr;
    min-width: 40rem;
    min-height: 100%;
  }
  .corner {
    background: var(--ui-panel);
    border-right: 1px solid var(--ui-line);
    border-bottom: 1px solid var(--ui-line);
  }

  /* The canvas plays the part of the exported page's <body>. */
  .canvas {
    grid-area: canvas;
    position: relative;
    display: grid;
    background-color: var(--pk-backdrop);
    font-family: var(--pk-sans-font-family);
    -webkit-font-smoothing: antialiased;
    outline: none;
  }
  .canvas :global(.pk-screen) {
    min-height: 100%;
  }

  .guides {
    position: absolute;
    inset: 0;
    touch-action: none;
    cursor: crosshair;
  }

  .cell {
    position: absolute;
    pointer-events: none;
    outline: 1px dashed rgb(255 255 255 / 0.55);
    box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.35);
  }

  .draft {
    position: absolute;
    pointer-events: none;
    background: rgb(255 204 102 / 0.25);
    outline: 2px dashed var(--ui-primary);
    box-shadow: 0 0 0 4px #000;
  }

  /* Above the separators: a line under a spanning frame is grabbed elsewhere along it. */
  .hit {
    position: absolute;
    z-index: 2;
    cursor: move;
  }
  .hit:hover {
    background: rgb(255 255 255 / 0.06);
  }
  .hit.selected {
    box-shadow: 0 0 0 2px #000, 0 0 0 4px var(--ui-primary);
  }
  .hit:focus-visible {
    outline: 3px solid var(--ui-accent);
    outline-offset: 6px;
  }
  .area-tag {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    padding: 0.1rem 0.4rem;
    font-size: 0.8rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--ui-on-primary);
    background: var(--ui-primary);
    opacity: 0;
    pointer-events: none;
  }
  .hit:hover .area-tag,
  .hit.selected .area-tag,
  .hit:focus-visible .area-tag {
    opacity: 0.9;
  }

  .handle {
    position: absolute;
    width: 12px;
    height: 12px;
    margin: -6px 0 0 -6px;
    background: var(--ui-primary);
    border: 1px solid #000;
    box-sizing: border-box;
  }
  .handle.n { left: 50%; top: 0; cursor: ns-resize; }
  .handle.s { left: 50%; top: 100%; cursor: ns-resize; }
  .handle.e { left: 100%; top: 50%; cursor: ew-resize; }
  .handle.w { left: 0; top: 50%; cursor: ew-resize; }
  .handle.ne { left: 100%; top: 0; cursor: nesw-resize; }
  .handle.sw { left: 0; top: 100%; cursor: nesw-resize; }
  .handle.nw { left: 0; top: 0; cursor: nwse-resize; }
  .handle.se { left: 100%; top: 100%; cursor: nwse-resize; }

  .separator {
    position: absolute;
    z-index: 1;
  }
  .separator.vertical {
    top: 0;
    bottom: 0;
    width: 12px;
    margin-left: -6px;
    cursor: col-resize;
  }
  .separator.horizontal {
    left: 0;
    right: 0;
    height: 12px;
    margin-top: -6px;
    cursor: row-resize;
  }
  .separator::after {
    content: '';
    position: absolute;
    background: var(--ui-accent);
    opacity: 0;
  }
  .separator.vertical::after { top: 0; bottom: 0; left: 5px; width: 2px; }
  .separator.horizontal::after { left: 0; right: 0; top: 5px; height: 2px; }
  .separator:hover::after,
  .separator:focus-visible::after {
    opacity: 1;
  }
  .separator:focus-visible {
    outline: 2px solid var(--ui-accent);
  }
</style>
