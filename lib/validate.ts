// Runtime validation for API request bodies. `as string` in a route only tells
// TypeScript what we hope arrived; these check what actually did.
import type { Pick1X2, WinnerPick } from './types'

// Highest goal count accepted for one team in a knockout tip.
export const MAX_SCORE = 20

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

export function isUuid(v: unknown): v is string {
  return typeof v === 'string' && UUID_RE.test(v)
}

export function isScore(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= MAX_SCORE
}

// Trimmed string of 1..maxLength characters, or null.
export function trimmedString(v: unknown, maxLength: number): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  return s.length >= 1 && s.length <= maxLength ? s : null
}

export function parseGroupPick(body: Record<string, unknown>): Parsed<{ pick: Pick1X2 }> {
  const { pick } = body
  if (pick !== '1' && pick !== 'X' && pick !== '2') {
    return { ok: false, error: "pick must be '1', 'X' or '2'" }
  }
  return { ok: true, value: { pick } }
}

export function parseKnockoutPick(
  body: Record<string, unknown>,
): Parsed<{ winner_pick: WinnerPick; home_score: number; away_score: number }> {
  const { winner_pick, home_score, away_score } = body
  if (winner_pick !== 'home' && winner_pick !== 'away') {
    return { ok: false, error: "winner_pick must be 'home' or 'away'" }
  }
  if (!isScore(home_score) || !isScore(away_score)) {
    return { ok: false, error: `home_score and away_score must be integers between 0 and ${MAX_SCORE}` }
  }
  // A draw is allowed (penalties decide), but the picked winner can't lose.
  if ((winner_pick === 'home' && home_score < away_score) || (winner_pick === 'away' && away_score < home_score)) {
    return { ok: false, error: 'Result contradicts winner_pick' }
  }
  return { ok: true, value: { winner_pick, home_score, away_score } }
}
