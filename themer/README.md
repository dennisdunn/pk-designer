# Protokuda Themer
 > Make and check [Protokuda](https://github.com/dennisdunn/protokuda) themes, then export them as a theme file.

[Open the themer](https://dennisdunn.github.io/pk-themer/)

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

- **Export** downloads `<name>.css`. Link it after `protokuda.css` to theme the page; it also defines
  `.pk-theme-<name>` for theming a single frame or section.
- **Copy source** copies the theme in the library's `src/themes/<name>.css` form, for adding it to Protokuda.

### Development

```
npm install
npm run dev      # http://localhost:5173
npm test         # vitest
npm run check    # svelte-check
npm run build    # static site in dist/
```

Svelte 5 and Vite. The Protokuda version, palette and built-in themes come from the installed `protokuda`
package at build time, so updating it is just `npm install protokuda@latest`.

### Releasing

```
npm version minor        # or patch / major
git push --follow-tags
```

Every push runs `.github/workflows/ci.yml` (type-check, tests, build). Pushing a `v*` tag runs
`.github/workflows/deploy.yml`, which does the same and deploys to GitHub Pages. It can also be run by hand
from the Actions tab. In the repo's Settings → Pages, set the source to **GitHub Actions** once.

### License

MIT. See [LICENSE](LICENSE).
