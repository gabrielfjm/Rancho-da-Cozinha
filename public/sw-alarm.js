// Ações das notificações dos relógios da cozinha.
// Importado pelo service worker gerado pelo vite-plugin-pwa (workbox.importScripts).
self.addEventListener('notificationclick', event => {
  const data = event.notification.data || {}
  if (!data.id) return
  event.notification.close()
  const action = event.action || 'open'
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const client of windows) client.postMessage({ type: 'rancho-relogio', action, id: data.id })
    if (action !== 'open') return
    if (windows[0]) return windows[0].focus()
    return self.clients.openWindow('/')
  })())
})
