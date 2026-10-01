# Protokuda Designer

A browser app for laying out [Protokuda](https://github.com/dennisdunn/protokuda) screens visually,
then exporting them as an HTML file and a CSS layout.

Protokuda is a Star Trek-ish CSS library by the same author: what Michael Okuda might have drawn on
his way to LCARS. It is deliberately *not* a faithful LCARS copy; it's the prototype era (square
buttons with code numbers, thin bars, optional curved elbows). Keep that spirit in the designer's own UI.

## Decisions already made

- **Separate repo.** The designer consumes the *published* `protokuda` npm package (3.x), not the
  library source. Library changes happen in the protokuda repo and arrive here as package updates.
- **Grid-based, not freeform.** `.pk-screen` is a CSS grid. The designer edits that grid:
  - the user sets column and row tracks (`1fr`, `2fr`, `200px`, ...) and drags the lines between them;
  - each frame is a rectangle of cells, drawn and resized by dragging;
  - frames can't overlap and must be rectangles, which `grid-template-areas` requires. Prevent invalid
    shapes in the editor rather than rejecting them at export.
  - No absolute positioning, no pixel-placed frames, no inline styles in the output.
- **The design is one JSON model.** Everything is derived from it: preview, export, save/load,
  autosave, undo/redo. Roughly:
  - `grid`: column tracks, row tracks;
  - `frames[]`: id, area name, cell rectangle, type, modifiers, theme (optional), title, label,
    sidebar items (text + `data-code`), status text;
  - `page`: page theme, `--pk-inner-radius`, other page-level tokens.
