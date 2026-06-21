import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUsers } from '@/lib/push'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { content?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const content = body.content?.trim()
  if (!content || content.length < 1 || content.length > 500) {
    return NextResponse.json({ error: 'content must be 1–500 characters' }, { status: 400 })
  }

  const { data: message, error } = await supabase
    .from('messages')
    .insert({ user_id: user.id, content })
    .select('id')
    .single()

  if (error || !message) {
    return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 })
  }

  await sendChatPush(user.id, content)

  return NextResponse.json({ id: message.id })
}

async function sendChatPush(senderId: string, content: string): Promise<void> {
  try {
    const admin = createAdminClient()
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

    // Find all users with push subscriptions except the sender
    const { data: subs } = await admin
      .from('push_subscriptions')
      .select('user_id')
      .neq('user_id', senderId)

    if (!subs || subs.length === 0) return

    const subUserIds = [...new Set(subs.map(s => s.user_id as string))]

    // Fetch sender name and eligible recipients (not notified in last 5 min) in parallel
    const [senderResult, eligibleResult] = await Promise.all([
      admin.from('profiles').select('display_name').eq('id', senderId).single(),
      admin
        .from('profiles')
        .select('id')
        .in('id', subUserIds)
        .or(`last_chat_push_at.is.null,last_chat_push_at.lt.${fiveMinutesAgo}`),
    ])
    if (senderResult.error) console.error('[sendChatPush] sender query:', JSON.stringify(senderResult.error))
    if (eligibleResult.error) console.error('[sendChatPush] eligible query:', JSON.stringify(eligibleResult.error))
    const senderProfile = senderResult.data
    const eligibleProfiles = eligibleResult.data

    if (!eligibleProfiles || eligibleProfiles.length === 0) return

    const eligibleIds = eligibleProfiles.map(p => p.id as string)
    const senderName = senderProfile?.display_name ?? 'Någon'
    const body = content.length > 60 ? content.slice(0, 57) + '…' : content

    const notifiedIds = await sendPushToUsers(eligibleIds, {
      title: `💬 ${senderName}`,
      body,
      url: '/dashboard',
    })

    // Only throttle users whose push was actually accepted by the push service
    if (notifiedIds.length > 0) {
      await admin
        .from('profiles')
        .update({ last_chat_push_at: new Date().toISOString() })
        .in('id', notifiedIds)
    }
  } catch (err) {
    console.error('[sendChatPush] unexpected error:', JSON.stringify(err))
    // Never let push errors propagate — the message was already saved
  }
}
