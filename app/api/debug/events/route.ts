import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const fixtureId = (await searchParams).get('fixture') ?? '1489391'
  const doInsert = (await searchParams).get('insert') === '1'

  const apiUrl = `https://v3.football.api-sports.io/fixtures/events?fixture=${fixtureId}`
  const res = await fetch(apiUrl, {
    headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY! },
    cache: 'no-store',
  })
  const raw = await res.json()
  const events: unknown[] = Array.isArray(raw.response) ? raw.response : []

  const supabase = createAdminClient()
  const { data: match } = await supabase
    .from('matches')
    .select('id, api_match_id, home_team, away_team, status, events_synced_at')
    .eq('api_match_id', Number(fixtureId))
    .single()

  let insertResult: unknown = null
  let syncedResult: unknown = null

  if (doInsert && match && events.length > 0) {
    const rows = (events as Array<{
      time: { elapsed: number; extra: number | null }
      team: { name: string; logo: string }
      player: { name: string | null }
      assist: { name: string | null }
      type: string
      detail: string | null
      comments: string | null
    }>).map(e => ({
      match_id: match.id,
      elapsed: e.time.elapsed,
      extra_time: e.time.extra ?? null,
      team_name: e.team.name,
      team_logo: e.team.logo ?? null,
      player_name: e.player.name ?? null,
      assist_name: e.assist.name ?? null,
      type: e.type,
      detail: e.detail ?? null,
      comments: e.comments ?? null,
    }))

    const { error: insertError } = await supabase.from('match_events').insert(rows)
    insertResult = insertError ? { error: insertError.message, code: insertError.code } : { ok: true, count: rows.length }

    if (!insertError) {
      const { error: updateError } = await supabase
        .from('matches')
        .update({ events_synced_at: new Date().toISOString() })
        .eq('id', match.id)
      syncedResult = updateError ? { error: updateError.message } : { ok: true }
    }
  }

  return NextResponse.json({
    fixture_id: Number(fixtureId),
    http_status: res.status,
    api_errors: raw.errors,
    event_count: events.length,
    first_event: events[0] ?? null,
    db_match: match,
    insert: doInsert ? insertResult : 'pass ?insert=1 to insert',
    synced_update: syncedResult,
  })
}
