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
Published at https://dennisdunn.github.io/pk-studio/. The old `/pk-designer/` and `/pk-themer/` addresses
are redirect pages in the dennisdunn.github.io repo; they share the origin, so autosaves carry over.

## Decisions already made

### Both tools

- **Separate from the library.** The studio consumes the *published* `protokuda` npm package (3.x), not
  the library source. Library changes happen in the protokuda repo and arrive here as package updates.
- **One app, not a monorepo.** One Vite build; the tools are views (`#/designer`, `#/themer`). Each keeps
  its own module-level store, so switching views never loses work.
- **One document: the Studio project.** A `.json` file `{ format: 2, design, themes, editing }`: the
  designer's design and the project's own themes (a list; `editing` is the one the themer has open).
  New, Open, Save and Export are global, in the toolbar, and act on the whole project. Open also takes
  format-1 files (the designer's old design files) and theme `.css` files (added to the project's themes).
- **One title and version**, the project's. They live in `design.page` (so the designer's undo covers
  them), are edited in the toolbar, and name every file (`<title>-v<version>.json/.zip`); exported theme
  files carry the version in their header. Themes have no version of their own.
- **Undo is per tool**, in the same toolbar spot: the designer's history covers the design, the
  themer's the project's themes. After New or Open, each tool's Undo brings back its own part.
