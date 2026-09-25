import { NextResponse } from 'next/server'
import { dbError, jsonError, readJsonObject, requireUser } from '@/lib/api'
import { trimmedString } from '@/lib/validate'

// locked_points is never taken from the client: the database computes it from
// the chosen option (migration 025) and we return it.
export async function POST(request: Request) {
  const auth = await requireUser()
  if (auth.response) return auth.response
  const { supabase, user } = auth

  const body = await readJsonObject(request)
  if (!body) return jsonError('Body must be a JSON object', 400)

  const type = trimmedString(body.type, 64)
  const value = trimmedString(body.value, 100)
  if (!type || !value) return jsonError('type and value must be non-empty strings (value max 100 chars)', 400)

  const [{ data: bonusType }, { data: options }] = await Promise.all([
    supabase.from('bonus_types').select('locked_at').eq('type', type).maybeSingle(),
    supabase.from('bonus_options').select('value').eq('type', type),
  ])

  if (!bonusType) return jsonError('Unknown bonus type', 400)
  if (bonusType.locked_at && new Date(bonusType.locked_at) <= new Date()) {
    return jsonError('Bonus locked', 403)
  }

  // Dropdown bonuses only accept one of their options (matched like the award).
  let canonicalValue = value
  if (options && options.length > 0) {
    const match = options.find(o => o.value.trim().toLowerCase() === value.toLowerCase())
    if (!match) return jsonError('Invalid option for this bonus', 400)
    canonicalValue = match.value
  }

  const { data, error } = await supabase
    .from('bonus_predictions')
    .upsert({ user_id: user.id, type, value: canonicalValue }, { onConflict: 'user_id,type' })
    .select('locked_points')
    .single()

  if (error) return dbError('bonus POST', error)
  return NextResponse.json({ ok: true, locked_points: data.locked_points })
}
