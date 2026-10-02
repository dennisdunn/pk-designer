/// <reference types="vite-plugin-pwa/client" />

declare module 'virtual:protokuda' {
  /** Version of the installed protokuda package. */
  export const version: string
  /** Palette colors from protokuda.css: name (without `--pk-`) → hex. */
  export const palette: Record<string, string>
  /** The package's themes, by name, sorted. */
  export const themes: Record<string, import('./shared/theme/theme.js').Theme>
  /** The package's theme names, sorted. */
  export const themeNames: string[]
  /** The theme a page gets with no theme class (protokuda.css's `:root` values). */
  export const defaultTheme: string
}
