'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import ChatWindow from '@/components/chat-window'
import type { Message } from '@/lib/types'

function XIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export default function ChatOverlay({
  onClose,
  userId,
  displayName,
}: {
  onClose: () => void
  userId: string
  displayName: string
}) {
  const [messages, setMessages] = useState<Message[] | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('messages')
      .select('*, profiles(display_name)')
      .order('created_at')
      .limit(200)
      .then(({ data }) => setMessages((data ?? []) as Message[]))
  }, [])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Panel — fullscreen */}
      <div className="relative w-full h-full bg-[#0d0d0d] flex flex-col">
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[#1a1a1a] flex-shrink-0">
          <h2 className="font-display text-2xl text-wc-light-gray uppercase tracking-wide">
            Chatt
          </h2>
          <button
            onClick={onClose}
            aria-label="Stäng chatten"
            className="w-10 h-10 flex items-center justify-center text-white/60 hover:text-wc-light-gray rounded-full active:opacity-60 transition-colors"
          >
            <XIcon />
          </button>
        </div>

        {messages === null ? (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-white/60 text-sm">Laddar...</span>
          </div>
        ) : (
          <ChatWindow initial={messages} userId={userId} displayName={displayName} />
        )}
      </div>
    </div>
  )
}
