'use client'
import { useCallback, useEffect, useState } from 'react'

export type PushState = 'unsupported' | 'default' | 'granted' | 'denied'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export function usePushNotifications() {
  const [pushState, setPushState] = useState<PushState>('default')

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('Notification' in window) ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window)
    ) {
      setPushState('unsupported')
      return
    }
    setPushState(Notification.permission as PushState)
  }, [])

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return false
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      const permission = await Notification.requestPermission()
      setPushState(permission as PushState)
      if (permission !== 'granted') return false

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      })

      const p256dh = sub.getKey('p256dh')
      const auth = sub.getKey('auth')
      if (!p256dh || !auth) return false

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          p256dh: btoa(String.fromCharCode(...new Uint8Array(p256dh))),
          auth: btoa(String.fromCharCode(...new Uint8Array(auth))),
        }),
      })

      return true
    } catch {
      return false
    }
  }, [])

  const unsubscribe = useCallback(async (): Promise<void> => {
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js')
      if (reg) {
        const sub = await reg.pushManager.getSubscription()
        if (sub) await sub.unsubscribe()
      }
      await fetch('/api/push/subscribe', { method: 'DELETE' })
      setPushState('default')
    } catch {
      // ignore — browser state and DB state may already be clean
    }
  }, [])

  return { pushState, subscribe, unsubscribe }
}
