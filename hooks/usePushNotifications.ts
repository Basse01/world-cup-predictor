'use client'
import { useCallback, useEffect, useState } from 'react'

export type PushState = 'unsupported' | 'default' | 'granted' | 'denied'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i)
  }
  return output
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
    const permission = Notification.permission as PushState
    // If browser permission is granted but user explicitly opted out, show as inactive
    if (permission === 'granted' && localStorage.getItem('push_opted_out')) {
      setPushState('default')
    } else {
      setPushState(permission)
    }
  }, [])

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return false
    try {
      await navigator.serviceWorker.register('/sw.js')
      const readyReg = await navigator.serviceWorker.ready

      const permission = await Notification.requestPermission()
      setPushState(permission as PushState)
      if (permission !== 'granted') return false

      const sub = await readyReg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ) as unknown as BufferSource,
      })

      const p256dh = sub.getKey('p256dh')
      const auth = sub.getKey('auth')
      if (!p256dh || !auth) return false

      localStorage.removeItem('push_opted_out')

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          p256dh: btoa(String.fromCharCode(...new Uint8Array(p256dh))),
          auth: btoa(String.fromCharCode(...new Uint8Array(auth))),
        }),
      })

      if (!res.ok) {
        await sub.unsubscribe()
        return false
      }

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
      localStorage.setItem('push_opted_out', '1')
      sessionStorage.removeItem('push_init_done')
      setPushState('default')
    } catch {
      // ignore — browser state and DB state may already be clean
    }
  }, [])

  return { pushState, subscribe, unsubscribe }
}
