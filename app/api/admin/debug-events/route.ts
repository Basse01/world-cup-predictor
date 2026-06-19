import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const API_BASE = 'https://v3.football.api-sports.io'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const url = new URL(request.url)
  const fixtureId = url.searchParams.get('fixture') ?? '1489391'

  const res = await fetch(`${API_BASE}/fixtures/events?fixture=${fixtureId}`, {
    headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY! },
    cache: 'no-store',
  })

  const raw = await res.json()
  return NextResponse.json({ status: res.status, fixtureId, raw })
}
