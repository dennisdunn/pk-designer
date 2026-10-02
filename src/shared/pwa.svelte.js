// The service worker: the app works offline, and a new version waits for the user to reload
// instead of replacing the app mid-edit. Both tools autosave, so a reload only loses undo history.

import { registerSW } from 'virtual:pwa-register'

export const pwa = $state({
  /** A new version is downloaded and waiting. */
  needRefresh: false,
  /** Everything is cached; shown briefly the first time. */
  offlineReady: false,
})

const update = registerSW({
  onNeedRefresh() {
    pwa.needRefresh = true
  },
  onOfflineReady() {
    pwa.offlineReady = true
    setTimeout(() => (pwa.offlineReady = false), 6000)
  },
})

/** Switch to the waiting version and reload. */
export const reloadToUpdate = () => update(true)

// Autosaves and the theme library live in browser storage, which browsers may clear when space
// runs low (Safari after a week unused). Installed, ask to keep it; in a tab, Firefox would
// show a permission prompt for this on load, so don't.
if (matchMedia('(display-mode: standalone)').matches) navigator.storage?.persist?.()
