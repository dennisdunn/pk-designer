<script>
  // A sample screen rendered with the real protokuda.css. The theme's tokens go on the
  // stage as inline custom properties, which beat protokuda's layered defaults.
  import { store } from '../lib/store.svelte.js'

  const style = $derived(
    [
      ...Object.entries(store.theme.tokens).map(([name, value]) => `${name}: ${value}`),
      `--pk-inner-radius: ${store.preview.innerRadius}rem`,
    ].join('; '),
  )

  const SWATCHES = ['primary', 'secondary', 'accent'].map((role) => ({
    role,
    shades: ['light', '', 'dark'].map((s) => (s ? `${role}-${s}` : role)),
  }))
</script>

<div class="stage" {style}>
  <div class="pk-screen sample" class:pk-alert={store.preview.alert}>
    <div class="pk-frame pk-std pk-sidebar nav">
      <div class="pk-title">Navigation</div>
      <div class="pk-items">
        <button class="pk-button" data-code="47-1138">Course</button>
        <button class="pk-button" data-code="47-2210">Speed</button>
        <button class="pk-button" data-code="03-0042">Hold</button>
      </div>
      <div class="pk-content">
        <p>Content text sits on the frame interior. Inputs use the accent color.</p>
        <p class="controls">
          <input type="text" value="Heading 047" aria-label="Heading" />
          <input type="number" value="9" aria-label="Warp" />
          <select aria-label="Mode"><option>Impulse</option></select>
        </p>
        <p class="controls">
          <input type="range" aria-label="Throttle" />
          <input type="checkbox" checked aria-label="Engaged" />
        </p>
      </div>
      <div class="pk-label"><span>Titles and labels</span><span>Line two</span></div>
    </div>

    <div class="pk-frame pk-partial pk-mirror colors">
      <div class="pk-title">Theme colors</div>
      <div class="pk-content">
        {#each SWATCHES as row (row.role)}
          <div class="shades">
            {#each row.shades as shade (shade)}
              <span style:background="var(--pk-{shade})" style:color="var(--pk-on-{row.role})">{shade}</span>
            {/each}
          </div>
        {/each}
        <div class="shades">
          <span style:background="var(--pk-error)" style:color="var(--pk-on-error)">error</span>
          <span style:background="var(--pk-backdrop-dark)" style:color="var(--pk-text)">backdrop-dark</span>
        </div>
      </div>
    </div>

    <div class="pk-frame pk-bracket pk-sidebar scan">
      <div class="pk-title">Sensors</div>
      <div class="pk-items">
        <button class="pk-button" data-code="12-0001">Scan</button>
      </div>
      <div class="pk-content"><p>Bracket frame with a sidebar.</p></div>
      <div class="pk-label"><span>Scanning</span></div>
    </div>

    <div class="pk-frame pk-alert alert">
      <div class="pk-title">Local alert</div>
      <div class="pk-content"><p>A box frame with <code>pk-alert</code>.</p></div>
    </div>

    <div class="pk-frame pk-statusline pk-flip status">
      <div class="pk-title">Status</div>
      <div class="pk-content"><p>Partial frames, flips and status lines.</p></div>
      <div class="pk-status"><span>Stardate 2026.10.01</span></div>
    </div>
  </div>
</div>

<style>
  .stage {
    overflow: auto;
    min-height: 0;
    font-family: var(--pk-sans-font-family);
    background: var(--pk-backdrop);
  }
  .pk-screen.sample {
    min-height: 100%;
    grid-template-columns: minmax(18rem, 3fr) minmax(14rem, 2fr);
    grid-template-rows: auto auto auto;
    grid-template-areas:
      'nav colors'
      'nav scan'
      'alert status';
  }
  .nav { grid-area: nav; }
  .colors { grid-area: colors; }
  .scan { grid-area: scan; }
  .alert { grid-area: alert; }
  .status { grid-area: status; }

  p {
    margin: 0 0 0.75rem;
  }
  .controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
  }
  .controls input[type='text'] {
    width: 9rem;
  }
  .controls input[type='number'] {
    width: 4rem;
  }
  .shades {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.25rem;
    margin-bottom: 0.25rem;
  }
  .shades span {
    padding: 0.4rem 0.4rem 0.2rem;
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: var(--pk-letter-spacing);
  }

  @media (max-width: 52rem) {
    .pk-screen.sample {
      grid-template-columns: 1fr;
      grid-template-areas: 'nav' 'colors' 'scan' 'alert' 'status';
    }
  }
</style>
