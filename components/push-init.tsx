'use client'
import { useEffect } from 'react'
import { usePushNotifications } from '@/hooks/usePushNotifications'

export default function PushInit() {
  const { pushState, subscribe } = usePushNotifications()

  useEffect(() => {
    // Only silently re-register if permission is already granted (keeps SW + subscription fresh)
    if (pushState !== 'granted') return
    if (sessionStorage.getItem('push_init_done')) return
    if (localStorage.getItem('push_opted_out')) return

    const timer = setTimeout(async () => {
      const ok = await subscribe()
      if (ok) sessionStorage.setItem('push_init_done', '1')
    }, 0)

    return () => clearTimeout(timer)
  }, [pushState, subscribe])

  return null
}
