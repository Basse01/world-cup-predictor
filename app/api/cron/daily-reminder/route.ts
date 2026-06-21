import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUsers } from '@/lib/push'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const now = new Date()
  const endOfDay = new Date(now)
  endOfDay.setUTCHours(23, 59, 59, 999)

  // Check if there are any scheduled matches remaining today
  const { data: todaysMatches } = await supabase
    .from('matches')
    .select('id, stage')
    .eq('status', 'scheduled')
    .gte('kickoff_at', now.toISOString())
    .lte('kickoff_at', endOfDay.toISOString())

  if (!todaysMatches || todaysMatches.length === 0) {
    return NextResponse.json({ skipped: true, reason: 'no matches today' })
  }

  // Determine tip URL based on whether there are group or knockout matches
  const hasKnockout = todaysMatches.some(m => m.stage !== 'group')
  const tipUrl = hasKnockout ? '/tips/slutspel' : '/tips/gruppspel'

  // Get all users with push subscriptions
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('user_id')

  if (!subs || subs.length === 0) {
    return NextResponse.json({ skipped: true, reason: 'no subscribers' })
  }

  const userIds = [...new Set(subs.map(s => s.user_id as string))]

  const notifiedIds = await sendPushToUsers(userIds, {
    title: '⚽ Glöm inte tippa!',
    body: `Det är ${todaysMatches.length} match${todaysMatches.length > 1 ? 'er' : ''} idag — tippsa nu!`,
    url: tipUrl,
  })

  return NextResponse.json({
    matches_today: todaysMatches.length,
    subscribers: userIds.length,
    notified: notifiedIds.length,
    timestamp: now.toISOString(),
  })
}
