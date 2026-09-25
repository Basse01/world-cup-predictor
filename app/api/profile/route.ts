import { NextResponse } from 'next/server'
import { jsonError, readJsonObject, requireUser } from '@/lib/api'
import { trimmedString } from '@/lib/validate'

export async function POST(request: Request) {
  const auth = await requireUser()
  if (auth.response) return auth.response
  const { supabase, user } = auth

  const body = await readJsonObject(request)
  if (!body) return jsonError('Body must be a JSON object', 400)

  const displayName = trimmedString(body.display_name, 20)
  if (!displayName) return jsonError('Smeknamn måste vara 1–20 tecken', 400)

  const { error } = await supabase
    .from('profiles')
    .update({ display_name: displayName })
    .eq('id', user.id)

  if (error) {
    console.error('[profile] supabase error:', JSON.stringify(error))
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Keep the auth user_metadata copy in sync with profiles so they never drift.
  // Not used for display, but avoids confusion in Supabase's Authentication view.
  const { error: authError } = await supabase.auth.updateUser({
    data: { display_name: displayName },
  })
  if (authError) {
    console.error('[profile] auth metadata sync error:', JSON.stringify(authError))
    // profiles row already updated — don't fail the request over the metadata copy
  }

  return NextResponse.json({ ok: true, display_name: displayName })
}
