# Protokuda Studio

An installable web app (PWA) with two tools for
[Protokuda](https://github.com/dennisdunn/protokuda):

- **Designer**: lay out Protokuda screens visually, then export them as an HTML file and a CSS layout.
- **Themer**: make themes (pick token colors, see them on a sample screen, check contrast), then export a
  theme file.

Protokuda is a Star Trek-ish CSS library by the same author: what Michael Okuda might have drawn on
his way to LCARS. It is deliberately *not* a faithful LCARS copy; it's the prototype era (square
buttons with code numbers, thin bars, optional curved elbows). Keep that spirit in the studio's own UI.

This repo was pk-designer; pk-themer was merged in with its history (its commits touch `src/themer/`).

## Decisions already made

### Both tools

- **Separate from the library.** The studio consumes the *published* `protokuda` npm package (3.x), not
  the library source. Library changes happen in the protokuda repo and arrive here as package updates.
- **One app, not a monorepo.** One Vite build; the tools are views (`#/designer`, `#/themer`). Each keeps
  its own module-level store, so switching views never loses work.
- **Nothing hard-coded from the package**: `virtual:protokuda` (vite.config.js) gives the version, the
  palette (parsed from `dist/protokuda.css`), the built-in themes (from `dist/themes/`) and their names.
  The themer's token schema in `src/themer/lib/tokens.js` is the exception; a test checks it against the
  default theme's tokens.
- **WYSIWYG.** Previews render with the real `protokuda.css` from the installed package.
- **Exports are zips** (`fflate`) named `<name>-v<version>.zip`, with Protokuda links pinned to the
  **exact installed version**, so an export looks exactly like the preview. Exported HTML also links the
  Antonio font (Protokuda doesn't import it; see below).
- **Autosave** to `localStorage` (wrapped in try/catch). The keys (`pk-designer:design`, `pk-themer:theme`)
  predate the merge; keep them so existing autosaves carry over.
- **Theme library.** The themer saves themes to a library (`pk-studio:themes` in localStorage, re-read
  when another window changes it); the designer offers them beside the built-ins. Only hex and
  `var(--pk-*)` values get in (`cleanTheme`), so library themes are safe in the preview's `<style>`.
  Built-in names are reserved. A theme the library no longer has stays selected in a design, marked
  "not in your library".
- **PWA** (`vite-plugin-pwa`, config in vite.config.js): works offline from the first visit; the build
  is precached. Updates wait for the user (`registerType: 'prompt'`, an Update button in the toolbar) rather
  than swapping code mid-edit. Installed, it asks for persistent storage (not in a tab: Firefox would prompt).
- **The font is bundled** (`@fontsource-variable/antonio` files, declared in app.css as `"Antonio"`), so
  it works offline and previews use the family name Protokuda and the exports use. Exports still link
  Google Fonts.
- **Icons:** the mark is Protokuda's elbow (rounded outside, square inside) with a 2x2 grid of palette
  colors. `public/favicon.svg` is the source; `npm run icons` renders the PNGs (needs `rsvg-convert`), which
  are committed so CI doesn't need it.
- **Tooling:** Vite + Svelte 5 (runes). Vitest for the pure modules.

### Designer

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
- **Export:** `index.html` with one element per frame, plus `layout.css` with named `grid-template-areas`.
- **Save/load** designs as `.json` files. A saved file carries copies of its library themes (`themes`,
  by name), so it opens anywhere: Open adds the ones the library lacks; on a name clash the library's wins.
- **Custom themes in exports** are `<name>.css` beside `index.html`, class-only (`classCss`), linked after
  Protokuda. A `:root` theme file would turn the whole page that theme even when only one frame uses it.
- **Frame content is placeholders only**: titles, labels, sidebar buttons and status text. Not arbitrary
  content inside frames; that's a page builder, not this app.

### Themer

- **The theme is one model**: `{ name, label, version, tokens }` where token values are CSS values exactly as a
  theme file writes them: `var(--pk-<palette>)`, `var(--pk-<token>)` or `#hex`. Preview, export,
  autosave and undo all derive from it.
- **The theme `.css` is the save format.** Open parses theme CSS (built `:root`, source `.pk-theme-x`, or
  our export); Export writes `:root, .pk-theme-<name>` in `@layer protokuda.theme`. No separate JSON.
- **Metadata lives in the header comment** (label, `Version N`, the Protokuda version), since CSS has
  nowhere else for it; a custom property would leak into the cascade. `parseTheme` reads label and version.
- **Export** holds `<name>.css` (stable name, for linking) and a `README.md` on using it.
- **Preview**: the theme's tokens as inline custom properties on the stage (inline beats protokuda's layers).
- **Contrast**: WCAG AA, 4.5:1 for text pairs, 3:1 for frame edges and focus rings (`PAIRS` in color.js).
- **Two versions, kept apart by name**: `pkVersion` is the installed Protokuda package's (`virtual:protokuda`
  exports it as `version`; import it as `pkVersion`), `theme.version` is the user's theme counter.

## Plan

Merging into Protokuda Studio, in steps. Done: 1 import pk-themer's history; 2–4 one app with a shell,
one `virtual:protokuda`, shared history and UI CSS; 5 the theme library; 6 the PWA. Next:

