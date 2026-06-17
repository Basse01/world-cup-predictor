import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const type = body.type as string | undefined
  const value = (body.value as string | undefined)?.trim()

  if (!type || !value) {
    return NextResponse.json({ error: 'type and value required' }, { status: 400 })
  }

  const { data: bonusType } = await supabase
    .from('bonus_types')
    .select('locked_at')
    .eq('type', type)
    .single()

  if (bonusType?.locked_at && new Date(bonusType.locked_at) <= new Date()) {
    return NextResponse.json({ error: 'Bonus locked' }, { status: 403 })
  }

  const { error } = await supabase
    .from('bonus_predictions')
    .upsert({ user_id: user.id, type, value }, { onConflict: 'user_id,type' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
