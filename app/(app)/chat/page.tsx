import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ChatWindow from '@/components/chat-window'
import type { Message } from '@/lib/types'

export default async function ChatPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: messages }] = await Promise.all([
    supabase.from('profiles').select('display_name').eq('id', user.id).single(),
    supabase
      .from('messages')
      .select('*, profiles(display_name)')
      .order('created_at')
      .limit(200),
  ])

  return (
    <div>
      <h1 className="font-display text-4xl text-wc-light-gray mb-4 uppercase tracking-wide">
        Chatt
      </h1>
      <ChatWindow
        initial={(messages ?? []) as Message[]}
        userId={user.id}
        displayName={profile?.display_name ?? ''}
      />
    </div>
  )
}
