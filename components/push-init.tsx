'use client'
import { useEffect } from 'react'
import { usePushNotifications } from '@/hooks/usePushNotifications'

export default function PushInit() {
  const { pushState, subscribe } = usePushNotifications()

  useEffect(() => {
    if (pushState === 'unsupported' || pushState === 'denied') return
    if (sessionStorage.getItem('push_init_done')) return

    // Already granted: silently re-register SW and refresh subscription
    // Not yet asked: wait 3 s before prompting (less intrusive than immediate)
    const delay = pushState === 'granted' ? 0 : 3000
    const timer = setTimeout(async () => {
      const ok = await subscribe()
      if (ok) sessionStorage.setItem('push_init_done', '1')
    }, delay)

    return () => clearTimeout(timer)
  }, [pushState, subscribe])

  return null
}
