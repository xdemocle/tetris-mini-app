import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
import WebApp from '@twa-dev/sdk'

// Initialize Telegram WebApp SDK
WebApp.ready()
WebApp.expand()

// Set theme based on Telegram color scheme
document.documentElement.classList.add(WebApp.colorScheme)

const app = mount(App, {
  target: document.getElementById('app')!,
})

export default app
