// public/sw.js
self.addEventListener('push', event => {
  if (!event.data) return

  let title, body, url
  try {
    ({ title, body, url } = event.data.json())
  } catch {
    return
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icon.png',
      badge: '/icon.png',
      data: { url: url ?? '/dashboard' },
      vibrate: [200, 100, 200],
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
