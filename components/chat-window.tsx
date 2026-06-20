'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Message } from '@/lib/types'

export default function ChatWindow({
  initial,
  userId,
  displayName,
}: {
  initial: Message[]
  userId: string
  displayName: string
}) {
  const supabase = useMemo(() => createClient(), [])
  const [messages, setMessages] = useState<Message[]>(initial)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const isInitial = useRef(true)

  // Cache display names so each unique user only causes one extra fetch
  const profileCache = useRef<Map<string, string>>(new Map(
    initial
      .filter(m => m.profiles?.display_name)
      .map(m => [m.user_id, m.profiles.display_name])
  ))

  // IDs of messages we already added optimistically — skip them in realtime
  const pendingIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (isInitial.current) {
      el.scrollTop = el.scrollHeight
      isInitial.current = false
      return
    }
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    if (distFromBottom < 150) el.scrollTop = el.scrollHeight
  }, [messages])

  useEffect(() => {
    const channel = supabase
      .channel('chat-room')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          const msgId = payload.new.id as string

          // Skip messages we already showed optimistically
          if (pendingIds.current.has(msgId)) {
            pendingIds.current.delete(msgId)
            return
          }

          const newUserId = payload.new.user_id as string
          let name = profileCache.current.get(newUserId)

          if (!name) {
            const { data } = await supabase
              .from('profiles')
              .select('display_name')
              .eq('id', newUserId)
              .single()
            name = data?.display_name ?? ''
            if (name) profileCache.current.set(newUserId, name)
          }

          setMessages(prev => [...prev, {
            ...(payload.new as Message),
            profiles: { display_name: name ?? '' },
          }])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase, userId, displayName])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || sending) return
    setSendError(null)
    setSending(true)
    const trimmed = input.trim()

    // Optimistic: show message immediately
    const optimisticId = `opt-${Date.now()}`
    const optimisticMsg: Message = {
      id: optimisticId,
      user_id: userId,
      content: trimmed,
      created_at: new Date().toISOString(),
      profiles: { display_name: displayName },
    }
    setMessages(prev => [...prev, optimisticMsg])
    setInput('')

    let messageId: string | null = null
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed }),
      })
      if (!res.ok) throw new Error('Send failed')
      const json = await res.json() as { id: string }
      messageId = json.id
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimisticId))
      setInput(trimmed)
      setSendError('Kunde inte skicka meddelandet. Försök igen.')
      setSending(false)
      return
    }

    if (messageId) {
      // Mark real ID so realtime skips it, then swap optimistic placeholder
      pendingIds.current.add(messageId)
      setMessages(prev => prev.map(m =>
        m.id === optimisticId ? { ...m, id: messageId! } : m
      ))
    }

    setSending(false)
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 px-4">
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 py-4">
        {messages.map(m => {
          const isMe = m.user_id === userId
          const time = new Date(m.created_at).toLocaleTimeString('sv-SE', {
            hour: '2-digit', minute: '2-digit',
          })
          return (
            <div
              key={m.id}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
            >
              <Link
                href={`/profile/${m.user_id}`}
                className={`flex items-center gap-1.5 mb-1 px-1 group ${isMe ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar circle */}
                <span
                  className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-display font-bold
                    ${isMe ? 'bg-wc-blue/30 text-wc-blue' : 'bg-[#2a2a2a] text-white/50'}
                    group-hover:opacity-80 transition-opacity`}
                >
                  {(m.profiles?.display_name?.[0] ?? '?').toUpperCase()}
                </span>
                <span className="text-xs text-white/50 group-hover:text-wc-light-gray transition-colors">
                  {m.profiles?.display_name}
                </span>
              </Link>
              <div
                className={`max-w-xs rounded-2xl px-4 py-2.5 text-sm
                  ${isMe
                    ? 'bg-wc-blue text-white rounded-br-sm'
                    : 'bg-[#1a1a1a] text-wc-light-gray rounded-bl-sm border border-[#2a2a2a]'
                  }`}
              >
                {m.content}
              </div>
              <span className="text-xs text-white/50 mt-1 px-1">{time}</span>
            </div>
          )
        })}
      </div>

      {sendError && (
        <p className="text-xs text-wc-red pb-1">{sendError}</p>
      )}
      <form
        onSubmit={sendMessage}
        className="flex gap-2 pt-3 border-t border-[#2a2a2a]"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Skriv ett meddelande..."
          maxLength={500}
          className="flex-1 bg-[#1a1a1a] border border-wc-dark-gray rounded-xl px-4 py-2.5
                     text-wc-light-gray placeholder-wc-dark-gray focus:outline-none
                     focus:border-wc-blue text-base"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="bg-wc-blue hover:bg-blue-800 text-white font-display tracking-widest
                     px-5 py-2.5 min-h-[44px] rounded-xl transition-colors disabled:opacity-50 text-sm uppercase"
        >
          Skicka
        </button>
      </form>
    </div>
  )
}
