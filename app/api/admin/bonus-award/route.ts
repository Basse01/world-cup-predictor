import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: Record<string, unknown>
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const type = body.type as string | undefined
  const answer = body.answer as string | undefined

  if (!type || !answer?.trim()) {
    return NextResponse.json({ error: 'type and answer required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error: rpcError } = await admin.rpc('award_bonus_points', { p_type: type, p_answer: answer.trim() })
  if (rpcError) {
    console.error('[admin/bonus-award] RPC error:', rpcError.message)
  }

  return NextResponse.json({ ok: true })
}
