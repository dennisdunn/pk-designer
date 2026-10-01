# Protokuda Designer
 > Lay out [Protokuda](https://github.com/dennisdunn/protokuda) screens visually, then export them as HTML and CSS.

[Open the designer](https://dennisdunn.github.io/pk-designer/)

A Protokuda screen is a CSS grid of frames. The designer edits that grid directly: set the column and row
sizes, draw frames across cells, pick each frame's type, modifiers and theme, and see the result rendered
with the real `protokuda.css`. The export is plain HTML plus a `layout.css` built on
`grid-template-areas`, with no inline styles and no JavaScript.

### Using it

- **Grid:** type track sizes (`1fr`, `200px`, `14rem`, `auto`, `minmax(8rem, 1fr)`) in the rulers along the
  top and left, or as whole templates in the Page panel. `+` inserts a track, `×` removes one. Drag the
  lines between tracks to resize them; `fr` tracks stay fractions and `rem` tracks stay rems.
- **Frames:** drag across empty cells to draw one. Drag a frame to move it, or its handles to resize it.
  Frames are always rectangles and never overlap; a drag that would break that stops at the last valid shape.
- **Inspector:** the selected frame's area name, type (box, standard, partial, bracket), modifiers
  (sidebar, statusline, mirror, flip, alert), theme, title, label lines, sidebar buttons and status text.
  The Page panel holds the page title, design version, theme, inner radius, screen alert and size tokens.
- **Keyboard:** Tab selects frames. Arrows move the focused frame, Shift+arrows resize it, Delete removes
  it, Escape deselects. Track lines take the arrow keys too. Ctrl/Cmd+Z undoes, Shift+Ctrl/Cmd+Z or Ctrl+Y
  redoes.

Frames hold placeholders only: titles, labels, sidebar buttons and status text. Your real content goes in
each frame's empty `pk-content` element after export.

### Files

- **Save / Open:** the design as `<title>-v<version>.json`. The designer also autosaves to the browser's
  local storage, so a reload picks up where you left off.
- **Export:** `<title>-v<version>.zip` containing
  - `index.html`: a `<main class="pk-screen">` with one element per frame, `id` set to its area name.
    It links the Antonio font, Protokuda from jsDelivr pinned to the exact version the designer uses (so it
    looks like the preview), and `layout.css`.
  - `layout.css`: the page tokens, the grid tracks and areas, and one `grid-area` rule per frame.

The design version is a plain counter: press **Next version** in the Page panel when you want a new one.
It goes into the filenames and a `<meta name="version">` in the exported HTML.

### Development

```
npm install
npm run dev      # http://localhost:5173
npm test         # vitest
npm run check    # svelte-check: types (JSDoc) and Svelte diagnostics
npm run build    # static site in dist/
```

Svelte 5 and Vite. The Protokuda version and theme list come from the installed `protokuda` package at
build time, so updating it is just `npm install protokuda@latest`; the preview and the export's CDN link
follow.

- `src/lib/`: the parts with no DOM: the design model (its types are JSDoc typedefs in `model.js`) and its validation, the HTML/CSS export, track
  resizing, undo history. These have the tests.
- `src/components/`: the canvas (preview plus the editing layer), the rulers, and the inspector panels.
- `CLAUDE.md`: the design decisions and a Protokuda class/token reference.

### Releasing

```
npm version minor        # or patch / major
git push --follow-tags
```

Every push runs `.github/workflows/ci.yml` (type-check, tests, build). Pushing a `v*` tag runs
`.github/workflows/deploy.yml`, which does the same and deploys to GitHub Pages.
It can also be run by hand from the Actions tab.

### License

MIT. See [LICENSE](LICENSE).