- **WYSIWYG.** The preview renders the model with the real `protokuda.css` from the installed package.
- **Export:**
  - `index.html` with one element per frame, plus `layout.css` with named `grid-template-areas`.
  - The exported HTML links Protokuda from jsDelivr at the **same version the designer uses**, so the
    export looks exactly like the preview. Read the version from the installed package; don't hard-code it.
  - It also links the Antonio font (Protokuda doesn't import it; see below).
- **Save/load** designs as `.json` files, and **autosave** to `localStorage` (wrapped in try/catch).
- **Frame content is placeholders only**: titles, labels, sidebar buttons and status text. Not arbitrary
  content inside frames; that's a page builder, not this app.
- **Tooling:** Vite + Svelte 5 (runes). The design lives in one `$state` object in
  `src/lib/store.svelte.js`; components edit it directly. Vitest for the pure modules.

## Plan

**First version (MVP):**
- grid editor: track sizes, drawing frames, resizing frames;
- frame inspector: type, modifiers, theme, title, label, sidebar buttons, status;
- page theme picker and inner-radius control;
- live preview;
- export `index.html` and `layout.css` as one zip (Export button, `fflate`);
- JSON save/load and localStorage autosave.

**Later:** responsive layouts (a grid per breakpoint), nested frames, a theme editor (palette colors,
contrast checks, theme file export), more keyboard shortcuts.

Open questions: whether the export should offer `@3` as well as the exact version (it pins the exact
version for now); whether to inline the CSS as an export option.

## Code map

- `npm run dev` / `npm test` / `npm run check` (svelte-check) / `npm run build`. CI (`ci.yml`) runs check,
  test and build on every push. Deployed to GitHub Pages by `.github/workflows/deploy.yml`
  on `v*` tags (`npm version ...`) or a manual run.
- `vite.config.js`: the `virtual:protokuda` module gives the installed package's `version` and `themes`.
- `src/lib/model.js`: the JSON model (JSDoc typedefs `Design`, `Frame`, `Rect`, ... at the top), geometry (fits/overlap, insert/remove tracks), loading/validation.
- `src/lib/markup.js`: `index.html` and `layout.css` generation. The preview renders the same strings
  (scoped to `.pv`, frames matched by `data-area`, screen `inert`), so preview and export can't drift.
- `src/lib/history.svelte.js`: undo/redo over JSON snapshots; nearby changes and drags group into one step.
- `src/lib/tracks.js`: dragging the line between two tracks, keeping each track's unit.
- `src/components/Canvas.svelte`: preview plus the guides layer (cells, hit boxes, handles, separators),
  positioned from the screen's computed `grid-template-columns/rows`.

## Protokuda 3.x reference

Install: `npm install protokuda`. Files in the package:
- `dist/protokuda.css` and `.min.css`: the library, with every theme included as a class;
- `dist/themes/<name>.css` and `.min.css`: standalone themes that apply to the whole page (`:root`).

CDN: `https://cdn.jsdelivr.net/npm/protokuda@3/dist/protokuda.min.css`.

**Font.** Protokuda doesn't load its font. Pages need:
```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Antonio:wght@100..700&display=swap" />
```

**Cascade layers.** In order: `protokuda.base`, `protokuda.theme`, `protokuda.state`. Any CSS outside a
layer (the designer's own UI, exported layout CSS) beats Protokuda without `!important`. Form controls
are only styled inside `.pk-screen`, so the designer's own UI controls outside it are unaffected.

**Classes:**
- **Container:** `pk-screen`, a CSS grid; the layout supplies `grid-template-columns/rows/areas`.
- **Frame types:**
  - `pk-frame`: thin box;
  - `pk-frame pk-std`: left, top and bottom edges;
  - `pk-frame pk-partial`: left and bottom;
  - `pk-frame pk-bracket`: left and right.
- **Frame modifiers:**
  - `pk-sidebar`: wide left edge holding buttons;
  - `pk-statusline`: tall bottom edge holding text;
  - `pk-mirror`: flips left/right; the sidebar, title and label move with it;
  - `pk-flip`: flips top/bottom; the statusline moves with it.
- **Frame contents** (direct children of `.pk-frame`):
  - `pk-title`: top right; a nameplate on the top edge if the frame has one;
  - `pk-label`: bottom right, a column of lines;
  - `pk-content`: main content;
  - `pk-items`: sidebar buttons;
  - `pk-status`: statusline text.
- **Controls:**
  - `pk-button`: square button; `data-code="47-1138"` shows a code number in its corner;
  - `pk-vertical` on `<input type="range">` makes it vertical.
- **Alerts:** `pk-alert` on a frame or the screen: primary turns red and pulses. It beats themes; no
  pulse under reduced motion.
- **Themes as classes:** `pk-theme-<name>` on `<html>` themes the page; on a frame or section, just that
  part. Names: `greysmoke` (the default), `atomic`, `goldentanoi`, `anakiwa`, `lilac`, `husk`, `navy`.
  The package has no JS list of themes. Derive it from `node_modules/protokuda/dist/themes/*.css`
  (e.g. `import.meta.glob`) rather than hard-coding it.
- **Color utilities:** `pk-<palette-color>-bg` / `-border` / `-color`.

Typical frame:
```html
<div class="pk-frame pk-std pk-sidebar" style="grid-area: nav">
  <div class="pk-title">Navigation</div>
  <div class="pk-items">
    <button class="pk-button" data-code="47-1138">Course</button>
  </div>
  <div class="pk-content">...</div>
  <div class="pk-label"><span>Line one</span></div>
</div>
```
(In the export, put `grid-area` in `layout.css`, not inline.)

**Tokens** (CSS custom properties, settable on `:root` or any element):
- **Geometry:**
  - `--pk-frame-line` (3px), `--pk-frame-bar` (0.5rem), `--pk-frame-side` (1.1rem);
  - `--pk-frame-radius` (2rem), `--pk-sidebar-width` (5rem), `--pk-statusline-height` (2rem);
  - `--pk-inner-radius` (0rem = square proto elbows; ~1.5rem = LCARS curve; needs a unit; applies
    to `pk-std` and `pk-partial` only).
- **Type:** `--pk-sans-font-family`, `--pk-mono-font-family`, `--pk-letter-spacing` (0.06em).
- **Colors (what themes set):**
  - `--pk-backdrop` (page), `--pk-backdrop-light` (frame interior), `--pk-text`;
  - `--pk-primary` and `--pk-on-primary` (frame edges and text on them);
  - `--pk-secondary*`, `--pk-accent*` and `--pk-on-*` (accent is used for inputs and focus rings);
  - `--pk-error` / `--pk-on-error`;
  - `--pk-button-bg/-fg/-hover-bg/-hover-fg`;
  - `--pk-on-backdrop` is optional; when unset, titles and labels follow `--pk-primary`.

If the designer needs something the library can't express, note it as a protokuda change rather than
working around it with overrides here.

## How I like to work

- Make a branch before committing; commit only when I ask; I usually merge and push myself.
- Releases (if any) follow the protokuda pattern: `npm version patch|minor|major` tags and pushes, and a
  GitHub Action publishes or deploys.
- Check UI changes in the browser before saying they work.
- Give me a recommendation rather than a list of options.
- Accessibility matters: keyboard focus visible, WCAG AA contrast, respect reduced motion.
