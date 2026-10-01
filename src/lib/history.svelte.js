// Undo/redo over snapshots of the design (JSON strings).
//
// The store reports every state with `note()`. Changes that arrive close together are
// grouped into one step (a burst of typing, a run of arrow-key nudges), and so is
// everything between `begin()` and `end()` (a drag). A group that ends where it
// started leaves no step behind.

export class History {
  past = $state.raw([])
  future = $state.raw([])

  #baseline = null // state before the open group (or the current state when idle)
  #current = null
  #open = false
  #gesture = false
  #timer = null

  constructor({ limit = 100, groupMs = 500 } = {}) {
    this.limit = limit
    this.groupMs = groupMs
  }

  get canUndo() {
    return this.past.length > 0
  }

  get canRedo() {
    return this.future.length > 0
  }

  note(json) {
    if (this.#baseline === null) {
      this.#baseline = this.#current = json
      return
    }
    this.#current = json
    if (!this.#open) {
      if (json === this.#baseline) return
      this.past = [...this.past, this.#baseline].slice(-this.limit)
      this.future = []
      this.#open = true
    }
    clearTimeout(this.#timer)
    if (!this.#gesture) this.#timer = setTimeout(() => this.#close(), this.groupMs)
  }

  /** Hold the current group open until `end()`, however long it takes. */
  begin() {
    this.#gesture = true
    clearTimeout(this.#timer)
  }

  end() {
    this.#gesture = false
    this.#close()
  }

  /** The state to restore, or null if there's nothing to undo. */
  undo() {
    this.#close()
    if (!this.past.length) return null
    const prev = this.past.at(-1)
    this.past = this.past.slice(0, -1)
    this.future = [...this.future, this.#current]
    this.#baseline = this.#current = prev
    return prev
  }

  /** The state to restore, or null if there's nothing to redo. */
  redo() {
    this.#close()
    if (!this.future.length) return null
    const next = this.future.at(-1)
    this.future = this.future.slice(0, -1)
    this.past = [...this.past, this.#current].slice(-this.limit)
    this.#baseline = this.#current = next
    return next
  }

  #close() {
    clearTimeout(this.#timer)
    if (!this.#open) return
    this.#open = false
    if (this.#current === this.#baseline) this.past = this.past.slice(0, -1)
    this.#baseline = this.#current
  }
}
