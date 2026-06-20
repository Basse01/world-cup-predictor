import 'server-only'
import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_SUBJECT}`,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function sendPushToUsers(
  userIds: string[],
  payload: { title: string; body: string; url?: string }
): Promise<void> {
  if (userIds.length === 0) return

  const supabase = createAdminClient()
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .in('user_id', userIds)

  if (!subs || subs.length === 0) return

  const message = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? '/dashboard',
  })

  const results = await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        message
      )
    )
  )

  // Remove expired subscriptions (HTTP 410 Gone)
  const expiredEndpoints = subs
    .filter((_, i) => {
      const r = results[i]
      if (r.status !== 'rejected') return false
      return (r.reason as { statusCode?: number })?.statusCode === 410
    })
    .map(s => s.endpoint)

  if (expiredEndpoints.length > 0) {
    await supabase
      .from('push_subscriptions')
      .delete()
      .in('endpoint', expiredEndpoints)
  }
}
