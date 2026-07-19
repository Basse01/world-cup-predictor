import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function StatsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: goalEventsRaw }, { data: finishedMatches }] = await Promise.all([
    supabase
      .from('match_events')
      .select('player_name, player_id, team_name, team_logo, comments')
      .eq('type', 'Goal')
      .neq('detail', 'Own Goal')
      .neq('detail', 'Missed Penalty')
      .not('player_name', 'is', null),
    supabase
      .from('matches')
      .select('home_score, away_score')
      .eq('status', 'finished'),
  ])

  // Shootout kicks are events of type Goal but don't count as match goals for
  // anyone. Filtered in JS — a .neq() on `comments` would drop NULL rows too.
  const goalEvents = (goalEventsRaw ?? []).filter(e => e.comments !== 'Penalty Shootout')

  // Total from match scores, not events — events have API-era duplicates
  // (VAR-disallowed goals) and gaps (manually entered results have no events).
  const totalGoals = (finishedMatches ?? []).reduce(
    (sum, m) => sum + (m.home_score ?? 0) + (m.away_score ?? 0), 0)

  // Aggregate goals per player in JS (WC has <500 goal events).
  // Group by stable api-football player_id when present — player NAMES vary between
  // fixtures ("Kylian Mbappé" vs "K. Mbappe") and would otherwise split the same
  // scorer into two rows. Fall back to name for legacy rows without a player_id.
  const playerMap = new Map<string, { name: string; team: string; teamLogo: string | null; goals: number }>()
  for (const e of goalEvents ?? []) {
    if (!e.player_name) continue
    const key = e.player_id != null ? `id:${e.player_id}` : `name:${e.player_name}`
    const existing = playerMap.get(key)
    if (existing) {
      existing.goals++
      // Prefer the fullest available name for display (e.g. "Kylian Mbappé" over "K. Mbappe")
      if (e.player_name.length > existing.name.length) existing.name = e.player_name
    } else {
      playerMap.set(key, { name: e.player_name, team: e.team_name, teamLogo: e.team_logo, goals: 1 })
    }
  }

  const scorers = Array.from(playerMap.values())
    .sort((a, b) => b.goals - a.goals)

  const medalColors = ['text-yellow-400', 'text-gray-400', 'text-amber-600']

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* Total goals */}
      <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-[#2a2a2a] text-center">
        <div className="text-6xl font-display text-wc-green">{totalGoals ?? 0}</div>
        <div className="text-sm text-white/50 mt-2 uppercase tracking-widest font-display">
          Mål i VM 2026
        </div>
      </div>

      {/* Skytteliga */}
      <div>
        <h2 className="font-display text-sm uppercase tracking-widest text-white/50 px-1 mb-3">
          Skytteliga
        </h2>

        {scorers.length === 0 ? (
          <div className="bg-[#1a1a1a] rounded-xl p-8 border border-[#2a2a2a] text-center">
            <p className="text-white/50 text-sm">Inga mål registrerade ännu.</p>
          </div>
        ) : (
          <div className="rounded-xl overflow-x-auto border border-[#2a2a2a]">
            <table className="w-full min-w-[280px]">
              <thead>
                <tr className="bg-[#1a1a1a] border-b border-[#2a2a2a]">
                  <th className="text-left px-4 py-3 text-xs text-white/50 uppercase tracking-widest font-medium w-10">#</th>
                  <th className="text-left px-4 py-3 text-xs text-white/50 uppercase tracking-widest font-medium">Spelare</th>
                  <th className="text-right px-4 py-3 text-xs text-white/50 uppercase tracking-widest font-medium">Mål</th>
                </tr>
              </thead>
              <tbody>
                {scorers.map((s, i) => (
                  <tr
                    key={i}
                    className={`border-b border-[#1a1a1a] transition-colors ${
                      i === 0 ? 'bg-[#1a1f1a] hover:bg-[#1e231e]' : 'bg-[#111] hover:bg-[#1a1a1a]'
                    }`}
                  >
                    <td className={`px-4 py-3 font-display text-lg ${medalColors[i] ?? 'text-white/50'}`}>
                      {i + 1}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-wc-light-gray">{s.name}</div>
                      <div className="text-xs text-white/50 mt-0.5">{s.team}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-display text-xl text-wc-green">
                      {s.goals}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
