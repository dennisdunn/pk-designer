<script>
  // The shell: one tool at a time by the URL hash. The project autosave and both tools' undo
  // histories are kept here, so they follow every change whichever tool is showing (a theme
  // renamed in the themer changes the design too).
  import { store as designer } from './designer/lib/store.svelte.js'
  import Designer from './designer/Designer.svelte'
  import { launch } from './shared/launch.svelte.js'
  import { project } from './shared/project.svelte.js'
  import { route } from './shared/route.svelte.js'
  import { errorText, status } from './shared/status.svelte.js'
  import { store as themer } from './themer/lib/store.svelte.js'
  import Themer from './themer/Themer.svelte'

  $effect(() => project.changed())
  $effect(() => designer.changed())
  $effect(() => themer.changed())

  // Files opened with the installed app open like Open does.
  $effect(() => {
    const next = launch.waiting.shift()
    if (!next) return
    const handle = /\.json$/i.test(next.file.name) ? next.handle : null
    project.open(next.file, handle).then(
      ({ message, theme }) => {
        status.message = message
        if (theme) location.hash = '#/themer'
      },
      (err) => (status.message = `Couldn't open ${next.file.name}: ${errorText(err)}`),
    )
  })
</script>

{#if route.view === 'themer'}
  <Themer />
{:else}
  <Designer />
{/if}
