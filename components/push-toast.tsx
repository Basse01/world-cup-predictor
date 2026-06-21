'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Toast {
  id: number
  title: string
  body: string
  url: string
}

export default function PushToast() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const router = useRouter()

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const handler = (event: MessageEvent) => {
      if (event.data?.type !== 'PUSH_TOAST') return
      const toast: Toast = {
        id: Date.now(),
        title: event.data.title,
        body: event.data.body,
        url: event.data.url ?? '/dashboard',
      }
      setToasts(prev => [...prev, toast])
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toast.id))
      }, 5000)
    }

    navigator.serviceWorker.addEventListener('message', handler)
    return () => navigator.serviceWorker.removeEventListener('message', handler)
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 left-4 right-4 z-[9999] flex flex-col gap-2 sm:left-auto sm:right-4 sm:w-80">
      {toasts.map(toast => (
        <button
          key={toast.id}
          onClick={() => {
            router.push(toast.url)
            setToasts(prev => prev.filter(t => t.id !== toast.id))
          }}
          className="w-full text-left bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl px-4 py-3 shadow-lg flex items-start gap-3 active:scale-95 transition-transform"
        >
          <span className="text-xl mt-0.5">🔔</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{toast.title}</p>
            <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{toast.body}</p>
          </div>
          <span
            className="ml-auto text-gray-600 text-lg leading-none shrink-0"
            onClick={e => {
              e.stopPropagation()
              setToasts(prev => prev.filter(t => t.id !== toast.id))
            }}
          >
            ×
          </span>
        </button>
      ))}
    </div>
  )
}
