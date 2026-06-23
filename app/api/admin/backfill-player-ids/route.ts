import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { fetchFixtureEvents } from '@/lib/api-football'

export const runtime = 'nodejs'
export const maxDuration = 60

// One-time backfill: re-fetch events for every finished match and repopulate
// match_events WITH player_id (api-football's stable player identifier).
// Legacy rows were stored name-only, which split the same scorer across fixtures
// ("Kylian Mbappé" vs "K. Mbappe") and broke the skytteliga on /stats.
// Idempotent: safe to run more than once. Run AFTER deploying the player_id changes.
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (!process.env.API_FOOTBALL_KEY) {
    return NextResponse.json({ error: 'API_FOOTBALL_KEY not set' }, { status: 500 })
  }

  const admin = createAdminClient()

  const { data: finished, error: matchErr } = await admin
    .from('matches')
    .select('id, api_match_id, home_team, away_team')
    .eq('status', 'finished')
    .order('kickoff_at', { ascending: true })

  if (matchErr) return NextResponse.json({ error: matchErr.message }, { status: 500 })

  let matchesRefreshed = 0
  let eventsWritten = 0
  const skipped: string[] = []
  const errors: string[] = []

  for (const match of finished ?? []) {
    try {
      const events = await fetchFixtureEvents(match.api_match_id)
      // Never wipe existing data on an empty/failed fetch.
      if (events.length === 0) {
        skipped.push(`${match.home_team}–${match.away_team} (no events returned)`)
        continue
      }

      const { error: delErr } = await admin.from('match_events').delete().eq('match_id', match.id)
      if (delErr) { errors.push(`${match.id} delete: ${delErr.message}`); continue }

      // upsert + ignoreDuplicates (not insert): api-football can return duplicate
      // events that violate the unique key — a plain insert would throw after the
      // delete and leave the match with no events. Mirrors the cron sync.
      const { error: insErr } = await admin.from('match_events').upsert(
        events.map(e => ({
          match_id: match.id,
          elapsed: e.time.elapsed,
          extra_time: e.time.extra ?? null,
          team_name: e.team.name,
          team_logo: e.team.logo ?? null,
          player_name: e.player.name ?? null,
          player_id: e.player.id ?? null,
          assist_name: e.assist.name ?? null,
          type: e.type,
          detail: e.detail ?? null,
          comments: e.comments ?? null,
        })),
        { onConflict: 'match_id,elapsed,team_name,type,player_name', ignoreDuplicates: true }
      )
      if (insErr) { errors.push(`${match.id} insert: ${insErr.message}`); continue }

      matchesRefreshed++
      eventsWritten += events.length
    } catch (err) {
      errors.push(`${match.id}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  if (errors.length) console.error('[admin/backfill-player-ids] errors:', errors)
  if (skipped.length) console.log('[admin/backfill-player-ids] skipped:', skipped)
  console.log(`[admin/backfill-player-ids] refreshed ${matchesRefreshed}/${finished?.length ?? 0} matches, ${eventsWritten} events`)

  return NextResponse.json({
    ok: errors.length === 0,
    matches_total: finished?.length ?? 0,
    matches_refreshed: matchesRefreshed,
    events_written: eventsWritten,
    skipped,
    errors,
  })
}
