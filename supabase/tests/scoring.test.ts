// @vitest-environment node
// calculate_match_points / award_bonus_points against a real Postgres, including
// re-scoring after a corrected result or answer.
import { beforeAll, describe, expect, it } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { asService, createMatch, createTestDb, createUser, finishMatch, setKickoff } from './harness'

let db: PGlite
let users: string[]

beforeAll(async () => {
  db = await createTestDb()
  users = []
  for (const name of ['Ada', 'Bo', 'Cy', 'Di']) users.push(await createUser(db, name))
}, 60_000)

// Predictions are seeded as the owner (tests of who may write them live in
// permissions.test.ts), then the match is moved into the past.
async function seed(matchId: string, rows: Array<Record<string, unknown>>) {
  for (const [i, r] of rows.entries()) {
    await db.query(
      `INSERT INTO public.predictions (user_id, match_id, pick, winner_pick, home_score, away_score)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [users[i], matchId, r.pick ?? null, r.winner ?? null, r.home ?? null, r.away ?? null])
  }
  await setKickoff(db, matchId, -120)
}

const calculate = (matchId: string) =>
  asService(db, async tx => {
    const { rows } = await tx.query<{ ok: boolean }>('SELECT public.calculate_match_points($1) AS ok', [matchId])
    return rows[0].ok
  })

async function points(matchId: string): Promise<number[]> {
  const { rows } = await db.query<{ points_awarded: number }>(
    `SELECT p.points_awarded FROM public.predictions p
     JOIN public.profiles pr ON pr.id = p.user_id
     WHERE p.match_id = $1 ORDER BY pr.display_name`, [matchId])
  return rows.map(r => r.points_awarded)
}

describe('calculate_match_points', () => {
  it('returns false and leaves points alone for an unfinished match', async () => {
    const match = await createMatch(db)
    await seed(match, [{ pick: '1' }])
    expect(await calculate(match)).toBe(false)
    expect(await points(match)).toEqual([0])
  })

  it('gives 3 points for a correct group-stage 1X2 pick', async () => {
    const match = await createMatch(db)
    await seed(match, [{ pick: '1' }, { pick: 'X' }, { pick: '2' }])
    await finishMatch(db, match, { home: 2, away: 1 })
    expect(await calculate(match)).toBe(true)
    expect(await points(match)).toEqual([3, 0, 0])
  })

  it('re-scores when a result is corrected', async () => {
    const match = await createMatch(db)
    await seed(match, [{ pick: '1' }, { pick: 'X' }])
    await finishMatch(db, match, { home: 1, away: 0 })
    await calculate(match)
    await finishMatch(db, match, { home: 1, away: 1 })
    await calculate(match)
    expect(await points(match)).toEqual([0, 3])
  })

  it('scores knockouts with the contrarian pot and the exact-score bonus', async () => {
    const match = await createMatch(db, { stage: 'quarter_final' })
    // 3 of 4 picked home; home wins 2-1.
    await seed(match, [
      { winner: 'home', home: 2, away: 1 }, // right winner + exact → pot + 5
      { winner: 'home', home: 1, away: 0 }, // right winner → pot
      { winner: 'home', home: 3, away: 0 }, // right winner → pot
      { winner: 'away', home: 0, away: 1 }, // wrong winner → 0
    ])
    await finishMatch(db, match, { home: 2, away: 1 })
    expect(await calculate(match)).toBe(true)
    const pot = Math.round(2 + 8 * (1 / 4)) // 4
    expect(await points(match)).toEqual([pot + 5, pot, pot, 0])
  })

  it('waits for the shootout winner on a tied knockout, then scores it', async () => {
    const match = await createMatch(db, { stage: 'round_of_16' })
    await seed(match, [
      { winner: 'home', home: 1, away: 1 },
      { winner: 'away', home: 0, away: 0 },
    ])
    await finishMatch(db, match, { home: 1, away: 1 })
    expect(await calculate(match)).toBe(false) // cron must retry, not mark as done
    expect(await points(match)).toEqual([0, 0])

    await finishMatch(db, match, { home: 1, away: 1, penaltyWinner: 'away' })
    expect(await calculate(match)).toBe(true)
    // Ada: wrong winner but exact 1-1 → 5. Bo: lone correct pick → 2 + 8 * 1/2 = 6.
    expect(await points(match)).toEqual([5, 6])
  })

  it('clears earlier points if a knockout result is corrected to an unresolved tie', async () => {
    const match = await createMatch(db, { stage: 'semi_final' })
    await seed(match, [{ winner: 'home', home: 2, away: 0 }])
    await finishMatch(db, match, { home: 2, away: 0 })
    await calculate(match)
    expect((await points(match))[0]).toBeGreaterThan(0)

    await finishMatch(db, match, { home: 2, away: 2 })
    expect(await calculate(match)).toBe(false)
    expect(await points(match)).toEqual([0])
  })
})

describe('award_bonus_points', () => {
  async function answer(type: string, value: string): Promise<number> {
    return asService(db, async tx => {
      const { rows } = await tx.query<{ winners: number }>(
        'SELECT public.award_bonus_points($1, $2) AS winners', [type, value])
      return rows[0].winners
    })
  }

  async function bonusPoints(type: string): Promise<Record<string, number>> {
    const { rows } = await db.query<{ value: string; points_awarded: number }>(
      'SELECT value, points_awarded FROM public.bonus_predictions WHERE type = $1', [type])
    return Object.fromEntries(rows.map(r => [r.value, r.points_awarded]))
  }

  beforeAll(async () => {
    const picks: Array<[number, string, string]> = [
      [0, 'world_cup_winner', 'Spanien'],
      [1, 'world_cup_winner', 'Sverige'],
      [0, 'top_scorer', 'Mbappé'],
      [1, 'top_scorer', 'Kane'],
    ]
    for (const [i, type, value] of picks) {
      await db.query('INSERT INTO public.bonus_predictions (user_id, type, value) VALUES ($1, $2, $3)',
        [users[i], type, value])
    }
  })

  it('awards the picked option its own (odds-based) points', async () => {
    expect(await answer('world_cup_winner', 'spanien ')).toBe(1)
    expect(await bonusPoints('world_cup_winner')).toEqual({ Spanien: 20, Sverige: 0 })
  })

  it('moves the points when the admin corrects the answer', async () => {
    await answer('top_scorer', 'Mbappé')
    expect(await bonusPoints('top_scorer')).toEqual({ 'Mbappé': 10, Kane: 0 })

    expect(await answer('top_scorer', 'Kane')).toBe(1)
    expect(await bonusPoints('top_scorer')).toEqual({ 'Mbappé': 0, Kane: 10 })
    const { rows } = await db.query<{ answer: string }>(`SELECT answer FROM public.bonus_types WHERE type = 'top_scorer'`)
    expect(rows[0].answer).toBe('Kane')
  })

  it('rejects an unknown bonus type', async () => {
    await expect(answer('no_such_bonus', 'x')).rejects.toMatchObject({ code: '22023' })
  })
})
