import 'server-only'
import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

const vapidSubject = process.env.VAPID_SUBJECT ?? ''
webpush.setVapidDetails(
  vapidSubject.startsWith('mailto:') ? vapidSubject : `mailto:${vapidSubject}`,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

// Returns user IDs whose push was accepted by the push service (HTTP 2xx)
export async function sendPushToUsers(
  userIds: string[],
  payload: { title: string; body: string; url?: string }
): Promise<string[]> {
  if (userIds.length === 0) return []

  const supabase = createAdminClient()
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth')
    .in('user_id', userIds)

  if (!subs || subs.length === 0) return []

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

  const expiredEndpoints: string[] = []
  const notifiedUserIds: string[] = []

  results.forEach((r, i) => {
    const sub = subs[i]
    if (r.status === 'fulfilled') {
      notifiedUserIds.push(sub.user_id as string)
    } else {
      const code = (r.reason as { statusCode?: number })?.statusCode
      if (code === 410) {
        expiredEndpoints.push(sub.endpoint)
      } else {
        const reason = (r.reason as { body?: string })?.body ?? JSON.stringify(r.reason)
        console.error(`[push] FAIL ${code} | ${reason}`)
      }
    }
  })

  if (expiredEndpoints.length > 0) {
    await supabase
      .from('push_subscriptions')
      .delete()
      .in('endpoint', expiredEndpoints)
  }

  return notifiedUserIds
}
