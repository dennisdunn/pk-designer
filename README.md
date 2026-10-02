# Protokuda Studio
 > Lay out [Protokuda](https://github.com/dennisdunn/protokuda) screens and make themes for them, then export
 > them as HTML, CSS and theme files.

Two tools in one app; switch between them with the tabs at the top. Each keeps its work while you switch.
Themes you save to your library in the themer show up in the designer's theme pickers.

**Install it** from the browser (the install icon in the address bar, or Share → Add to Home Screen on
an iPad) to get it as an app that works offline. Installed on a computer, it can open designs (`.json`)
and themes (`.css`) from your file manager with "Open with". On a tablet in portrait, the designer puts its
inspector under the canvas. When a new version is out, an **Update** button appears in
the toolbar; your autosaved work carries over.

[Open Protokuda Studio](https://dennisdunn.github.io/pk-studio/) (or go straight to the
[designer](https://dennisdunn.github.io/pk-studio/#/designer) or the
[themer](https://dennisdunn.github.io/pk-studio/#/themer)). It replaces Protokuda Designer and Protokuda
Themer, whose old addresses redirect here; work autosaved in either carries over.

## Designer

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

- **New** starts an empty design: one column, one row, no frames.
- **Save / Open:** the design as `<title>-v<version>.json`. In Chrome and Edge on a computer, Save writes
  back to the file you opened until you change the title or version, which saves a new file; other browsers
  download it. The designer also autosaves to the browser's local storage, so a reload picks up where you
  left off. A saved design carries copies of the library
  themes it uses; opening it adds any your library doesn't have (where both have a theme by that name,
  yours wins).
- **Export:** `<title>-v<version>.zip` containing
  - `index.html`: a `<main class="pk-screen">` with one element per frame, `id` set to its area name.
    It links the Antonio font, Protokuda from jsDelivr pinned to the exact version the designer uses (so it
    looks like the preview), and `layout.css`.
  - `layout.css`: the page tokens, the grid tracks and areas, and one `grid-area` rule per frame.
  - `<name>.css` for each library theme the design uses, linked from `index.html`.

The design version is a plain counter: press **Next version** in the Page panel when you want a new one.
It goes into the filenames and a `<meta name="version">` in the exported HTML.

## Themer

A Protokuda theme is a set of `--pk-*` custom properties. The themer edits them against a sample screen
rendered with the real `protokuda.css`, checks the pairs that sit on each other for WCAG AA contrast, and
exports a theme file that drops in beside the library.

### Using it

- **Start from** a built-in theme (Theme panel), or **Open** any theme `.css`: a file from
  `protokuda/dist/themes/`, a library source file from `src/themes/`, or one exported from here.
- **Tokens:** each one is a palette color, another token (e.g. buttons follow `--pk-secondary-light`), or a
  custom hex color. `--pk-on-backdrop` can stay unset, in which case titles and labels follow `--pk-primary`.
- **Contrast:** text pairs need 4.5:1, frame edges and focus rings 3:1. Failing checks show in the Theme
  panel and in full at the bottom of the inspector.
- **Preview:** inner radius and a screen alert, to see the theme on LCARS-style elbows and under alert.
  They aren't saved in the theme.
- **Keyboard:** Ctrl/Cmd+Z undoes, Shift+Ctrl/Cmd+Z or Ctrl+Y redoes. The theme autosaves to the browser's
  local storage.

### Files

- **Export** downloads `<name>-v<version>.zip` containing
  - `<name>.css`: link it after `protokuda.css` to theme the page; it also defines `.pk-theme-<name>`
    for theming a single frame or section. Its header comment holds the label, the theme version and the
    Protokuda version it was made for; Open reads the label and version back.
  - `README.md`: how to use the theme, with Protokuda links pinned to that version.
- **Version** is a plain counter: press **Next version** in the Theme panel when you want a new one.
- **Copy source** copies the theme in the library's `src/themes/<name>.css` form, for adding it to Protokuda.
- **Library:** **Save to library** keeps the theme in your browser for the designer's theme pickers; the
  panel says whether the open theme has changed since. **Edit** opens a saved theme, **Delete** (pressed
  twice) removes it. Built-in theme names are reserved.

## Development

```
npm install
npm run dev      # http://localhost:5173
npm test         # vitest
npm run check    # svelte-check: types (JSDoc) and Svelte diagnostics
npm run build    # static site in dist/
npm run preview  # serve dist/; the service worker (offline, updates) only runs in a build
npm run icons    # re-render the PNG icons from public/favicon.svg (needs rsvg-convert)
```

Svelte 5 and Vite, with `vite-plugin-pwa` for the service worker and manifest. The Protokuda version, palette and built-in themes come from the installed `protokuda`
package at build time, so updating it is just `npm install protokuda@latest`; the previews and the exports'
CDN links follow.

- `src/App.svelte` and `src/shared/`: the shell, the tool tabs, the toolbar, undo history, files, and in
  `src/shared/theme/` the theme model both tools use.
- `src/designer/` and `src/themer/`: each tool; neither imports the other. Their `lib/` folders hold the parts with no DOM (models,
  validation, export, color and contrast), and these have the tests; `components/` holds the UI.
- `CLAUDE.md`: the design decisions and a Protokuda class/token reference.

## Releasing

```
npm version minor        # or patch / major
git push --follow-tags
```

Every push runs `.github/workflows/ci.yml` (type-check, tests, build). Pushing a `v*` tag runs
`.github/workflows/deploy.yml`, which does the same and deploys to GitHub Pages.
It can also be run by hand from the Actions tab.

## License

MIT. See [LICENSE](LICENSE).
