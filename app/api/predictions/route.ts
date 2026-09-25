import { NextResponse } from 'next/server'
import { dbError, jsonError, readJsonObject, requireUser } from '@/lib/api'
import { isMatchLocked } from '@/lib/points'
import { isUuid, parseGroupPick, parseKnockoutPick } from '@/lib/validate'

// The deadline is also enforced in the database (migration 025); checking it
// here first gives a clean 403 instead of a failed write.
export async function POST(request: Request) {
  const auth = await requireUser()
  if (auth.response) return auth.response
  const { supabase, user } = auth

  const body = await readJsonObject(request)
  if (!body) return jsonError('Body must be a JSON object', 400)

  const { match_id } = body
  if (!isUuid(match_id)) return jsonError('match_id must be a UUID', 400)

  const { data: match } = await supabase
    .from('matches')
    .select('lock_at, stage')
    .eq('id', match_id)
    .single()

  if (!match) return jsonError('Match not found', 404)
  if (isMatchLocked(match.lock_at)) return jsonError('Prediction locked', 403)

  let payload
  if (match.stage === 'group') {
    const parsed = parseGroupPick(body)
    if (!parsed.ok) return jsonError(parsed.error, 400)
    payload = { user_id: user.id, match_id, ...parsed.value, home_score: null, away_score: null, winner_pick: null }
  } else {
    const parsed = parseKnockoutPick(body)
    if (!parsed.ok) return jsonError(parsed.error, 400)
    payload = { user_id: user.id, match_id, pick: null, ...parsed.value }
  }

  const { error } = await supabase
    .from('predictions')
    .upsert(payload, { onConflict: 'user_id,match_id' })

  if (error) return dbError('predictions POST', error)
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const auth = await requireUser()
  if (auth.response) return auth.response
  const { supabase, user } = auth

  const body = await readJsonObject(request)
  if (!body) return jsonError('Body must be a JSON object', 400)

  const { match_id } = body
  if (!isUuid(match_id)) return jsonError('match_id must be a UUID', 400)

  const { data: match } = await supabase
    .from('matches')
    .select('lock_at')
    .eq('id', match_id)
    .single()

  if (!match) return jsonError('Match not found', 404)
  if (isMatchLocked(match.lock_at)) return jsonError('Prediction locked', 403)

  const { error } = await supabase
    .from('predictions')
    .delete()
    .eq('user_id', user.id)
    .eq('match_id', match_id)

  if (error) return dbError('predictions DELETE', error)
  return NextResponse.json({ ok: true })
}
