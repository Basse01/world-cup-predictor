import 'server-only'
import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

// Configured on first use, not at import: `next build` imports every route, and
// a missing key must disable push rather than fail the build or crash a route.
let vapidReady: boolean | null = null

function ensureVapid(): boolean {
  if (vapidReady !== null) return vapidReady
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT
  if (!publicKey || !privateKey || !subject) {
    console.warn('[push] VAPID keys not configured — push notifications disabled')
    vapidReady = false
    return false
  }
  try {
    webpush.setVapidDetails(
      /^(mailto|https):/.test(subject) ? subject : `mailto:${subject}`,
      publicKey,
      privateKey
    )
    vapidReady = true
  } catch (err) {
    console.error('[push] invalid VAPID configuration — push notifications disabled:', err)
    vapidReady = false
  }
  return vapidReady
}

// Returns user IDs whose push was accepted by the push service (HTTP 2xx)
export async function sendPushToUsers(
  userIds: string[],
  payload: { title: string; body: string; url?: string }
): Promise<string[]> {
  if (userIds.length === 0 || !ensureVapid()) return []

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
    const endpointShort = (sub.endpoint as string).slice(-20)
    if (r.status === 'fulfilled') {
      const statusCode = (r.value as { statusCode?: number })?.statusCode ?? '?'
      console.log(`[push] OK ${statusCode} | ...${endpointShort}`)
      notifiedUserIds.push(sub.user_id as string)
    } else {
      const code = (r.reason as { statusCode?: number })?.statusCode
      if (code === 410) {
        console.log(`[push] 410 expired | ...${endpointShort}`)
        expiredEndpoints.push(sub.endpoint)
      } else {
        const reason = (r.reason as { body?: string })?.body ?? JSON.stringify(r.reason)
        console.error(`[push] FAIL ${code} | ${reason} | ...${endpointShort}`)
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
