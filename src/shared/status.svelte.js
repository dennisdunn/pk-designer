// The toolbar's status message, which both the global actions and each tool set.

export const status = $state({ message: '' })

/** @param {unknown} err */
export const errorText = (err) => (err instanceof Error ? err.message : String(err))
