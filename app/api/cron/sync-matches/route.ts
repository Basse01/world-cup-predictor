import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  fetchAllFixtures,
  fetchFixtureEvents,
  inferTeamGroupMap,
  mapStatus,
  mapStage,
  type ApiFixture,
} from '@/lib/api-football'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) {
    console.error('[sync-matches] CRON_SECRET env var not set')
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }
  if (!process.env.API_FOOTBALL_KEY) {
    console.error('[sync-matches] API_FOOTBALL_KEY env var not set')
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  let fixtures: ApiFixture[]
  try {
    fixtures = await fetchAllFixtures()
  } catch (err) {
    console.error('[sync-matches] fetchAllFixtures failed:', err)
    return NextResponse.json({ error: 'upstream fetch failed' }, { status: 502 })
  }

  // Infer group assignments from fixture pairings (standings API mixes qualifying/tournament data)
  const groupFixtures = fixtures.filter(f => mapStage(f.league.round) === 'group')
  const teamGroupMap = inferTeamGroupMap(groupFixtures)

  const now = new Date().toISOString()
  const matchesToUpsert = fixtures.map((f: ApiFixture) => {
    const stage = mapStage(f.league.round)
    const groupName = stage === 'group'
      ? (teamGroupMap.get(f.teams.home.id) ?? teamGroupMap.get(f.teams.away.id) ?? null)
      : null
    return {
      api_match_id: f.fixture.id,
      home_team: f.teams.home.name,
      away_team: f.teams.away.name,
      home_team_logo: f.teams.home.logo,
      away_team_logo: f.teams.away.logo,
      kickoff_at: f.fixture.date,
      status: mapStatus(f.fixture.status.short),
      api_status: f.fixture.status.short,
      elapsed_minutes: f.fixture.status.elapsed ?? null,
      stage,
      home_score: f.score.fulltime.home ?? f.goals.home,
      away_score: f.score.fulltime.away ?? f.goals.away,
      group_name: groupName,
      updated_at: now,
    }
  })

  const { error: upsertError } = await supabase
    .from('matches')
    .upsert(matchesToUpsert, { onConflict: 'api_match_id' })

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 })
  }

  const { data: finishedMatches } = await supabase
    .from('matches')
    .select('id')
    .eq('status', 'finished')

  if (finishedMatches) {
    const rpcResults = await Promise.all(
      finishedMatches.map(match =>
        supabase.rpc('calculate_match_points', { p_match_id: match.id })
      )
    )
    const rpcErrors = rpcResults
      .map((r, i) => r.error ? `${finishedMatches[i].id}: ${r.error.message}` : null)
      .filter(Boolean)
    if (rpcErrors.length) {
      console.error('[sync-matches] RPC errors:', rpcErrors)
    }
  }

  // ── Sync match events ──────────────────────────────────────────────────────
  // Always re-sync live matches. For finished matches, sync once (events_synced_at IS NULL),
  // limit 8 per cron run to stay within API rate limits.
  const { data: matchesNeedingEvents } = await supabase
    .from('matches')
    .select('id, api_match_id, status')
    .or('status.eq.live,and(status.eq.finished,events_synced_at.is.null)')
    .order('kickoff_at', { ascending: false })
    .limit(8)

  let eventsSynced = 0
  if (matchesNeedingEvents) {
    for (const match of matchesNeedingEvents) {
      try {
        const events = await fetchFixtureEvents(match.api_match_id)
        if (events.length > 0) {
          // For live matches: delete + re-insert so removed events (VAR overturns) disappear.
          // For finished matches: only ever run once, insert is safe.
          if (match.status === 'live') {
            await supabase.from('match_events').delete().eq('match_id', match.id)
          }
          await supabase.from('match_events').insert(
            events.map(e => ({
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
          )
        }
        if (match.status === 'finished') {
          await supabase
            .from('matches')
            .update({ events_synced_at: now })
            .eq('id', match.id)
        }
        eventsSynced++
      } catch (err) {
        console.error(`[sync-matches] events fetch failed for match ${match.id}:`, err)
      }
    }
  }

  return NextResponse.json({
    synced: matchesToUpsert.length,
    groups_inferred: teamGroupMap.size,
    events_synced: eventsSynced,
    timestamp: new Date().toISOString(),
  })
}
