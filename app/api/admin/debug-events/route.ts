import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchFixtureEvents } from '@/lib/api-football'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const fixtureId = parseInt(url.searchParams.get('fixture') ?? '1489391', 10)
  const matchId = url.searchParams.get('match_id') ?? 'bfa50449-4ee0-40bb-81b1-1fcf19f9e70c'

  const supabase = createAdminClient()

  // Run exact same query as cron
  const { data: unsyncedFinished, error: queryErr } = await supabase
    .from('matches')
    .select('id, api_match_id, status')
    .eq('status', 'finished')
    .is('events_synced_at', null)
    .order('kickoff_at', { ascending: false })
    .limit(6)

  // Fetch events via same function cron uses
  const events = await fetchFixtureEvents(fixtureId)

  // Try insert if events found
  let insertResult: { error: string | null; count: number } = { error: null, count: 0 }
  if (events.length > 0) {
    const { error: insertError } = await supabase.from('match_events').insert(
      events.map(e => ({
        match_id: matchId,
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
    )
    insertResult = { error: insertError?.message ?? null, count: events.length }
  }

  return NextResponse.json({
    queryErr: queryErr?.message ?? null,
    unsyncedMatches: unsyncedFinished?.length ?? 0,
    unsyncedIds: unsyncedFinished?.map(m => m.api_match_id) ?? [],
    eventsFromApi: events.length,
    insertResult,
  })
}
