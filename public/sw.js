// public/sw.js
self.addEventListener('push', event => {
  if (!event.data) return

  let title, body, url
  try {
    ({ title, body, url } = event.data.json())
  } catch {
    return
  }

  url = url ?? '/dashboard'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // If the app is open and visible, send an in-app toast instead of (or in addition to) OS notification
      const visibleClients = windowClients.filter(c => c.visibilityState === 'visible')
      visibleClients.forEach(c => c.postMessage({ type: 'PUSH_TOAST', title, body, url }))

      // Always show the OS notification (for background / lock screen)
      return self.registration.showNotification(title, {
        body,
        icon: '/icon.png',
        badge: '/icon.png',
        data: { url },
        vibrate: [200, 100, 200],
      })
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const targetUrl = new URL(
    event.notification.data?.url ?? '/dashboard',
    self.location.origin
  ).href

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        const existing = windowClients.find(c => c.url === targetUrl)
        if (existing) return existing.focus()
        return clients.openWindow(targetUrl)
      })
  )
})
