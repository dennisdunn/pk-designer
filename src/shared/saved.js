// What the last session left in localStorage, read once at startup: the project autosave, or the
// autosaves from before the tools shared one file, which the stores migrate from.

import { loadAutosave } from './autosave.js'

export const PROJECT_KEY = 'pk-studio:project'

/** The autosaved project file (format 2), unvalidated; each store checks its own part. */
export const savedProject = loadAutosave(PROJECT_KEY, (raw) => (raw && typeof raw === 'object' && raw.format === 2 ? raw : null))

/**
 * The designer's and themer's own autosaves from before the project file. Kept in storage
 * (the old /pk-designer/ and /pk-themer/ addresses redirect here), but only read when there's
 * no project autosave yet.
 */
export const legacy = savedProject
  ? { design: null, theme: null }
  : {
      design: loadAutosave('pk-designer:design', (raw) => raw),
      theme: loadAutosave('pk-themer:theme', (raw) => raw),
    }
