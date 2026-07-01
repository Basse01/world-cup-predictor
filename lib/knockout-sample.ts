import type { Match, Prediction, Stage } from './types'

// ─────────────────────────────────────────────────────────────────────────────
// DEV PREVIEW DATA ONLY.
// The real knockout fixtures don't exist until the group stage finishes, so this
// lets us design & review the bracket UI now. The page only falls back to this
// in development when there are zero real knockout matches in the DB.
// Safe to delete once real fixtures sync.
// ─────────────────────────────────────────────────────────────────────────────

const PAST = '2026-06-15T19:00:00Z' // lock already passed
const SOON = '2026-07-09T19:00:00Z' // lock still in the future

let seq = 9000
function mk(
  stage: Stage,
  home: string,
  away: string,
  opts: Partial<Match> = {},
): Match {
  seq += 1
  return {
    id: `sample-${seq}`,
    api_match_id: seq,
    home_team: home,
    away_team: away,
    home_team_logo: null,
    away_team_logo: null,
    kickoff_at: opts.kickoff_at ?? '2026-07-01T19:00:00Z',
    status: opts.status ?? 'scheduled',
    stage,
    home_score: opts.home_score ?? null,
    away_score: opts.away_score ?? null,
    penalty_winner: opts.penalty_winner ?? null,
    penalty_home: opts.penalty_home ?? null,
    penalty_away: opts.penalty_away ?? null,
    group_name: null,
    lock_at: opts.lock_at ?? SOON,
    elapsed_minutes: opts.elapsed_minutes ?? null,
    api_status: null,
  }
}

function fin(stage: Stage, home: string, away: string, hs: number, as: number): Match {
  return mk(stage, home, away, { status: 'finished', home_score: hs, away_score: as, lock_at: PAST })
}

// A finished knockout match that ended level and was settled on penalties.
function pens(stage: Stage, home: string, away: string, hs: number, as: number, winner: 'home' | 'away', ph: number, pa: number): Match {
  return mk(stage, home, away, {
    status: 'finished', home_score: hs, away_score: as,
    penalty_winner: winner, penalty_home: ph, penalty_away: pa, lock_at: PAST,
  })
}

// ── Round of 32 — all played ────────────────────────────────────────────────
const R32: Match[] = [
  fin('round_of_32', 'Brazil', 'Ghana', 3, 0),
  fin('round_of_32', 'Portugal', 'Mexico', 1, 2),
  fin('round_of_32', 'Argentina', 'Switzerland', 2, 0),
  fin('round_of_32', 'United States', 'Nigeria', 2, 1),
  fin('round_of_32', 'France', 'Senegal', 3, 1),
  fin('round_of_32', 'Germany', 'Japan', 2, 1),
  fin('round_of_32', 'Spain', 'Morocco', 4, 0),
  fin('round_of_32', 'England', 'Ecuador', 1, 0),
  fin('round_of_32', 'Netherlands', 'Uruguay', 2, 1),
  fin('round_of_32', 'Belgium', 'Croatia', 0, 1),
  fin('round_of_32', 'Italy', 'Egypt', 2, 0),
  fin('round_of_32', 'Colombia', 'Denmark', 1, 2),
  pens('round_of_32', 'Sweden', 'Poland', 2, 2, 'home', 5, 4), // level after ET, Sweden win 5–4 on penalties
  fin('round_of_32', 'Norway', 'Austria', 2, 1),
  fin('round_of_32', 'Canada', 'Qatar', 1, 0),
  fin('round_of_32', 'Australia', 'Serbia', 0, 2),
]

// ── Round of 16 — all played (winners of the R32 pairs above) ────────────────
const R16: Match[] = [
  fin('round_of_16', 'Brazil', 'Mexico', 2, 1),
  fin('round_of_16', 'Argentina', 'United States', 2, 0),
  fin('round_of_16', 'France', 'Germany', 1, 0),
  fin('round_of_16', 'Spain', 'England', 2, 1),
  fin('round_of_16', 'Netherlands', 'Croatia', 1, 2),
  fin('round_of_16', 'Italy', 'Denmark', 0, 1),
  fin('round_of_16', 'Sweden', 'Norway', 2, 1),
  fin('round_of_16', 'Canada', 'Serbia', 0, 3),
]

// ── Quarter-finals — the live edge of the tournament (mixed states) ──────────
const QF: Match[] = [
  fin('quarter_final', 'Brazil', 'Argentina', 2, 1), // finished
  mk('quarter_final', 'France', 'Spain', { status: 'live', lock_at: PAST, elapsed_minutes: 63 }), // locked / live
  mk('quarter_final', 'Croatia', 'Denmark', { lock_at: SOON }), // open → will be predicted below
  mk('quarter_final', 'Sweden', 'Serbia', { lock_at: SOON }), // open, untouched
]

// ── Semis / bronze / final — teams not yet known (TBD) ───────────────────────
const REST: Match[] = [
  mk('semi_final', '', ''),
  mk('semi_final', '', ''),
  mk('third_place', '', ''),
  mk('final', '', ''),
]

export const SAMPLE_KNOCKOUT: Match[] = [...R32, ...R16, ...QF, ...REST]

// ── Predictions ─────────────────────────────────────────────────────────────
// One per finished match, cycling through wrong (0p) / right-winner (2p) /
// exact (5p) so the "Klar" state shows the full point range. Plus one pending
// prediction on a QF so the "Tippad" state is visible.
const SAMPLE_USER = 'preview-user'
let pid = 0
function pred(match: Match, winner: 'home' | 'away', hs: number, as: number, pts: number): Prediction {
  pid += 1
  return {
    id: `sample-pred-${pid}`,
    user_id: SAMPLE_USER,
    match_id: match.id,
    pick: null,
    home_score: hs,
    away_score: as,
    winner_pick: winner,
    points_awarded: pts,
  }
}

const finished = [...R32, ...R16, QF[0]]
const finishedPreds: Prediction[] = finished.map((m, i) => {
  const hs = m.home_score!
  const as = m.away_score!
  const actual: 'home' | 'away' = hs > as ? 'home' : hs < as ? 'away' : (m.penalty_winner ?? 'home')
  const wrong: 'home' | 'away' = actual === 'home' ? 'away' : 'home'
  switch (i % 4) {
    case 0: // wrong winner → 0p
      return pred(m, wrong, as, hs, 0)
    case 3: // exact → 5p
      return pred(m, actual, hs, as, 5)
    default: // right winner, off score → 2p
      return pred(m, actual, hs + 1, as, 2)
  }
})

// Pending prediction on the open Croatia–Denmark QF → "Tippad" state.
const pendingPred = pred(QF[2], 'home', 2, 1, 0)

export const SAMPLE_PREDICTIONS: Prediction[] = [...finishedPreds, pendingPred]
