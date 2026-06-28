import type { Pick1X2, WinnerPick } from './types'

export function calcGroupPoints(
  pick: Pick1X2,
  homeScore: number,
  awayScore: number
): number {
  const actual: Pick1X2 =
    homeScore > awayScore ? '1' : homeScore === awayScore ? 'X' : '2'
  return pick === actual ? 3 : 0
}

// Contrarian "mot strömmen" pot for a correct knockout winner pick.
// 2 base + up to 8 for the share of tippers who took the OTHER team.
// Mirrors calculate_match_points (migration 019). Server is the source of truth.
export function knockoutPot(totalTippers: number, sameWinnerCount: number): number {
  if (totalTippers <= 0) return 2
  const others = Math.max(0, totalTippers - sameWinnerCount)
  return Math.round(2 + 8 * (others / totalTippers))
}

export function calcKnockoutPoints(args: {
  winnerPick: WinnerPick
  actualWinner: WinnerPick // who advanced (after-ET score or penalty_winner)
  guessHome: number
  guessAway: number
  actualHome: number
  actualAway: number
  totalTippers: number // # who tipped this match
  sameWinnerCount: number // # who picked the advancing team
}): number {
  if (args.winnerPick !== args.actualWinner) return 0
  const pot = knockoutPot(args.totalTippers, args.sameWinnerCount)
  const exact = args.guessHome === args.actualHome && args.guessAway === args.actualAway
  return exact ? pot + 5 : pot
}

export function isMatchLocked(lockAt: string): boolean {
  return new Date(lockAt) <= new Date()
}