- **Nothing hard-coded from the package**: `virtual:protokuda` (vite.config.js) gives the version, the
  palette (parsed from `dist/protokuda.css`), the built-in themes (from `dist/themes/`), their names, the
  default theme (the one protokuda.css's `:root` matches; the build fails if none does) and the `:root`
  values themselves (`rootTokens`, e.g. the page-token placeholders). The token
  schema in `src/shared/theme/tokens.js` is the exception; a test checks it against the default theme's tokens.
- **Imports go one way.** The two tools never import each other; both import `src/shared/`. Theme code
  either tool needs (the model, token schema, theme CSS, library helpers) lives in `src/shared/theme/`.
- **WYSIWYG.** Previews render with the real `protokuda.css` from the installed package.
- **Export is one zip** (`fflate`) named `<title>-v<version>.zip`: `index.html`, `layout.css`, a
  class-only `<name>.css` per project theme (`classCss`; a `:root` theme file would turn the whole page
  that theme even when only one frame uses it), and a `README.md`. Protokuda links are pinned to the
  **exact installed version**, so an export looks exactly like the preview. Exported HTML also links the
  Antonio font (Protokuda doesn't import it; see below).
- **Autosave** of the whole project to `localStorage` under `pk-studio:project` (wrapped in try/catch).
  With no project autosave yet, the stores migrate the pre-project keys (`pk-designer:design`,
  `pk-themer:theme`, plus the library themes the old design used); those keys are left in place.
- **Project themes and the library.** Project themes travel in the project file; the designer offers
  them beside the built-ins. The library (`pk-studio:themes` in localStorage, re-read when another window
  changes it) keeps themes in this browser for any project: the themer saves into it and adds from it,
  and the designer's pickers list library themes too, copying one into the project when it's chosen.
  Every way in goes through `cleanTheme` (hex and `var(--pk-*)` colors, plain lengths for geometry), so
  project and library themes are safe in the preview's `<style>`. Built-in names are reserved. Renaming
  a project theme renames it in the design too.
- **PWA** (`vite-plugin-pwa`, config in vite.config.js): works offline from the first visit; the build
  is precached. Updates wait for the user (`registerType: 'prompt'`, an Update button in the toolbar) rather
  than swapping code mid-edit. Installed, it asks for persistent storage (not in a tab: Firefox would prompt).
- **The font is bundled** (`@fontsource-variable/antonio` files, declared in app.css as `"Antonio"`), so
  it works offline and previews use the family name Protokuda and the exports use. Exports still link
  Google Fonts.
- **Icons:** the mark is Protokuda's elbow (rounded outside, square inside) with a 2x2 grid of palette
  colors. `public/favicon.svg` is the source; `npm run icons` renders the PNGs (needs `rsvg-convert`), which
  are committed so CI doesn't need it.
- **Files:** where the browser has File System Access (Chromium on desktop), Open keeps a handle and
  Save writes back to the same file while its name (`<title>-v<version>.json`) still matches; a
  new title or version asks where to save. Elsewhere (Safari, Firefox, iPad) Open uses a file input and
  Save downloads; so does a browser that offers File System Access but refuses this page the picker or
  the write (`NotAllowedError`/`SecurityError`, e.g. an embedded browser). Installed, "Open with" takes `.json` projects and `.css` themes (`file_handlers`).
- **Toolbar:** the textmark with the project's title and version under it, then one row of buttons:
  the tool tabs, New/Open/Save/Export, then the open tool's group: Undo and Redo first (rendered by
  `Toolbar.svelte` from the tool's store), then the tool's own buttons (the designer's Add frame). The
  status and update messages sit in a strip under the buttons that keeps its height while empty. The
  buttons fit one row from about 1200px wide; mind that when adding any.
- **Touch and tablets:** the canvas takes every touch for drawing (`touch-action: none`), so it must never
  need scrolling sideways: below 52rem the designer stacks the inspector under a full-width canvas. On
  coarse pointers, handles and track lines get ~44px hit areas; with no hover, the lines stay visible.
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
  - `page`: title and version (the project's), page theme, alert. No tokens: geometry is the theme's.
    Older designs' `page.tokens` move into the page theme on load if it's a project theme (`migrateTokens`).
- **Export:** `index.html` with one element per frame, plus `layout.css` with named `grid-template-areas`;
  `index.html` links the project themes the design uses, after Protokuda.
- **Frame content is placeholders only**: titles, labels, sidebar buttons and status text. Not arbitrary
  content inside frames; that's a page builder, not this app.

### Themer

- **A theme is what the frames look like**, shape as well as color: `{ name, label, tokens }` where
  color values are CSS values exactly as a theme file writes them (`var(--pk-<palette>)`,
  `var(--pk-<token>)` or `#hex`) and the optional Geometry group holds plain lengths (edge widths,
  sidebar and statusline sizes, outer corners, the inner elbow curve). Unset geometry follows
  Protokuda's defaults, or the page theme's when the theme is on one frame (custom properties inherit).
  Geometry tokens the installed protokuda.css doesn't know yet (`knownTokens`) are hidden.
- **The themer edits one of the project's themes**, picked with the designer's theme options: a project
  theme opens, a built-in makes a copy, a library theme is added; with none, it shows an empty state. Theme CSS is still what Open reads (built `:root`, source `.pk-theme-x`, or our
  export) and what Export writes, in `@layer protokuda.theme`.
- **Metadata lives in the header comment** (label, the project's `Version N`, the Protokuda version), since
  CSS has nowhere else for it; a custom property would leak into the cascade. `parseTheme` reads the label.
- **Preview**: the theme's tokens as inline custom properties on the stage (inline beats protokuda's layers).
- **Contrast**: WCAG AA, 4.5:1 for text pairs, 3:1 for frame edges and focus rings (`PAIRS` in color.js).
- **Two versions, kept apart by name**: `pkVersion` is the installed Protokuda package's (`virtual:protokuda`
  exports it as `version`; import it as `pkVersion`), `design.page.version` is the project's.

## Plan

**Later, designer:** responsive layouts (a grid per breakpoint), nested frames, more keyboard shortcuts.
**Later, themer:** palette editing (new named colors), contrast suggestions (nearest passing palette
color), a light/dark backdrop toggle in the preview, sharing a theme by URL.

Open questions: whether the designer's export should offer `@3` as well as the exact version (it pins the
exact version for now); whether to inline the CSS as an export option.

## Code map

- `npm run dev` / `npm test` / `npm run check` (svelte-check) / `npm run build`. The service worker only
  runs in a build: `npm run build`, then the `preview` launch config (`vite preview` on port 4173); unregister
  it afterwards, or it keeps serving this app on that port. CI (`ci.yml`) runs check, test and build on every push. Deployed to GitHub Pages by `.github/workflows/deploy.yml`
  on `v*` tags or a manual run; `npm version ...` fetches tags first (`preversion`), then makes the tag and pushes it (`postversion`).
- `.github/dependabot.yml`: weekly update pull requests. Each runtime dependency (Protokuda above all) gets
  its own; dev tooling and GitHub Actions are grouped. TypeScript majors are held back until svelte-check
  supports them (its peer dependency is `^5 || ^6`).
- `vite.config.js`: the `virtual:protokuda` module (`version`, `palette`, `themes`, `themeNames`,
  `defaultTheme`, `rootTokens`, `knownTokens`; types in `src/virtual.d.ts`). It imports `src/shared/theme/`, so those modules must stay
  free of browser-only code.
- `src/main.js`, `src/App.svelte`: mount the shell, which shows one tool by the URL hash, runs the
  project autosave and both tools' history effects (so they follow every change, whichever tool is
  showing), and opens files launched with the installed app.
- CSS, in three places:
  - `src/app.css`: the UI shared by both tools (toolbar, buttons, inspector, fields), global;
  - a component's own `<style>`: anything only that component uses (Svelte scopes it);
  - `src/designer/designer.css`, `src/themer/themer.css`: what several of a tool's components share, plus
    its layout. These load globally too, so every rule starts with `.designer` / `.themer` (the tool's `<main>`).
- `src/shared/`:
  - `route.svelte.js`: the current view, from the hash;
  - `Toolbar.svelte`: the studio header: project title and version, the tool tabs, New/Open/Save/Export,
    Undo/Redo for the open tool, the status message and the update notice; each tool adds its buttons;
  - `project.svelte.js`: the project: its file format, New/Open/Save/Export and autosave. The designer
    registers its part (`setDesign`), so this never imports a tool;
  - `themes.svelte.js`: the project's themes (`projectThemes`: add, remove, rename, adopt from the library);
  - `saved.js`: the project autosave read at startup, or the pre-project autosaves to migrate;
  - `status.svelte.js`: the toolbar's status message;
  - `ThemeOptions.svelte`: a theme picker's options, the same in both tools: built-in, the project's,
    then the library's (choosing one adopts it into the project);
  - `readme.js` + `readme.md`: the export README; edit the Markdown, `{{key}}` placeholders are filled
    in by `readme()`, which throws on a placeholder it has no value for;
  - `history.svelte.js`: undo/redo over JSON snapshots; nearby changes and drags group into one step;
  - `autosave.js`: `loadAutosave`, `autosave` (save to localStorage) and `noteHistory`;
  - `shortcuts.js`: `undoShortcuts(store)`, the undo/redo keys for `<svelte:window>`, with the one list of
    fields that keep their own native undo;
  - `library.svelte.js`: the theme library's state (its pure helpers are `theme/library.js`);
  - `pwa.svelte.js`: service worker registration, the update/offline notice state, persistent storage;
  - `files.js`: `pickFile`, `saveFile` (in place where possible), `download`, and `takeFile` for file inputs.
    The pickers come from `window` by default; tests pass stand-ins;
  - `launch.svelte.js`: files opened with the installed app, waiting for the shell to open them;
  - `theme/`, the theme model both tools use, with its tests:
    - `tokens.js`: the token schema (`GROUPS`, colors then Geometry; `COLOR_TOKENS`) and value helpers:
      `bare()` strips `--pk-`, `valueKind()` says whether a color value is unset, custom hex, a palette
      color, a token reference or other; `isLength`, `sameLength` for geometry;
    - `theme.js`: the `Theme` type and model operations: naming (`freeName`), `startFrom`, `completeTheme`,
      `defaultThemeOf`;
    - `css.js`: reading theme CSS (`parseTheme`, `paletteFrom`, `rootDeclarations`) and writing it
      (`themeCss`, and for the designer `classCss` and `classRule`);
    - `library.js`: pure helpers for library and project themes: `cleanTheme`, `readThemes`, `sameTheme`;
    - `fixtures.js`: tests only; reads the installed package's built files.
- `public/`: favicon and app icons. `icons/`: the maskable icon's source and `render.sh`.

**Designer** (`src/designer/`):
- `Designer.svelte`: the tool's toolbar button (Add frame), shortcuts and layout.
- `lib/model.js`: the JSON model (JSDoc typedefs `Design`, `Frame`, `Rect`, ... at the top), geometry (fits/overlap, insert/remove tracks), loading/validation.
- `lib/markup.js`: `index.html` and `layout.css` generation. The preview renders the same strings
  (scoped to `.pv`, frames matched by `data-area`, screen `inert`), so preview and export can't drift.
- `lib/gestures.js`: draw/move/resize/nudge as pure functions from cells to a rectangle.
- `lib/tracks.js`: dragging the line between two tracks, keeping each track's unit.
- `lib/measure.js`: `measureGrid`, where the screen's tracks are in canvas pixels, from its computed style
  and bounding boxes; the canvas positions its guides from it.
- `lib/store.svelte.js`: the design `$state` and editor state; components edit the design directly.
  Registers the design with the project. `customThemes` are the project themes the design uses: the
  preview injects their `classRule`s and the export links them.
- Editing rule: frames and tracks change through `model.js` functions (`placeFrame`, `deleteFrame`,
  `insertTrack`, ...) called on `store.design`; plain fields are edited directly. The store holds only
  editor state (selection, history, files). A selected id may outlive its frame; `store.selected` is null then.
- `components/Canvas.svelte`: preview plus the guides layer (cells, hit boxes, handles, separators),
  positioned by `measureGrid`.

**Themer** (`src/themer/`):
- `Themer.svelte`: the tool's shortcuts and layout (Geometry first among the token groups).
- `lib/color.js`: resolving values to colors, cycle detection, contrast and `contrastChecks`.
- `lib/store.svelte.js`: the open theme (derived from `projectThemes`), contrast `checks`, preview
  options, history over the project's themes, create and reset.
- `components/`: `Preview`, `ThemesPanel` (which theme to edit, and remove it), `ThemePanel`
  (label, name, reset colors), `LibraryPanel` (save, add to project, delete), `PreviewPanel`
  (preview-only options), `TokenRow` (a color), `GeometryRow` (a length), `ContrastPanel`.

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
  - `--pk-elbow-radius` and `--pk-end-radius` (3.1+): the outer corners on the elbow side and the far
    side, both following `--pk-frame-radius` when unset;
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
