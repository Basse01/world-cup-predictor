import { describe, expect, it } from 'vitest'
import { isPlainObject, isScore, isUuid, MAX_SCORE, parseGroupPick, parseKnockoutPick, trimmedString } from './validate'

describe('isPlainObject', () => {
  it('accepts objects and rejects null, arrays and primitives', () => {
    expect(isPlainObject({})).toBe(true)
    for (const v of [null, [], 'x', 1, true, undefined]) expect(isPlainObject(v)).toBe(false)
  })
})

describe('isUuid', () => {
  it('accepts a UUID and rejects everything else', () => {
    expect(isUuid('3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b')).toBe(true)
    for (const v of ['', 'abc', '3f2b8c1e-9a4d-4e6f-8b2a', 123, null, { id: 'x' }, "' OR 1=1 --"]) {
      expect(isUuid(v)).toBe(false)
    }
  })
})

describe('isScore', () => {
  it(`accepts integers 0..${MAX_SCORE}`, () => {
    expect(isScore(0)).toBe(true)
    expect(isScore(MAX_SCORE)).toBe(true)
  })

  it('rejects negatives, fractions, huge numbers and non-numbers', () => {
    for (const v of [-1, 1.5, MAX_SCORE + 1, 1e9, NaN, Infinity, '2', null, undefined]) {
      expect(isScore(v)).toBe(false)
    }
  })
})

describe('trimmedString', () => {
  it('trims and enforces length', () => {
    expect(trimmedString('  Ada  ', 20)).toBe('Ada')
    expect(trimmedString('   ', 20)).toBeNull()
    expect(trimmedString('x'.repeat(21), 20)).toBeNull()
  })

  it('rejects non-strings instead of crashing on .trim()', () => {
    for (const v of [null, undefined, 42, ['a'], { a: 1 }]) expect(trimmedString(v, 20)).toBeNull()
  })
})

describe('parseGroupPick', () => {
  it('accepts 1, X and 2', () => {
    for (const pick of ['1', 'X', '2']) expect(parseGroupPick({ pick })).toEqual({ ok: true, value: { pick } })
  })

  it('rejects anything else', () => {
    for (const pick of ['x', 1, null, undefined, '12']) expect(parseGroupPick({ pick }).ok).toBe(false)
  })
})

describe('parseKnockoutPick', () => {
  it('accepts a consistent winner and score, including a draw decided on penalties', () => {
    expect(parseKnockoutPick({ winner_pick: 'home', home_score: 2, away_score: 1 }).ok).toBe(true)
    expect(parseKnockoutPick({ winner_pick: 'away', home_score: 1, away_score: 1 }).ok).toBe(true)
  })

  it('returns only the known fields', () => {
    expect(parseKnockoutPick({ winner_pick: 'home', home_score: 1, away_score: 0, points_awarded: 99 }))
      .toEqual({ ok: true, value: { winner_pick: 'home', home_score: 1, away_score: 0 } })
  })

  it('rejects a score that contradicts the picked winner', () => {
    expect(parseKnockoutPick({ winner_pick: 'home', home_score: 0, away_score: 1 }).ok).toBe(false)
  })

  it('rejects missing, mistyped and unreasonable values', () => {
    const bad = [
      { winner_pick: 'draw', home_score: 1, away_score: 1 },
      { winner_pick: 'home', home_score: null, away_score: 0 },
      { winner_pick: 'home', home_score: '2', away_score: 0 },
      { winner_pick: 'home', home_score: 2.5, away_score: 0 },
      { winner_pick: 'home', home_score: 99, away_score: 0 },
      { winner_pick: 'home', home_score: 1, away_score: -1 },
    ]
    for (const body of bad) expect(parseKnockoutPick(body).ok).toBe(false)
  })
})
