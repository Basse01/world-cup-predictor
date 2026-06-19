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
    // Escape layout padding so chat fills exactly between the two nav bars.
    // dvh (dynamic viewport height) shrinks when the iOS keyboard opens.
    <div className="-mx-4 -mt-6 -mb-24 sm:-mb-6 flex flex-col h-[calc(100dvh-140px)] sm:h-[calc(100dvh-56px)]">
      <div className="px-4 pt-5 pb-3 border-b border-[#1a1a1a] flex-shrink-0">
        <h1 className="font-display text-3xl text-wc-light-gray uppercase tracking-wide">
          Chatt
        </h1>
      </div>
      <ChatWindow
        initial={(messages ?? []) as Message[]}
        userId={user.id}
        displayName={profile?.display_name ?? ''}
      />
    </div>
  )
}
