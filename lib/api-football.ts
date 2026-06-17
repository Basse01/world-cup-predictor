const API_BASE = 'https://v3.football.api-sports.io'
const WC_LEAGUE_ID = 1     // FIFA World Cup — verify with API if needed
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
  }
}

async function apiFetch(endpoint: string): Promise<{ response: ApiFixture[] }> {
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

export function mapStatus(apiStatus: string): 'scheduled' | 'live' | 'finished' {
  const finished = ['FT', 'AET', 'PEN', 'AWD', 'WO']
  const live = ['1H', '2H', 'HT', 'ET', 'BT', 'P', 'INT', 'LIVE']
  if (finished.includes(apiStatus)) return 'finished'
  if (live.includes(apiStatus)) return 'live'
  return 'scheduled'
}

export function mapStage(round: string): 'group' | 'round_of_16' | 'quarter_final' | 'semi_final' | 'final' {
  if (round.includes('Group')) return 'group'
  if (round.includes('Round of 16') || round.includes('Last 16')) return 'round_of_16'
  if (round.includes('Quarter-final') || round.includes('Quarter Final')) return 'quarter_final'
  if (round.includes('Semi-final') || round.includes('Semi Final')) return 'semi_final'
  return 'final'
}

export function extractGroupName(round: string): string | null {
  const match = round.match(/Group\s+([A-Z])/i)
  return match ? match[1].toUpperCase() : null
}
