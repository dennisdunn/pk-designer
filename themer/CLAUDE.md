# Protokuda Themer

A browser app for making [Protokuda](https://github.com/dennisdunn/protokuda) themes: pick token colors,
see them on a sample screen, check contrast, export a theme file. A sibling of
[pk-designer](https://github.com/dennisdunn/pk-designer); its UI follows the designer's look (Okuda-style
square buttons with code numbers, thin bars, no curves) and its stack and conventions.

## Decisions already made

- **Separate repo**, consuming the *published* `protokuda` npm package (3.x). Library changes happen in
  the protokuda repo.
- **The theme is one model**: `{ name, label, version, tokens }` where token values are CSS values exactly as a
  theme file writes them: `var(--pk-<palette>)`, `var(--pk-<token>)` or `#hex`. Preview, export,
  autosave and undo all derive from it.
- **The theme `.css` is the save format.** Open parses theme CSS (built `:root`, source `.pk-theme-x`, or
  our export); Export writes `:root, .pk-theme-<name>` in `@layer protokuda.theme`. No separate JSON.
- **Metadata lives in the header comment** (label, `Version N`, the Protokuda version), since CSS has
  nowhere else for it; a custom property would leak into the cascade. `parseTheme` reads label and version.
- **Export is a zip** (`fflate`), `<name>-v<version>.zip`, as in pk-designer: `<name>.css` (stable name, for
  linking) and a `README.md` on using it, with CDN links pinned to the installed Protokuda version.
- **Nothing hard-coded from the package**: `virtual:protokuda` (vite.config.js) gives the version, the
  palette (parsed from `dist/protokuda.css`) and the built-in themes (from `dist/themes/`). The token
  schema in `src/lib/theme.js` is the exception; a test checks it against the default theme's tokens.
- **WYSIWYG preview**: the real `protokuda.css`, with the theme's tokens as inline custom properties on
  the stage (inline beats protokuda's layers).
- **Contrast**: WCAG AA, 4.5:1 for text pairs, 3:1 for frame edges and focus rings (`PAIRS` in theme.js).

## Code map

- `src/lib/theme.js`: token schema (`GROUPS`), parse/write theme CSS, the export README, resolve values
  to colors, contrast.
- `src/lib/store.svelte.js`: the theme `$state`, preview options, autosave, open/export.
- `src/lib/history.svelte.js`: undo/redo over JSON snapshots (copied from pk-designer).
- `src/components/`: `Preview`, `ThemePanel` (label, name, version, start from, preview options),
  `TokenRow`, `ContrastPanel`.
- `npm run dev` / `npm test` / `npm run check` / `npm run build`. CI and Pages deploy as in pk-designer.

## Later

Palette editing (new named colors), contrast suggestions (nearest passing palette color), a light/dark
backdrop toggle in the preview, sharing a theme by URL.

## How I like to work

- Make a branch before committing; commit only when I ask; I usually merge and push myself.
- Releases: `npm version patch|minor|major` tags and pushes; a GitHub Action deploys.
- Check UI changes in the browser before saying they work.
- Give me a recommendation rather than a list of options.
- Accessibility matters: keyboard focus visible, WCAG AA contrast, respect reduced motion.
