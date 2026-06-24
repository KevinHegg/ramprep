import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).then((registration) => {
      const notifyUpdateReady = () => {
        window.dispatchEvent(new CustomEvent('ramprep:update-ready'))
      }

      if (registration.waiting) {
        notifyUpdateReady()
      }

      registration.addEventListener('updatefound', () => {
        const worker = registration.installing
        if (!worker) {
          return
        }

        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            notifyUpdateReady()
          }
        })
      })
    })
  })
}
