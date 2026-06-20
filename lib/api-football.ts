const API_BASE = 'https://v3.football.api-sports.io'
const WC_LEAGUE_ID = 1     // FIFA World Cup
const WC_SEASON = 2026

export interface ApiFixture {
  fixture: {
    id: number
    date: string
    status: { short: string; elapsed: number | null }
  }
  league: { round: string }
  teams: {
    home: { id: number; name: string; logo: string }
    away: { id: number; name: string; logo: string }
  }
  goals: { home: number | null; away: number | null }
  score: {
    fulltime: { home: number | null; away: number | null }
    penalty: { home: number | null; away: number | null } | null
  }
}

async function apiFetch<T = { response: ApiFixture[] }>(endpoint: string): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY! },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`API-Football ${res.status}: ${endpoint}`)
  return res.json()
}

export async function fetchAllFixtures(): Promise<ApiFixture[]> {
  const data = await apiFetch(`/fixtures?league=${WC_LEAGUE_ID}&season=${WC_SEASON}`)
  return data.response
}

export async function fetchLiveFixtures(): Promise<ApiFixture[]> {
  const data = await apiFetch(`/fixtures?league=${WC_LEAGUE_ID}&season=${WC_SEASON}&status=1H-2H-HT-ET-BT-P`)
  return data.response
}

// Infers team_id -> group letter by analysing which teams play each other in group fixtures.
// The standings API for WC 2026 mixes tournament and qualifying data, making it unreliable.
// Fixture-based inference is always correct: teams that share a match must be in the same group.
export function inferTeamGroupMap(groupFixtures: ApiFixture[]): Map<number, string> {
  // Union-Find
  const parent = new Map<number, number>()
  const find = (x: number): number => {
    if (!parent.has(x)) parent.set(x, x)
    if (parent.get(x) !== x) parent.set(x, find(parent.get(x)!))
    return parent.get(x)!
  }
  const union = (a: number, b: number) => {
    const ra = find(a), rb = find(b)
    if (ra !== rb) parent.set(ra, rb)
  }

  for (const f of groupFixtures) {
    union(f.teams.home.id, f.teams.away.id)
  }

  // Group team IDs by their root
  const clusters = new Map<number, number[]>()
  const allTeamIds = new Set<number>()
  for (const f of groupFixtures) {
    allTeamIds.add(f.teams.home.id)
    allTeamIds.add(f.teams.away.id)
  }
  for (const id of allTeamIds) {
    const root = find(id)
    if (!clusters.has(root)) clusters.set(root, [])
    clusters.get(root)!.push(id)
  }

  // Sort clusters by minimum team ID (deterministic ordering), assign A, B, C, ...
  const sorted = Array.from(clusters.values()).sort((a, b) => Math.min(...a) - Math.min(...b))
  const letters = 'ABCDEFGHIJKL'
  const map = new Map<number, string>()
  sorted.forEach((teamIds, i) => {
    const letter = letters[i] ?? String(i + 1)
    for (const id of teamIds) map.set(id, letter)
  })
  return map
}

export interface ApiEvent {
  time: { elapsed: number; extra: number | null }
  team: { id: number; name: string; logo: string }
  player: { id: number | null; name: string | null }
  assist: { id: number | null; name: string | null }
  type: string
  detail: string
  comments: string | null
}

export async function fetchFixtureEvents(fixtureId: number): Promise<ApiEvent[]> {
  const raw = await apiFetch<{ response: ApiEvent[] | null; errors: unknown }>(`/fixtures/events?fixture=${fixtureId}`)
  if (raw.errors && typeof raw.errors === 'object' && Object.keys(raw.errors as object).length > 0) {
    console.error(`[api-football] events errors for fixture ${fixtureId}:`, JSON.stringify(raw.errors))
  }
  const events = raw.response ?? []
  console.log(`[api-football] fixture ${fixtureId}: ${events.length} events`)
  return events
}

export function mapStatus(apiStatus: string): 'scheduled' | 'live' | 'finished' {
  const finished = ['FT', 'AET', 'PEN', 'AWD', 'WO']
  const live = ['1H', '2H', 'HT', 'ET', 'BT', 'P', 'INT', 'LIVE']
  if (finished.includes(apiStatus)) return 'finished'
  if (live.includes(apiStatus)) return 'live'
  return 'scheduled'
}

export function mapStage(round: string): 'group' | 'round_of_32' | 'round_of_16' | 'quarter_final' | 'semi_final' | 'third_place' | 'final' {
  if (round.includes('Group')) return 'group'
  if (round.includes('Round of 32')) return 'round_of_32'
  if (round.includes('Round of 16') || round.includes('Last 16')) return 'round_of_16'
  if (round.includes('Quarter-final') || round.includes('Quarter Final')) return 'quarter_final'
  if (round.includes('Semi-final') || round.includes('Semi Final')) return 'semi_final'
  if (round.includes('3rd') || round.includes('Third') || round.includes('Bronze')) return 'third_place'
  return 'final'
}

