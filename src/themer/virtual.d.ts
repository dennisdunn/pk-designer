declare module 'virtual:protokuda' {
  /** Version of the installed protokuda package. */
  export const version: string
  /** Palette colors from protokuda.css: name (without `--pk-`) → hex. */
  export const palette: Record<string, string>
  /** The package's themes, by name, sorted. */
  export const themes: Record<string, import('./lib/theme.js').Theme>
}
