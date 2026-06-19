import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  fetchAllFixtures,
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

  return NextResponse.json({
    synced: matchesToUpsert.length,
    groups_inferred: teamGroupMap.size,
    timestamp: new Date().toISOString(),
  })
}
