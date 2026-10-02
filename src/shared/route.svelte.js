// Which tool is showing, from the URL hash (#/designer, #/themer). Each tool keeps its own
// module-level store, so switching views never loses work.

const VIEWS = /** @type {const} */ (['designer', 'themer'])

/** @returns {(typeof VIEWS)[number]} */
function fromHash() {
  const view = location.hash.replace(/^#\/?/, '')
  return VIEWS.find((v) => v === view) ?? 'designer'
}

export const route = $state({
  view: fromHash(),
  /** True after a switch, so the new view's toolbar can take focus back to its tab. */
  switched: false,
})

window.addEventListener('hashchange', () => {
  route.view = fromHash()
  route.switched = true
})
