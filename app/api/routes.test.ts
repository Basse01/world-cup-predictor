// @vitest-environment node
// API route wiring with a fake Supabase client: input validation, deadline
// handling, and that failures are reported instead of `{ ok: true }`.
// The database rules themselves are tested for real in supabase/tests/.
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

type Result = { data?: unknown; error?: { code?: string; message: string } | null }
type Call = { table: string; ops: Array<[string, unknown[]]> }

// Chainable stand-in for a PostgREST query. Every call is recorded; awaiting
// it asks `respond` for the result of the whole chain.
function fakeClient(respond: (call: Call) => Result, rpc: (fn: string, args: unknown) => Result = () => ({})) {
  const calls: Call[] = []
  const rpcCalls: Array<[string, unknown]> = []
  const client = {
    auth: { getUser: async () => ({ data: { user: state.user } }), updateUser: async () => ({ error: null }) },
    from(table: string) {
      const call: Call = { table, ops: [] }
      calls.push(call)
      const builder: Record<string, unknown> = new Proxy({}, {
        get(_t, prop) {
          if (prop === 'then') {
            const r = respond(call)
            return (resolve: (v: unknown) => void) => resolve({ data: r.data ?? null, error: r.error ?? null })
          }
          return (...args: unknown[]) => { call.ops.push([String(prop), args]); return builder }
        },
      })
      return builder
    },
    async rpc(fn: string, args: unknown) {
      rpcCalls.push([fn, args])
      const r = rpc(fn, args)
      return { data: r.data ?? null, error: r.error ?? null }
    },
  }
  return { client, calls, rpcCalls }
}

const state: { user: { id: string } | null; server: ReturnType<typeof fakeClient>; admin: ReturnType<typeof fakeClient> } = {
  user: { id: '11111111-1111-4111-8111-111111111111' },
  server: fakeClient(() => ({})),
  admin: fakeClient(() => ({})),
}

vi.mock('@/lib/supabase/server', () => ({ createClient: async () => state.server.client }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => state.admin.client }))

const MATCH_ID = '22222222-2222-4222-8222-222222222222'
const FUTURE = new Date(Date.now() + 3600_000).toISOString()
const PAST = new Date(Date.now() - 60_000).toISOString()

const post = (body: unknown) => new Request('http://test/api', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: typeof body === 'string' ? body : JSON.stringify(body),
})

const writes = (s: ReturnType<typeof fakeClient>, op: string) =>
  s.calls.flatMap(c => c.ops.filter(([name]) => name === op).map(([, args]) => ({ table: c.table, args })))

beforeEach(() => {
  state.user = { id: '11111111-1111-4111-8111-111111111111' }
})

describe('POST /api/predictions', () => {
  const setup = (match: Result, upsert: Result = {}) => {
    state.server = fakeClient(call => (call.ops.some(([op]) => op === 'upsert') ? upsert : match))
  }

  it('rejects anonymous callers', async () => {
    state.user = null
    setup({})
    const { POST } = await import('./predictions/route')
    expect((await POST(post({ match_id: MATCH_ID, pick: '1' }))).status).toBe(401)
  })

  it.each([
    ['invalid JSON', '{nope'],
    ['a null body', 'null'],
    ['an array body', [1, 2]],
    ['a non-UUID match_id', { match_id: 'abc', pick: '1' }],
    ['a numeric match_id', { match_id: 7, pick: '1' }],
  ])('answers 400 for %s', async (_label, body) => {
    setup({ data: { lock_at: FUTURE, stage: 'group' } })
    const { POST } = await import('./predictions/route')
    expect((await POST(post(body))).status).toBe(400)
  })

  it('answers 400 for an unreasonable knockout score', async () => {
    setup({ data: { lock_at: FUTURE, stage: 'final' } })
    const { POST } = await import('./predictions/route')
    const res = await POST(post({ match_id: MATCH_ID, winner_pick: 'home', home_score: 99, away_score: 0 }))
    expect(res.status).toBe(400)
    expect(writes(state.server, 'upsert')).toEqual([])
  })

  it('answers 403 and writes nothing once the match is locked', async () => {
    setup({ data: { lock_at: PAST, stage: 'group' } })
    const { POST } = await import('./predictions/route')
    expect((await POST(post({ match_id: MATCH_ID, pick: '1' }))).status).toBe(403)
    expect(writes(state.server, 'upsert')).toEqual([])
  })

  it('upserts only the tip fields, never client-supplied points', async () => {
    setup({ data: { lock_at: FUTURE, stage: 'group' } })
    const { POST } = await import('./predictions/route')
    const res = await POST(post({ match_id: MATCH_ID, pick: 'X', points_awarded: 99 }))
    expect(res.status).toBe(200)
    expect(writes(state.server, 'upsert')[0].args[0]).toEqual({
      user_id: state.user!.id, match_id: MATCH_ID, pick: 'X', home_score: null, away_score: null, winner_pick: null,
    })
  })

  it('maps a database deadline rejection (race with the lock) to 403', async () => {
    setup({ data: { lock_at: FUTURE, stage: 'group' } }, { error: { code: '42501', message: 'Prediction locked' } })
    const { POST } = await import('./predictions/route')
    expect((await POST(post({ match_id: MATCH_ID, pick: '1' }))).status).toBe(403)
  })
})

