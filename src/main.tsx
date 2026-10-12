import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './styles.css'

registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return
    const check = () => { if (navigator.onLine) void registration.update() }
    document.addEventListener('visibilitychange', () => { if (!document.hidden) check() })
    window.addEventListener('online', check)
    window.setInterval(check, 60 * 60 * 1000)
  }
})
createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>)
