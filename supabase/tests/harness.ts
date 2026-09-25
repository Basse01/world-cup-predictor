import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { PGlite } from '@electric-sql/pglite'
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp'

const MIGRATIONS_DIR = join(__dirname, '..', 'migrations')

export function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort()
}

// A fresh Postgres with the Supabase stub and every migration applied in order —
// the same thing a new install does.
export async function createTestDb(): Promise<PGlite> {
  const db = new PGlite({ extensions: { uuid_ossp } })
  await db.exec(readFileSync(join(__dirname, 'supabase-stub.sql'), 'utf8'))
  for (const file of migrationFiles()) {
    try {
      await db.exec(readFileSync(join(MIGRATIONS_DIR, file), 'utf8'))
    } catch (err) {
      throw new Error(`migration ${file} failed: ${err instanceof Error ? err.message : err}`)
    }
  }
  return db
}

// Run `fn` the way PostgREST runs a request: inside a transaction, as the
// caller's role, with their JWT claims set. Commits on success (so tests can
// assert on the result afterwards), rolls back if `fn` throws.
export async function as<T>(
  db: PGlite,
  who: { role: 'anon' | 'authenticated' | 'service_role'; sub?: string },
  fn: (tx: Pick<PGlite, 'query' | 'exec'>) => Promise<T>,
): Promise<T> {
  return db.transaction(async tx => {
    const claims = JSON.stringify({ role: who.role, ...(who.sub ? { sub: who.sub } : {}) })
    await tx.query(`SELECT set_config('request.jwt.claims', $1, true)`, [claims])
    await tx.exec(`SET LOCAL ROLE ${who.role}`)
    return fn(tx)
  })
}

export const asUser = <T>(db: PGlite, userId: string, fn: (tx: Pick<PGlite, 'query' | 'exec'>) => Promise<T>) =>
  as(db, { role: 'authenticated', sub: userId }, fn)

export const asService = <T>(db: PGlite, fn: (tx: Pick<PGlite, 'query' | 'exec'>) => Promise<T>) =>
  as(db, { role: 'service_role' }, fn)

export async function createUser(db: PGlite, displayName: string): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO auth.users (email, raw_user_meta_data) VALUES ($1, jsonb_build_object('display_name', $2::text)) RETURNING id`,
    [`${displayName.toLowerCase()}@example.com`, displayName],
  )
  return rows[0].id
}

let apiMatchId = 1000

export async function createMatch(
  db: PGlite,
  opts: { stage?: string; kickoffInMinutes?: number } = {},
): Promise<string> {
  const kickoff = new Date(Date.now() + (opts.kickoffInMinutes ?? 120) * 60_000).toISOString()
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO public.matches (api_match_id, home_team, away_team, kickoff_at, stage)
     VALUES ($1, 'Sverige', 'Norge', $2, $3) RETURNING id`,
    [apiMatchId++, kickoff, opts.stage ?? 'group'],
  )
  return rows[0].id
}

// Moves a match's kickoff (and via trigger its lock_at) relative to now.
export async function setKickoff(db: PGlite, matchId: string, minutesFromNow: number) {
  const kickoff = new Date(Date.now() + minutesFromNow * 60_000).toISOString()
  await db.query(`UPDATE public.matches SET kickoff_at = $1 WHERE id = $2`, [kickoff, matchId])
}

export async function finishMatch(
  db: PGlite,
  matchId: string,
  score: { home: number; away: number; penaltyWinner?: 'home' | 'away' | null },
) {
  await db.query(
    `UPDATE public.matches SET status = 'finished', home_score = $1, away_score = $2, penalty_winner = $3 WHERE id = $4`,
    [score.home, score.away, score.penaltyWinner ?? null, matchId],
  )
}

// Postgres error code of a failed query, or null if it succeeded.
export async function errorCode(p: Promise<unknown>): Promise<string | null> {
  try {
    await p
    return null
  } catch (err) {
    return (err as { code?: string }).code ?? 'unknown'
  }
}
