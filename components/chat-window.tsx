'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
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
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const channel = supabase
      .channel('chat-room')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          const { data } = await supabase
            .from('messages')
            .select('*, profiles(display_name)')
            .eq('id', payload.new.id)
            .single()
          if (data) setMessages(prev => [...prev, data as Message])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || sending) return
    setSendError(null)
    setSending(true)
    const trimmed = input.trim()
    const { error } = await supabase.from('messages').insert({ user_id: userId, content: trimmed })
    if (error) {
      setInput(trimmed)
      setSendError('Kunde inte skicka meddelandet. Försök igen.')
    } else {
      setInput('')
    }
    setSending(false)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        {messages.map(m => {
          const isMe = m.user_id === userId
          const time = new Date(m.created_at).toLocaleTimeString('sv-SE', {
            hour: '2-digit', minute: '2-digit',
          })
          return (
            <div
              key={m.id}
              className={`animate-slide-in flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
            >
              {!isMe && (
                <span className="text-xs text-wc-dark-gray mb-1 px-1">
                  {m.profiles?.display_name}
                </span>
              )}
              <div
                className={`max-w-xs rounded-2xl px-4 py-2.5 text-sm
                  ${isMe
                    ? 'bg-wc-blue text-white rounded-br-sm'
                    : 'bg-[#1a1a1a] text-wc-light-gray rounded-bl-sm border border-[#2a2a2a]'
                  }`}
              >
                {m.content}
              </div>
              <span className="text-[10px] text-wc-dark-gray mt-1 px-1">{time}</span>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {sendError && (
        <p className="text-xs text-wc-red pb-1">{sendError}</p>
      )}
      <form onSubmit={sendMessage} className="flex gap-2 pt-3 border-t border-[#2a2a2a]">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Skriv ett meddelande..."
          maxLength={500}
          className="flex-1 bg-[#1a1a1a] border border-wc-dark-gray rounded-xl px-4 py-2.5
                     text-wc-light-gray placeholder-wc-dark-gray focus:outline-none
                     focus:border-wc-blue text-sm"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="bg-wc-blue hover:bg-blue-800 text-white font-display tracking-widest
                     px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50 text-sm uppercase"
        >
          Skicka
        </button>
      </form>
    </div>
  )
}
