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

export function calcKnockoutPoints(
  winnerPick: WinnerPick,
  actualHome: number,
  actualAway: number,
  guessHome: number,
  guessAway: number
): number {
  const actualWinner: WinnerPick = actualHome > actualAway ? 'home' : 'away'
  if (winnerPick !== actualWinner) return 0
  if (guessHome === actualHome && guessAway === actualAway) return 5
  return 2
}

export function isMatchLocked(lockAt: string): boolean {
  return new Date(lockAt) <= new Date()
}
