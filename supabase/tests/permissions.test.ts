// @vitest-environment node
// Row-level security, column privileges and deadline triggers, exercised the way
// a user with the public anon key + their own JWT would hit PostgREST directly.
import { beforeAll, describe, expect, it } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { as, asService, asUser, createMatch, createTestDb, createUser, errorCode, setKickoff } from './harness'

let db: PGlite
let alice: string
let bob: string

beforeAll(async () => {
  db = await createTestDb()
  alice = await createUser(db, 'Alice')
  bob = await createUser(db, 'Bob')
}, 60_000)

const DENIED = '42501'

async function profile(id: string) {
  const { rows } = await db.query<{ display_name: string; is_admin: boolean; paid: boolean }>(
    'SELECT display_name, is_admin, paid FROM public.profiles WHERE id = $1', [id])
  return rows[0]
}

describe('profiles', () => {
  it('lets a user change their own display name', async () => {
    await asUser(db, alice, tx => tx.query(`UPDATE public.profiles SET display_name = 'Ali' WHERE id = $1`, [alice]))
    expect((await profile(alice)).display_name).toBe('Ali')
  })

  it('blocks a user from making themselves admin', async () => {
    expect(await errorCode(asUser(db, alice, tx =>
      tx.query('UPDATE public.profiles SET is_admin = true WHERE id = $1', [alice])))).toBe(DENIED)
    expect((await profile(alice)).is_admin).toBe(false)
  })

  it('blocks a user from marking themselves as paid', async () => {
    await db.query('UPDATE public.profiles SET paid = false WHERE id = $1', [alice])
    expect(await errorCode(asUser(db, alice, tx =>
      tx.query('UPDATE public.profiles SET paid = true WHERE id = $1', [alice])))).toBe(DENIED)
    expect((await profile(alice)).paid).toBe(false)
  })

  it("does not let a user touch someone else's profile", async () => {
    const res = await asUser(db, alice, tx =>
      tx.query(`UPDATE public.profiles SET display_name = 'hacked' WHERE id = $1`, [bob]))
    expect(res.affectedRows).toBe(0)
    expect((await profile(bob)).display_name).toBe('Bob')
  })

  it('lets the server (service role) change paid and is_admin', async () => {
    await asService(db, tx => tx.query('UPDATE public.profiles SET paid = true, is_admin = true WHERE id = $1', [bob]))
    expect(await profile(bob)).toMatchObject({ paid: true, is_admin: true })
    await db.query('UPDATE public.profiles SET is_admin = false WHERE id = $1', [bob])
  })
})

describe('predictions', () => {
  // PostgREST's upsert: INSERT ... ON CONFLICT DO UPDATE SET <every payload column>.
  const upsert = (userId: string, matchId: string, pick: string) =>
    asUser(db, userId, tx => tx.query(
      `INSERT INTO public.predictions (user_id, match_id, pick) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, match_id) DO UPDATE
       SET user_id = EXCLUDED.user_id, match_id = EXCLUDED.match_id, pick = EXCLUDED.pick`,
      [userId, matchId, pick]))

  async function prediction(userId: string, matchId: string) {
    const { rows } = await db.query<{ pick: string; points_awarded: number }>(
      'SELECT pick, points_awarded FROM public.predictions WHERE user_id = $1 AND match_id = $2', [userId, matchId])
    return rows[0]
  }

  it('accepts and updates a tip before the deadline', async () => {
    const match = await createMatch(db)
    await upsert(alice, match, '1')
    await upsert(alice, match, 'X')
    expect(await prediction(alice, match)).toEqual({ pick: 'X', points_awarded: 0 })
  })

  it('rejects a user setting points_awarded on insert', async () => {
    const match = await createMatch(db)
    expect(await errorCode(asUser(db, alice, tx => tx.query(
      `INSERT INTO public.predictions (user_id, match_id, pick, points_awarded) VALUES ($1, $2, '1', 99)`,
      [alice, match])))).toBe(DENIED)
  })

  it('rejects a user setting points_awarded on update', async () => {
    const match = await createMatch(db)
    await upsert(alice, match, '1')
    expect(await errorCode(asUser(db, alice, tx => tx.query(
      'UPDATE public.predictions SET points_awarded = 99 WHERE user_id = $1 AND match_id = $2',
      [alice, match])))).toBe(DENIED)
    expect((await prediction(alice, match)).points_awarded).toBe(0)
  })

  it('rejects a tip on behalf of another user', async () => {
    const match = await createMatch(db)
    expect(await errorCode(asUser(db, alice, tx => tx.query(
      `INSERT INTO public.predictions (user_id, match_id, pick) VALUES ($1, $2, '2')`, [bob, match])))).toBe(DENIED)
  })

  it('rejects moving a tip to another match', async () => {
    const [m1, m2] = [await createMatch(db), await createMatch(db)]
    await upsert(alice, m1, '1')
    expect(await errorCode(asUser(db, alice, tx => tx.query(
      'UPDATE public.predictions SET match_id = $1 WHERE user_id = $2 AND match_id = $3',
      [m2, alice, m1])))).toBe(DENIED)
  })

  describe('deadline (lock_at = kickoff - 1 min)', () => {
    it('blocks creating a tip after the lock', async () => {
      const match = await createMatch(db, { kickoffInMinutes: 0.5 }) // locked 30 s ago
      expect(await errorCode(upsert(alice, match, '1'))).toBe(DENIED)
    })

    it('blocks changing a tip after the lock', async () => {
      const match = await createMatch(db)
      await upsert(alice, match, '1')
      await setKickoff(db, match, -10)
      expect(await errorCode(upsert(alice, match, '2'))).toBe(DENIED)
      expect(await errorCode(asUser(db, alice, tx => tx.query(
        `UPDATE public.predictions SET pick = '2' WHERE user_id = $1 AND match_id = $2`, [alice, match])))).toBe(DENIED)
      expect((await prediction(alice, match)).pick).toBe('1')
    })

    it('blocks deleting a tip after the lock', async () => {
      const match = await createMatch(db)
      await upsert(alice, match, '1')
      await setKickoff(db, match, -10)
      expect(await errorCode(asUser(db, alice, tx => tx.query(
        'DELETE FROM public.predictions WHERE user_id = $1 AND match_id = $2', [alice, match])))).toBe(DENIED)
      expect(await prediction(alice, match)).toBeDefined()
    })

    it('allows deleting a tip before the lock', async () => {
      const match = await createMatch(db)
      await upsert(alice, match, '1')
      await asUser(db, alice, tx => tx.query(
        'DELETE FROM public.predictions WHERE user_id = $1 AND match_id = $2', [alice, match]))
      expect(await prediction(alice, match)).toBeUndefined()
    })
  })
})

