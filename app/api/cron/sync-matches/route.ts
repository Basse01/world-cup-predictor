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

  const groupFixtures = fixtures.filter(f => mapStage(f.league.round) === 'group')
  const teamGroupMap = inferTeamGroupMap(groupFixtures)

  const now = new Date().toISOString()
  const matchesToUpsert = fixtures.map((f: ApiFixture) => {
    const stage = mapStage(f.league.round)
    const groupName = stage === 'group'
      ? (teamGroupMap.get(f.teams.home.id) ?? teamGroupMap.get(f.teams.away.id) ?? null)
      : null

    // Derive penalty winner from shootout scores when fulltime is tied
    const pen = f.score.penalty
    let penaltyWinner: 'home' | 'away' | null = null
    if (pen && pen.home != null && pen.away != null) {
      if (pen.home > pen.away) penaltyWinner = 'home'
      else if (pen.away > pen.home) penaltyWinner = 'away'
    }

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
      penalty_winner: penaltyWinner,
      updated_at: now,
    }
  })

  const { error: upsertError } = await supabase
    .from('matches')
    .upsert(matchesToUpsert, { onConflict: 'api_match_id' })

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 })
  }

  // Only calculate points for finished matches that haven't been processed yet.
  // Admin override calls calculate_match_points directly and is unaffected.
  const { data: unprocessedFinished } = await supabase
    .from('matches')
    .select('id')
    .eq('status', 'finished')
    .is('points_calculated_at', null)

  if (unprocessedFinished && unprocessedFinished.length > 0) {
    const rpcResults = await Promise.all(
      unprocessedFinished.map(match =>
        supabase.rpc('calculate_match_points', { p_match_id: match.id })
      )
    )
    const rpcErrors = rpcResults
      .map((r, i) => r.error ? `${unprocessedFinished[i].id}: ${r.error.message}` : null)
      .filter(Boolean)
    if (rpcErrors.length) {
      console.error('[sync-matches] RPC errors:', rpcErrors)
    }

    // Mark successfully processed matches so we don't re-run next cron
    const successIds = unprocessedFinished
      .filter((_, i) => !rpcResults[i].error)
      .map(m => m.id)
    if (successIds.length > 0) {
      await supabase
        .from('matches')
        .update({ points_calculated_at: now })
        .in('id', successIds)
    }
  }

  // ── Sync match events ──────────────────────────────────────────────────────
  // Live matches: always re-sync (at most 5 at a time — multiple simultaneous games).
  // Finished matches: sync once, up to 45 per run.
  // Live matches get priority — they're fetched separately with a tight limit.
  const [{ data: liveForEvents }, { data: unsyncedFinished }] = await Promise.all([
    supabase.from('matches').select('id, api_match_id, status').eq('status', 'live').limit(5),
    supabase.from('matches').select('id, api_match_id, status')
      .eq('status', 'finished')
      .is('events_synced_at', null)
      .order('kickoff_at', { ascending: false })
      .limit(45),
  ])
  const matchesNeedingEvents = [
    ...(liveForEvents ?? []),
    ...(unsyncedFinished ?? []),
  ]

  let eventsSynced = 0
  for (const match of matchesNeedingEvents) {
    try {
      const events = await fetchFixtureEvents(match.api_match_id)
      if (events.length > 0) {
        if (match.status === 'live') {
          await supabase.from('match_events').delete().eq('match_id', match.id)
        }
        const { error: insertError } = await supabase.from('match_events').upsert(
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
          })),
          { onConflict: 'match_id,elapsed,team_name,type,player_name', ignoreDuplicates: true }
        )
        if (insertError) {
          console.error(`[sync-matches] insert failed for match ${match.id}:`, insertError.message)
        } else if (match.status === 'finished') {
          await supabase.from('matches').update({ events_synced_at: now }).eq('id', match.id)
        }
      } else {
        console.log(`[sync-matches] no events for fixture ${match.api_match_id} (${match.status})`)
      }
      eventsSynced++
    } catch (err) {
      console.error(`[sync-matches] events fetch failed for match ${match.id}:`, err)
    }
  }

  return NextResponse.json({
    synced: matchesToUpsert.length,
    groups_inferred: teamGroupMap.size,
    points_processed: unprocessedFinished?.length ?? 0,
    events_synced: eventsSynced,
    timestamp: new Date().toISOString(),
  })
}
