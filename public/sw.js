const CACHE_NAME = 'ramprep-sweat-mode-v1-2'
const APP_SHELL = ['./', './index.html', './manifest.webmanifest', './pwa-icon.svg', './favicon.svg', './ramrep-logo.svg', './apple-touch-icon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)

  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return
  }

  if (url.pathname.includes('/@vite') || url.pathname.includes('/src/') || url.pathname.includes('/node_modules/')) {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy))
          }
          return response
        })
        .catch(() => caches.match('./index.html')),
    )
    return
  }

  if (url.pathname.endsWith('.mp4') || url.hostname.includes('youtube') || url.hostname.includes('youtu.be')) {
    return
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
        }
        return response
      })
      .catch(() => caches.match(request).then((cached) => cached ?? new Response('', { status: 503, statusText: 'Offline' }))),
  )
})
