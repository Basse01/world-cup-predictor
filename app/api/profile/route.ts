import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { display_name?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const displayName = body.display_name?.trim()
  if (!displayName || displayName.length < 1 || displayName.length > 20) {
    return NextResponse.json({ error: 'Smeknamn måste vara 1–20 tecken' }, { status: 400 })
  }

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
