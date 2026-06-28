import { describe, it, expect } from 'vitest'
import { calcGroupPoints, calcKnockoutPoints, isMatchLocked } from './points'

describe('calcGroupPoints', () => {
  it('awards 3 points for correct pick', () => {
    expect(calcGroupPoints('1', 2, 0)).toBe(3) // home wins, pick 1
    expect(calcGroupPoints('X', 1, 1)).toBe(3) // draw, pick X
    expect(calcGroupPoints('2', 0, 1)).toBe(3) // away wins, pick 2
  })

  it('awards 0 for wrong pick', () => {
    expect(calcGroupPoints('X', 2, 0)).toBe(0)
    expect(calcGroupPoints('1', 0, 1)).toBe(0)
  })
})

describe('calcKnockoutPoints (contrarian pot + exact bonus)', () => {
  const win = { winnerPick: 'home', actualWinner: 'home', actualHome: 2, actualAway: 1 } as const

  it('chalk: everyone took the winner → 2p, no pot bonus', () => {
    expect(calcKnockoutPoints({ ...win, guessHome: 3, guessAway: 1, totalTippers: 10, sameWinnerCount: 10 })).toBe(2)
  })

  it('chalk + exact → 7p (2 pot + 5)', () => {
    expect(calcKnockoutPoints({ ...win, guessHome: 2, guessAway: 1, totalTippers: 10, sameWinnerCount: 10 })).toBe(7)
  })

  it('half went the other way, right → 6p', () => {
    expect(calcKnockoutPoints({ ...win, guessHome: 3, guessAway: 1, totalTippers: 18, sameWinnerCount: 9 })).toBe(6)
  })

  it('lone correct (17 of 18 against) → 10p', () => {
    expect(calcKnockoutPoints({ ...win, guessHome: 3, guessAway: 1, totalTippers: 18, sameWinnerCount: 1 })).toBe(10)
  })

  it('lone correct + exact → 15p', () => {
    expect(calcKnockoutPoints({ ...win, guessHome: 2, guessAway: 1, totalTippers: 18, sameWinnerCount: 1 })).toBe(15)
  })

  it('wrong winner → 0p', () => {
    expect(calcKnockoutPoints({ ...win, winnerPick: 'away', guessHome: 2, guessAway: 1, totalTippers: 18, sameWinnerCount: 9 })).toBe(0)
  })

  it('penalty advance: tied score, picked the advancer → pot only', () => {
    // 1-1 after ET, home advanced on penalties; 9 of 18 picked home.
    expect(calcKnockoutPoints({
      winnerPick: 'home', actualWinner: 'home', actualHome: 1, actualAway: 1,
      guessHome: 0, guessAway: 0, totalTippers: 18, sameWinnerCount: 9,
    })).toBe(6)
  })
})

describe('isMatchLocked', () => {
  it('returns true when lock_at is in the past', () => {
    const pastLock = new Date(Date.now() - 1000).toISOString()
    expect(isMatchLocked(pastLock)).toBe(true)
  })

  it('returns false when lock_at is in the future', () => {
    const futureLock = new Date(Date.now() + 60_000).toISOString()
    expect(isMatchLocked(futureLock)).toBe(false)
  })
})