describe('POST /api/bonus', () => {
  const setup = (opts: { type?: Result; options?: Result; upsert?: Result }) => {
    state.server = fakeClient(call => {
      if (call.ops.some(([op]) => op === 'upsert')) return opts.upsert ?? { data: { locked_points: 57 } }
      if (call.table === 'bonus_types') return opts.type ?? { data: { locked_at: null } }
      if (call.table === 'bonus_options') return opts.options ?? { data: [] }
      return {}
    })
  }

  it('ignores a client-supplied locked_points and returns the server value', async () => {
    setup({ options: { data: [{ value: 'Sverige' }] } })
    const { POST } = await import('./bonus/route')
    const res = await POST(post({ type: 'world_cup_winner', value: 'sverige', locked_points: 500 }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, locked_points: 57 })
    expect(writes(state.server, 'upsert')[0].args[0]).toEqual({
      user_id: state.user!.id, type: 'world_cup_winner', value: 'Sverige',
    })
  })

  it('answers 400 for an option that does not exist', async () => {
    setup({ options: { data: [{ value: 'Sverige' }] } })
    const { POST } = await import('./bonus/route')
    expect((await POST(post({ type: 'world_cup_winner', value: 'Atlantis' }))).status).toBe(400)
  })

  it('answers 400 for an unknown bonus type', async () => {
    setup({ type: { data: null } })
    const { POST } = await import('./bonus/route')
    expect((await POST(post({ type: 'nope', value: 'x' }))).status).toBe(400)
  })

  it('answers 400 when value is not a string', async () => {
    setup({})
    const { POST } = await import('./bonus/route')
    expect((await POST(post({ type: 'top_scorer', value: 42 }))).status).toBe(400)
  })

  it('answers 403 after the bonus has locked', async () => {
    setup({ type: { data: { locked_at: PAST } } })
    const { POST } = await import('./bonus/route')
    expect((await POST(post({ type: 'top_scorer', value: 'Kane' }))).status).toBe(403)
  })
})

describe('admin routes', () => {
  const asAdmin = (isAdmin = true) => {
    state.server = fakeClient(() => ({ data: { is_admin: isAdmin } }))
  }

  it('rejects non-admins', async () => {
    asAdmin(false)
    const { POST } = await import('./admin/bonus-award/route')
    expect((await POST(post({ type: 'top_scorer', answer: 'Kane' }))).status).toBe(403)
  })

  it('bonus-award reports a failed RPC instead of ok: true', async () => {
    asAdmin()
    state.admin = fakeClient(() => ({}), () => ({ error: { message: 'boom' } }))
    const { POST } = await import('./admin/bonus-award/route')
    const res = await POST(post({ type: 'top_scorer', answer: 'Kane' }))
    expect(res.status).toBe(500)
    expect((await res.json()).ok).toBeUndefined()
  })

  it('override reports a failed RPC instead of ok: true', async () => {
    asAdmin()
    state.admin = fakeClient(() => ({ data: [{ id: MATCH_ID }] }), () => ({ error: { message: 'boom' } }))
    const { POST } = await import('./admin/override/route')
    expect((await POST(post({ match_id: MATCH_ID, home_score: 1, away_score: 0 }))).status).toBe(500)
  })

  it('override leaves a tied knockout unmarked so the cron retries it', async () => {
    asAdmin()
    state.admin = fakeClient(() => ({ data: [{ id: MATCH_ID }] }), () => ({ data: false }))
    const { POST } = await import('./admin/override/route')
    const res = await POST(post({ match_id: MATCH_ID, home_score: 1, away_score: 1 }))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true, points_calculated: false })
    const updates = writes(state.admin, 'update').map(u => u.args[0])
    expect(updates).toContainEqual({ points_calculated_at: null })
  })

  it('override answers 404 for a match that does not exist', async () => {
    asAdmin()
    state.admin = fakeClient(() => ({ data: [] }))
    const { POST } = await import('./admin/override/route')
    expect((await POST(post({ match_id: MATCH_ID, home_score: 1, away_score: 0 }))).status).toBe(404)
  })

  it('paid writes with the service role, not the caller', async () => {
    asAdmin()
    state.admin = fakeClient(() => ({ data: [{ id: MATCH_ID }] }))
    const { POST } = await import('./admin/paid/route')
    expect((await POST(post({ user_id: MATCH_ID, paid: true }))).status).toBe(200)
    expect(writes(state.admin, 'update')).toHaveLength(1)
    expect(writes(state.server, 'update')).toHaveLength(0)
  })
})
