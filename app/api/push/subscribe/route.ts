import { NextResponse } from 'next/server'
import { jsonError, readJsonObject, requireUser } from '@/lib/api'
import { createClient } from '@/lib/supabase/server'
import { trimmedString } from '@/lib/validate'

export async function POST(request: Request) {
  const authed = await requireUser()
  if (authed.response) return authed.response
  const { supabase, user } = authed

  const body = await readJsonObject(request)
  if (!body) return jsonError('Body must be a JSON object', 400)

  const endpoint = trimmedString(body.endpoint, 2048)
  const p256dh = trimmedString(body.p256dh, 256)
  const auth = trimmedString(body.auth, 256)
  if (!endpoint || !p256dh || !auth) {
    return jsonError('endpoint, p256dh, and auth are required strings', 400)
  }
  // Push services are always https; anything else is not a real subscription.
  if (!URL.canParse(endpoint) || new URL(endpoint).protocol !== 'https:') {
    return jsonError('endpoint must be an https URL', 400)
  }

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      { user_id: user.id, endpoint, p256dh, auth },
      { onConflict: 'endpoint' }
    )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  void request

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
