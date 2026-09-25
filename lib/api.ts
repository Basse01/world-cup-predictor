import 'server-only'
import { NextResponse } from 'next/server'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { isPlainObject } from '@/lib/validate'

export function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status })
}

// The request body as a JSON object, or null for invalid JSON, `null`, arrays
// and primitives — all of which the routes answer with a 400.
export async function readJsonObject(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json()
    return isPlainObject(body) ? body : null
  } catch {
    return null
  }
}

type Authed = { supabase: SupabaseClient; user: User; response?: never }
type Rejected = { response: NextResponse; supabase?: never; user?: never }

export async function requireUser(): Promise<Authed | Rejected> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { response: jsonError('Unauthorized', 401) }
  return { supabase, user }
}

// is_admin can only be changed with the service role (migration 025), so
// reading it with the caller's own client is trustworthy.
export async function requireAdmin(): Promise<Authed | Rejected> {
  const auth = await requireUser()
  if (auth.response) return auth
  const { data: profile } = await auth.supabase
    .from('profiles').select('is_admin').eq('id', auth.user.id).single()
  if (!profile?.is_admin) return { response: jsonError('Forbidden', 403) }
  return auth
}

// Maps errors raised by the database rules (migration 025) to HTTP statuses so
// a race with a deadline shows up as 403, not as a server error.
export function dbError(context: string, error: { code?: string; message: string }) {
  switch (error.code) {
    case '42501':
      return jsonError(error.message, 403)
    case '22023':
    case '23503':
    case '23514':
      return jsonError(error.message, 400)
    default:
      console.error(`[${context}] supabase error:`, JSON.stringify(error))
      return jsonError(error.message, 500)
  }
}
