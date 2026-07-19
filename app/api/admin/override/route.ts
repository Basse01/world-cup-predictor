import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

  const match_id = body.match_id as string | undefined
  const home_score = body.home_score as number | undefined
  const away_score = body.away_score as number | undefined
  const penalty_winner = body.penalty_winner as string | undefined

  if (!match_id || home_score == null || away_score == null) {
    return NextResponse.json({ error: 'match_id, home_score, away_score required' }, { status: 400 })
  }
  if (!Number.isInteger(home_score) || !Number.isInteger(away_score) || home_score < 0 || away_score < 0) {
    return NextResponse.json({ error: 'Scores must be non-negative integers' }, { status: 400 })
  }
  if (penalty_winner != null && !['home', 'away'].includes(penalty_winner)) {
    return NextResponse.json({ error: 'penalty_winner must be home or away' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: match } = await admin
    .from('matches').select('stage').eq('id', match_id).single()
  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })

  // A drawn knockout match is decided on penalties — without a winner,
  // calculate_match_points can't award anything.
  const isDrawnKnockout = match.stage !== 'group' && home_score === away_score
  if (isDrawnKnockout && penalty_winner == null) {
    return NextResponse.json({ error: 'penalty_winner required for a drawn knockout match' }, { status: 400 })
  }

  const { error: updateError } = await admin
    .from('matches')
    .update({
      home_score,
      away_score,
      status: 'finished',
      penalty_winner: isDrawnKnockout ? penalty_winner : null,
    })
    .eq('id', match_id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  const { error: rpcError } = await admin.rpc('calculate_match_points', { p_match_id: match_id })
  if (rpcError) {
    console.error('[admin/override] RPC error:', rpcError.message)
  }

  return NextResponse.json({ ok: true })
}
