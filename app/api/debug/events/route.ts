import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const fixtureId = (await searchParams).get('fixture') ?? '1539006'

  const url = `https://v3.football.api-sports.io/fixtures/events?fixture=${fixtureId}`
  const res = await fetch(url, {
    headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY! },
    cache: 'no-store',
  })

  const raw = await res.json()

  // Also check DB state
  const supabase = createAdminClient()
  const { data: match } = await supabase
    .from('matches')
    .select('id, api_match_id, home_team, away_team, status, events_synced_at')
    .eq('api_match_id', Number(fixtureId))
    .single()

  return NextResponse.json({
    http_status: res.status,
    api_response_keys: Object.keys(raw),
    errors: raw.errors,
    results: raw.results,
    response_length: Array.isArray(raw.response) ? raw.response.length : raw.response,
    first_event: Array.isArray(raw.response) ? raw.response[0] : null,
    db_match: match,
  })
}
