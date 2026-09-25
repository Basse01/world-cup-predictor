import { NextResponse } from 'next/server'
import { dbError, jsonError, readJsonObject, requireAdmin } from '@/lib/api'
import { createAdminClient } from '@/lib/supabase/admin'
import { isScore, isUuid, MAX_SCORE } from '@/lib/validate'

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (auth.response) return auth.response

  const body = await readJsonObject(request)
  if (!body) return jsonError('Body must be a JSON object', 400)

  const { match_id, home_score, away_score } = body
  if (!isUuid(match_id)) return jsonError('match_id must be a UUID', 400)
  if (!isScore(home_score) || !isScore(away_score)) {
    return jsonError(`home_score and away_score must be integers between 0 and ${MAX_SCORE}`, 400)
  }

  const admin = createAdminClient()

  const { data: updated, error: updateError } = await admin
    .from('matches')
    .update({ home_score, away_score, status: 'finished' })
    .eq('id', match_id)
    .select('id')

  if (updateError) return dbError('admin/override update', updateError)
  if (!updated || updated.length === 0) return jsonError('Match not found', 404)

  const { data: calculated, error: rpcError } = await admin.rpc('calculate_match_points', { p_match_id: match_id })
  if (rpcError) return dbError('admin/override calculate_match_points', rpcError)

  // Keep the cron in step: a tied knockout without a shootout winner isn't
  // scored yet, so leave it unmarked and the next sync retries it.
  const { error: markError } = await admin
    .from('matches')
    .update({ points_calculated_at: calculated ? new Date().toISOString() : null })
    .eq('id', match_id)
  if (markError) return dbError('admin/override mark', markError)

  return NextResponse.json({
    ok: true,
    points_calculated: calculated === true,
    ...(calculated ? {} : { reason: 'Tied knockout: waiting for the penalty shootout winner' }),
  })
}
