<script>
  import { onMount } from 'svelte'
  import { version } from 'virtual:protokuda'
  import { route } from './route.svelte.js'

  /** @type {{ message: string, children: import('svelte').Snippet }} */
  let { message, children } = $props()

  const TOOLS = [
    { view: 'designer', label: 'Designer', code: '00-0001' },
    { view: 'themer', label: 'Themer', code: '00-0002' },
  ]

  /** @type {HTMLElement | undefined} */
  let current = $state()

  // Switching tools replaces the whole view, toolbar included; put focus back on the tab.
  onMount(() => {
    if (route.switched) current?.focus()
    route.switched = false
  })
</script>

<header class="toolbar">
  <h1><span class="mark">Protokuda</span> Studio <span class="version">pk {version}</span></h1>
  <nav class="tabs" aria-label="Tool">
    {#each TOOLS as tool (tool.view)}
      {#if route.view === tool.view}
        <a bind:this={current} href="#/{tool.view}" aria-current="page" data-code={tool.code}>{tool.label}</a>
      {:else}
        <a href="#/{tool.view}" data-code={tool.code}>{tool.label}</a>
      {/if}
    {/each}
  </nav>
  {@render children()}
  <p class="message" role="status">{message}</p>
</header>