7. **Tablet**: `touch-action` on the canvas, 44px handles, File System Access save-in-place where available.
8. **Deploy**: rename the repo to `pk-studio`; Pages URLs don't follow a rename, so leave redirect pages
   for `/pk-designer/` and `/pk-themer/`; archive pk-themer.

**Later, designer:** responsive layouts (a grid per breakpoint), nested frames, more keyboard shortcuts.
**Later, themer:** palette editing (new named colors), contrast suggestions (nearest passing palette
color), a light/dark backdrop toggle in the preview, sharing a theme by URL.

Open questions: whether the designer's export should offer `@3` as well as the exact version (it pins the
exact version for now); whether to inline the CSS as an export option.

## Code map

- `npm run dev` / `npm test` / `npm run check` (svelte-check) / `npm run build`. The service worker only
  runs in a build: `npm run build`, then the `preview` launch config (`vite preview` on port 4173); unregister
  it afterwards, or it keeps serving this app on that port. CI (`ci.yml`) runs check, test and build on every push. Deployed to GitHub Pages by `.github/workflows/deploy.yml`
  on `v*` tags (`npm version ...`) or a manual run.
- `vite.config.js`: the `virtual:protokuda` module (`version`, `palette`, `themes`, `themeNames`; types in
  `src/virtual.d.ts`).
- `src/main.js`, `src/App.svelte`: mount the shell, which shows one tool by the URL hash.
- `src/app.css`: the UI shared by both tools (toolbar, buttons, inspector, fields). `src/designer/designer.css`
  and `src/themer/themer.css` hold each tool's own rules. All three load globally, so a rule that a class
  name in the other tool could match is scoped to `.designer` / `.themer` (the tool's `<main>`).
- `src/shared/`:
  - `route.svelte.js`: the current view, from the hash;
  - `Toolbar.svelte`: the studio header, the tool tabs, the status message and the update notice; each
    tool fills in its buttons;
  - `history.svelte.js`: undo/redo over JSON snapshots; nearby changes and drags group into one step;
  - `library.svelte.js`: the theme library's state (its pure helpers are `src/themer/lib/library.js`);
  - `pwa.svelte.js`: service worker registration, the update/offline notice state, persistent storage.
- `public/`: favicon and app icons. `icons/`: the maskable icon's source and `render.sh`.

**Designer** (`src/designer/`):
- `Designer.svelte`: the tool's toolbar buttons, shortcuts and layout.
- `lib/model.js`: the JSON model (JSDoc typedefs `Design`, `Frame`, `Rect`, ... at the top), geometry (fits/overlap, insert/remove tracks), loading/validation.
- `lib/markup.js`: `index.html` and `layout.css` generation. The preview renders the same strings
  (scoped to `.pv`, frames matched by `data-area`, screen `inert`), so preview and export can't drift.
- `lib/gestures.js`: draw/move/resize/nudge as pure functions from cells to a rectangle.
- `lib/tracks.js`: dragging the line between two tracks, keeping each track's unit.
- `lib/store.svelte.js`: the design `$state` and editor state; components edit the design directly.
  `customThemes` are the library themes the design uses: the preview injects their `classRule`s, Save
  embeds them and Export writes them out.
- Editing rule: frames and tracks change through `model.js` functions (`placeFrame`, `deleteFrame`,
  `insertTrack`, ...) called on `store.design`; plain fields are edited directly. The store holds only
  editor state (selection, history, files). A selected id may outlive its frame; `store.selected` is null then.
- `components/Canvas.svelte`: preview plus the guides layer (cells, hit boxes, handles, separators),
  positioned from the screen's computed `grid-template-columns/rows`.
- `components/ThemeOptions.svelte`: a theme picker's options, built-in then library.

**Themer** (`src/themer/`):
- `Themer.svelte`: the tool's toolbar buttons, shortcuts and layout.
- `lib/tokens.js`: the token schema (`GROUPS`) and value helpers: `bare()` strips `--pk-`,
  `valueKind()` says whether a value is unset, custom hex, a palette color, a token reference or other.
- `lib/theme.js`: the `Theme` type and model operations: naming, `startFrom`, `completeTheme`.
- `lib/css.js`: reading theme CSS (`parseTheme`, `paletteFrom`) and writing it (`themeCss`, `sourceCss`,
  and for the designer `classCss` and `classRule`).
- `lib/library.js`: the library's pure helpers: `cleanTheme`, `readThemes`, `sameTheme`.
- `lib/color.js`: resolving values to colors, cycle detection, contrast and `contrastChecks`.
- `lib/readme.js` + `readme.md`: the export README; edit the Markdown, `{{key}}` placeholders are filled
  in by `readme()`, which throws on a placeholder it has no value for.
- `lib/store.svelte.js`: the theme `$state`, derived contrast `checks`, preview options, autosave, open/export.
- `lib/fixtures.js`: tests only; reads the installed package's built files.
- `components/`: `Preview`, `ThemePanel` (label, name, version, start from), `LibraryPanel` (save,
  edit, delete), `PreviewPanel` (preview-only options), `TokenRow`, `ContrastPanel`.

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
