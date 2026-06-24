import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react'
import MatchCard from './match-card'
import type { Match } from '@/lib/types'

function makeMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: 'match-1',
    api_match_id: 1,
    home_team: 'Sweden',
    away_team: 'Brazil',
    home_team_logo: null,
    away_team_logo: null,
    kickoff_at: new Date(Date.now() + 3_600_000).toISOString(),
    status: 'scheduled',
    stage: 'group',
    home_score: null,
    away_score: null,
    group_name: 'A',
    // not locked: 50 minutes in the future
    lock_at: new Date(Date.now() + 3_000_000).toISOString(),
    elapsed_minutes: null,
    api_status: null,
    ...overrides,
  }
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('MatchCard — submit failure handling', () => {
  it('reverts the optimistic pick and stays interactive when the request THROWS (network drop)', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'))
    vi.stubGlobal('fetch', fetchMock)
    const onPickChange = vi.fn()
    const match = makeMatch()

    render(<MatchCard match={match} onPickChange={onPickChange} />)

    fireEvent.click(screen.getByText('1'))

    // the request was attempted
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    // BUG: on a thrown fetch the optimistic pick must be rolled back to "no pick",
    // otherwise the button stays green and the user believes the tip saved.
    await waitFor(() => expect(onPickChange).toHaveBeenLastCalledWith(match.id, false))

    // BUG: the card must NOT freeze — a second tap should fire another request.
    fireEvent.click(screen.getByText('1'))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
  })

  it('reverts the optimistic pick when the server responds with an HTTP error', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 403 } as Response)
    vi.stubGlobal('fetch', fetchMock)
    const onPickChange = vi.fn()
    const match = makeMatch()

    render(<MatchCard match={match} onPickChange={onPickChange} />)

    fireEvent.click(screen.getByText('X'))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(onPickChange).toHaveBeenLastCalledWith(match.id, false))
  })

  it('keeps the optimistic pick when the request succeeds', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true } as Response)
    vi.stubGlobal('fetch', fetchMock)
    const onPickChange = vi.fn()
    const match = makeMatch()

    render(<MatchCard match={match} onPickChange={onPickChange} />)

    fireEvent.click(screen.getByText('2'))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(onPickChange).toHaveBeenLastCalledWith(match.id, true)
  })
})
