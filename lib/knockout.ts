import type { Match, Prediction, Stage } from './types'
import { isMatchLocked } from './points'
import { getCountry, flagcdn, type CountryMeta } from './countries'

// ── Stage metadata ─────────────────────────────────────────────────────────
// Ordered columns of the main bracket tree. third_place sits outside the tree
// (rendered next to the final), so it is NOT part of BRACKET_STAGES.
export const BRACKET_STAGES: Stage[] = [
  'round_of_32',
  'round_of_16',
  'quarter_final',
  'semi_final',
  'final',
]

// Every knockout stage, in chronological order — used by the Rounds (pager) view.
export const KNOCKOUT_STAGES: Stage[] = [
  'round_of_32',
  'round_of_16',
  'quarter_final',
  'semi_final',
  'third_place',
  'final',
]

interface StageLabel {
  full: string // e.g. "Åttondelsfinal"
  short: string // e.g. "8-DEL" — column headers / tabs
}

export const STAGE_LABELS: Record<Stage, StageLabel> = {
  group: { full: 'Gruppspel', short: 'GRUPP' },
  round_of_32: { full: 'Sextondelsfinal', short: '16-DEL' },
  round_of_16: { full: 'Åttondelsfinal', short: '8-DEL' },
  quarter_final: { full: 'Kvartsfinal', short: 'KVART' },
  semi_final: { full: 'Semifinal', short: 'SEMI' },
  third_place: { full: 'Bronsmatch', short: 'BRONS' },
  final: { full: 'Final', short: 'FINAL' },
}

// ── Match state ────────────────────────────────────────────────────────────
export type MatchState = 'tbd' | 'open' | 'predicted' | 'locked' | 'finished'

// A knockout slot's teams are "known" once both sides are real nations.
// Before the feeding round resolves, synced fixtures may carry empty or
// placeholder names ("Winner 73", "1A", "TBD") — those count as unknown.
const PLACEHOLDER = /^(to be|tbd|winner|loser|runner|group|1[a-l]|2[a-l]|3[a-l]|\d|w\d|ru\d)/i

export function isTeamKnown(name: string | null | undefined): boolean {
  if (!name) return false
  const t = name.trim()
  if (t === '') return false
  return !PLACEHOLDER.test(t)
}

export function bothTeamsKnown(match: Match): boolean {
  return isTeamKnown(match.home_team) && isTeamKnown(match.away_team)
}

export function deriveMatchState(match: Match, prediction?: Prediction): MatchState {
  if (match.status === 'finished') return 'finished'
  if (!bothTeamsKnown(match)) return 'tbd'
  if (isMatchLocked(match.lock_at)) return 'locked' // covers live + lock window
  return prediction?.winner_pick ? 'predicted' : 'open'
}

// ── Display helpers ────────────────────────────────────────────────────────
export interface TeamDisplay extends CountryMeta {
  name: string
  logo: string | null
  flagUrl: string | null // real API logo if present, else a flag-image fallback
  known: boolean
}

export function teamDisplay(name: string | null, logo: string | null): TeamDisplay {
  const known = isTeamKnown(name)
  const meta = getCountry(known ? name : null)
  const realLogo = known ? logo : null
  return {
    ...meta,
    name: name ?? '',
    logo: realLogo,
    flagUrl: realLogo ?? (known ? flagcdn(meta.iso) : null),
    known,
  }
}

// Who did the user tip to win — returns 'home' | 'away' | null.
export function predictedWinner(prediction?: Prediction): 'home' | 'away' | null {
  return prediction?.winner_pick ?? null
}

// Actual winner of a finished match (by full-time score). null if not decided.
export function actualWinner(match: Match): 'home' | 'away' | null {
  if (match.home_score == null || match.away_score == null) return null
  if (match.home_score === match.away_score) return null // shootout edge — treat as undecided here
  return match.home_score > match.away_score ? 'home' : 'away'
}

// ── Grouping ───────────────────────────────────────────────────────────────
export function groupByStage(matches: Match[]): Record<Stage, Match[]> {
  const out = {} as Record<Stage, Match[]>
  for (const s of KNOCKOUT_STAGES) out[s] = []
  for (const m of matches) {
    if (out[m.stage]) out[m.stage].push(m)
  }
  for (const s of KNOCKOUT_STAGES) {
    out[s].sort((a, b) => new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime())
  }
  return out
}

// Stages that actually have at least one synced match, in chronological order.
export function presentStages(matches: Match[]): Stage[] {
  const have = new Set(matches.map(m => m.stage))
  return KNOCKOUT_STAGES.filter(s => have.has(s))
}
