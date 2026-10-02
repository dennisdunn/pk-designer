import { mount } from 'svelte'
import 'protokuda/dist/protokuda.css'
import './app.css'
import './designer/designer.css'
import './themer/themer.css'
import App from './App.svelte'

const app = mount(App, {
  target: /** @type {HTMLElement} */ (document.getElementById('app')),
})

export default app
