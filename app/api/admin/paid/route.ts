import { NextResponse } from 'next/server'
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
  const user_id = body.user_id as string | undefined
  const paid = body.paid as boolean | undefined

  if (!user_id || paid === undefined) {
    return NextResponse.json({ error: 'user_id and paid required' }, { status: 400 })
  }
  if (typeof paid !== 'boolean') {
    return NextResponse.json({ error: 'paid must be a boolean' }, { status: 400 })
  }

  const { error } = await supabase
    .from('profiles').update({ paid }).eq('id', user_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
