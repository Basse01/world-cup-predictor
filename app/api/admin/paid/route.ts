import { NextResponse } from 'next/server'
import { dbError, jsonError, readJsonObject, requireAdmin } from '@/lib/api'
import { createAdminClient } from '@/lib/supabase/admin'
import { isUuid } from '@/lib/validate'

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (auth.response) return auth.response

  const body = await readJsonObject(request)
  if (!body) return jsonError('Body must be a JSON object', 400)

  const { user_id, paid } = body
  if (!isUuid(user_id)) return jsonError('user_id must be a UUID', 400)
  if (typeof paid !== 'boolean') return jsonError('paid must be a boolean', 400)

  // paid is not writable by the authenticated role (migration 025) — only the
  // service role can change it, after the admin check above.
  const { data: updated, error } = await createAdminClient()
    .from('profiles').update({ paid }).eq('id', user_id).select('id')

  if (error) return dbError('admin/paid', error)
  if (!updated || updated.length === 0) return jsonError('User not found', 404)
  return NextResponse.json({ ok: true })
}