describe('bonus_predictions', () => {
  // `extra` adds one integer column the client should not be allowed to set.
  const insertBonus = (userId: string, type: string, value: string, extra?: [string, number]) =>
    asUser(db, userId, tx => extra
      ? tx.query(
          `INSERT INTO public.bonus_predictions (user_id, type, value, ${extra[0]}) VALUES ($1, $2, $3, $4)`,
          [userId, type, value, extra[1]])
      : tx.query(
          'INSERT INTO public.bonus_predictions (user_id, type, value) VALUES ($1, $2, $3)',
          [userId, type, value]))

  it('computes locked_points from the chosen option on the server', async () => {
    await insertBonus(alice, 'world_cup_winner', 'Sverige')
    const { rows } = await db.query<{ locked_points: number }>(
      `SELECT locked_points FROM public.bonus_predictions WHERE user_id = $1 AND type = 'world_cup_winner'`, [alice])
    expect(rows[0].locked_points).toBe(57)
  })

  it('rejects a client-supplied locked_points', async () => {
    expect(await errorCode(insertBonus(bob, 'world_cup_winner', 'Haiti', ['locked_points', 500]))).toBe(DENIED)
  })

  it('rejects a client-supplied points_awarded', async () => {
    expect(await errorCode(insertBonus(bob, 'golden_ball', 'Messi', ['points_awarded', 500]))).toBe(DENIED)
  })

  it('rejects an option that does not exist', async () => {
    expect(await errorCode(insertBonus(bob, 'world_cup_winner', 'Atlantis'))).toBe('23514')
  })

  it('rejects an unknown bonus type', async () => {
    expect(await errorCode(insertBonus(bob, 'no_such_bonus', 'x'))).toBe('23503')
  })

  it('rejects answers after the bonus has locked', async () => {
    await db.query(`UPDATE public.bonus_types SET locked_at = now() - interval '1 minute' WHERE type = 'total_goals'`)
    expect(await errorCode(insertBonus(bob, 'total_goals', '150'))).toBe(DENIED)
    await db.query(`UPDATE public.bonus_types SET locked_at = NULL WHERE type = 'total_goals'`)
  })
})

describe('server-only data', () => {
  it('blocks users from calling the scoring functions', async () => {
    const match = await createMatch(db)
    expect(await errorCode(asUser(db, alice, tx =>
      tx.query('SELECT public.calculate_match_points($1)', [match])))).toBe(DENIED)
    expect(await errorCode(asUser(db, alice, tx =>
      tx.query(`SELECT public.award_bonus_points('total_goals', '1')`)))).toBe(DENIED)
    expect(await errorCode(as(db, { role: 'anon' }, tx =>
      tx.query('SELECT public.calculate_match_points($1)', [match])))).toBe(DENIED)
  })

  it('lets the service role call the scoring functions', async () => {
    const match = await createMatch(db)
    expect(await errorCode(asService(db, tx => tx.query('SELECT public.calculate_match_points($1)', [match])))).toBeNull()
  })

  it('pins search_path on every SECURITY DEFINER function', async () => {
    const { rows } = await db.query<{ proname: string }>(
      `SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public' AND p.prosecdef
         AND NOT EXISTS (SELECT 1 FROM unnest(coalesce(p.proconfig, '{}')) c WHERE c LIKE 'search_path=%')`)
    expect(rows).toEqual([])
  })

  it('lets users read match_events but not write them', async () => {
    const match = await createMatch(db)
    await asService(db, tx => tx.query(
      `INSERT INTO public.match_events (match_id, elapsed, team_name, type) VALUES ($1, 10, 'Sverige', 'Goal')`, [match]))
    const { rows } = await asUser(db, alice, tx =>
      tx.query('SELECT * FROM public.match_events WHERE match_id = $1', [match]))
    expect(rows).toHaveLength(1)
    expect(await errorCode(asUser(db, alice, tx => tx.query(
      `INSERT INTO public.match_events (match_id, elapsed, team_name, type) VALUES ($1, 20, 'Norge', 'Goal')`,
      [match])))).toBe(DENIED)
    expect(await errorCode(asUser(db, alice, tx =>
      tx.query('DELETE FROM public.match_events WHERE match_id = $1', [match])))).toBe(DENIED)
    expect(await errorCode(as(db, { role: 'anon' }, tx =>
      tx.query('SELECT * FROM public.match_events')))).toBe(DENIED)
  })

  it('blocks users from writing match results', async () => {
    const match = await createMatch(db)
    expect(await errorCode(asUser(db, alice, tx => tx.query(
      `UPDATE public.matches SET home_score = 9, status = 'finished' WHERE id = $1`, [match])))).toBe(DENIED)
  })
})
