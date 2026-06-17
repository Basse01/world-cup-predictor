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

describe('calcKnockoutPoints', () => {
  it('awards 5 for correct winner and exact score', () => {
    expect(calcKnockoutPoints('home', 2, 1, 2, 1)).toBe(5)
  })

  it('awards 2 for correct winner but wrong score', () => {
    expect(calcKnockoutPoints('home', 2, 1, 3, 1)).toBe(2)
  })

  it('awards 0 for wrong winner', () => {
    expect(calcKnockoutPoints('away', 2, 1, 2, 1)).toBe(0)
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
