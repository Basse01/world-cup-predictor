import { NextResponse } from 'next/server'
import { dbError, jsonError, readJsonObject, requireAdmin } from '@/lib/api'
import { createAdminClient } from '@/lib/supabase/admin'
import { trimmedString } from '@/lib/validate'

// Sets the correct answer for a bonus question. Safe to call again with a
// corrected answer: award_bonus_points resets everyone on that bonus first.
export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (auth.response) return auth.response

  const body = await readJsonObject(request)
  if (!body) return jsonError('Body must be a JSON object', 400)

  const type = trimmedString(body.type, 64)
  const answer = trimmedString(body.answer, 100)
  if (!type || !answer) return jsonError('type and answer must be non-empty strings (answer max 100 chars)', 400)

  const admin = createAdminClient()
  const { data: winners, error } = await admin.rpc('award_bonus_points', { p_type: type, p_answer: answer })
  if (error) return dbError('admin/bonus-award', error)

  return NextResponse.json({ ok: true, winners })
}
