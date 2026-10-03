<script>
  // The studio header. Left: the textmark with the project's title and version under it, then the
  // tool tabs, then New, Open, Save and Export, which act on the whole project, then the open tool's
  // own group: Undo and Redo always first, in the same place in every tool, then the tool's buttons. Stacking the project under the textmark keeps every button on one line, and
  // leaves room under the buttons for the status and update messages.
  import { onMount } from 'svelte'
  import { version as pkVersion } from 'virtual:protokuda'
  import { hasFileAccess, pickFile, takeFile } from './files.js'
  import { OPEN_FILE, project } from './project.svelte.js'
  import { pwa, reloadToUpdate } from './pwa.svelte.js'
  import { route } from './route.svelte.js'
  import { errorText, status } from './status.svelte.js'

  /**
   * @type {{
   *   history: { history: { canUndo: boolean, canRedo: boolean }, undo(): void, redo(): void },
   *   children?: import('svelte').Snippet,
   * }}
   */
  let { history, children } = $props()

  const TOOLS = [
    { view: 'designer', label: 'Designer', code: '00-0001' },
    { view: 'themer', label: 'Themer', code: '00-0002' },
  ]
  const toolLabel = $derived(TOOLS.find((t) => t.view === route.view)?.label ?? '')

  const meta = $derived(project.meta)

  /** @type {HTMLElement | undefined} */
  let current = $state()
  /** @type {HTMLInputElement} */
  let fileInput

  // Switching tools replaces the whole view, toolbar included; put focus back on the tab.
  onMount(() => {
    if (route.switched) current?.focus()
    route.switched = false
  })

  function newProject() {
    project.newProject()
    status.message = 'New project. Undo in either tool brings back its part of the old one.'
  }

  // With File System Access, the system picker, so Save can write back to the file; else a file input.
  async function open() {
    if (!hasFileAccess) return fileInput.click()
    try {
      const picked = await pickFile(OPEN_FILE)
      if (picked) await openFile(picked.file, /\.json$/i.test(picked.file.name) ? picked.handle : null)
    } catch (err) {
      status.message = `Couldn't open the file: ${errorText(err)}`
    }
  }

  /** @param {Event} e */
  function inputChanged(e) {
    const file = takeFile(e)
    if (file) openFile(file)
  }

  /**
   * @param {File} file
   * @param {import('./files.js').FileHandle | null} [handle]
   */
  async function openFile(file, handle = null) {
    try {
      const { message, theme } = await project.open(file, handle)
      status.message = message
      if (theme) location.hash = '#/themer'
    } catch (err) {
      status.message = `Couldn't open ${file.name}: ${errorText(err)}`
    }
  }

  async function save() {
    try {
      const saved = await project.save()
      if (saved) status.message = `Saved ${saved}.`
    } catch (err) {
      status.message = `Couldn't save: ${errorText(err)}`
    }
  }

  function exportZip() {
    status.message = `Exported ${project.exportZip()}.`
  }

  /** @param {Event & { currentTarget: HTMLInputElement }} e */
  function setVersion(e) {
    const n = Number(e.currentTarget.value)
    if (Number.isInteger(n) && n >= 1) meta.version = n
    else e.currentTarget.value = String(meta.version)
  }
</script>

<header class="toolbar">
  <div class="brand">
    <h1><span class="mark">Protokuda</span> Studio <span class="version">pk {pkVersion}</span></h1>
    <div class="project" role="group" aria-label="Project">
      <input class="title" aria-label="Project title" bind:value={meta.title} autocomplete="off"
        title="The project's title: the exported page's title, and the start of every filename" />
      <label class="ver">v<input type="number" min="1" step="1" aria-label="Project version"
          value={meta.version} onchange={setVersion} title="The project's version, in every filename" /></label>
    </div>
  </div>

  <div class="actions">
    <nav class="tabs" aria-label="Tool">
      {#each TOOLS as tool (tool.view)}
        {#if route.view === tool.view}
          <a bind:this={current} href="#/{tool.view}" aria-current="page" data-code={tool.code}>{tool.label}</a>
        {:else}
          <a href="#/{tool.view}" data-code={tool.code}>{tool.label}</a>
        {/if}
      {/each}
    </nav>
    <div class="global">
      <nav aria-label="Project file">
        <button type="button" data-code="01-0001" onclick={newProject}>New</button>
        <button type="button" data-code="01-0002" title="Open a project, or a theme .css to add to it" onclick={open}>Open</button>
        <button type="button" data-code="01-0003" title="Save the project as {project.baseName}.json" onclick={save}>Save</button>
        <button type="button" class="alt" data-code="01-0004"
          title="Download the page, its layout and the project's themes as {project.baseName}.zip" onclick={exportZip}>Export</button>
        <input bind:this={fileInput} type="file" accept=".json,application/json,.css,text/css" hidden onchange={inputChanged} />
      </nav>
    </div>

    <div class="tool">
      <nav aria-label="{toolLabel} edit">
        <button type="button" data-code="02-0001" aria-keyshortcuts="Control+Z Meta+Z" title="Undo (Ctrl/Cmd+Z)"
          disabled={!history.history.canUndo} onclick={() => history.undo()}>Undo</button>
        <button type="button" data-code="02-0002" aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z Control+Y"
          title="Redo (Shift+Ctrl/Cmd+Z)" disabled={!history.history.canRedo} onclick={() => history.redo()}>Redo</button>
        {@render children?.()}
      </nav>
    </div>
  </div>

  <p class="message" role="status">{status.message}</p>
  <!-- Always rendered, so screen readers announce what appears in it. -->
  <p class="update" role="status">{#if pwa.needRefresh}New version ready.<button type="button" class="alt" data-code="00-0003"
        title="Reload to update; autosaved work carries over" onclick={reloadToUpdate}>Update</button>{:else if pwa.offlineReady}Ready to work offline.{/if}</p>
</header>
