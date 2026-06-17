import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isMatchLocked } from '@/lib/points'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const match_id = body.match_id as string | undefined
  const pick = body.pick as string | undefined
  const winner_pick = body.winner_pick as string | undefined
  const home_score = body.home_score as number | undefined | null
  const away_score = body.away_score as number | undefined | null

  if (match_id == null || typeof match_id !== 'string') {
    return NextResponse.json({ error: 'match_id required' }, { status: 400 })
  }

  const { data: match } = await supabase
    .from('matches')
    .select('lock_at, stage')
    .eq('id', match_id)
    .single()

  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })

  if (isMatchLocked(match.lock_at)) {
    return NextResponse.json({ error: 'Prediction locked' }, { status: 403 })
  }

  if (match.stage === 'group') {
    if (!['1', 'X', '2'].includes(pick ?? '')) {
      return NextResponse.json({ error: 'Invalid pick for group stage' }, { status: 400 })
    }
  } else {
    if (!['home', 'away'].includes(winner_pick ?? '')) {
      return NextResponse.json({ error: 'winner_pick required for knockout' }, { status: 400 })
    }
    if (home_score == null || away_score == null) {
      return NextResponse.json({ error: 'home_score and away_score required for knockout' }, { status: 400 })
    }
    if (!Number.isInteger(home_score) || !Number.isInteger(away_score) || home_score < 0 || away_score < 0) {
      return NextResponse.json({ error: 'Scores must be non-negative integers' }, { status: 400 })
    }
  }

  const payload =
    match.stage === 'group'
      ? { user_id: user.id, match_id, pick: pick!, home_score: null, away_score: null, winner_pick: null }
      : { user_id: user.id, match_id, pick: null, home_score: home_score!, away_score: away_score!, winner_pick: winner_pick! }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase
    .from('predictions')
    .upsert(payload as any, { onConflict: 'user_id,match_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
