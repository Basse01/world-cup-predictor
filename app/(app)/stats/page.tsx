import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function StatsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: goalEvents }, { count: totalGoals }] = await Promise.all([
    supabase
      .from('match_events')
      .select('player_name, team_name, team_logo')
      .eq('type', 'Goal')
      .neq('detail', 'Own Goal')
      .neq('detail', 'Missed Penalty')
      .not('player_name', 'is', null),
    supabase
      .from('match_events')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'Goal')
      .neq('detail', 'Missed Penalty'),
  ])

  // Aggregate goals per player in JS (WC has <500 goal events)
  const playerMap = new Map<string, { team: string; teamLogo: string | null; goals: number }>()
  for (const e of goalEvents ?? []) {
    if (!e.player_name) continue
    const existing = playerMap.get(e.player_name)
    if (existing) {
      existing.goals++
    } else {
      playerMap.set(e.player_name, { team: e.team_name, teamLogo: e.team_logo, goals: 1 })
    }
  }

  const scorers = Array.from(playerMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.goals - a.goals)

  const medalColors = ['text-yellow-400', 'text-gray-400', 'text-amber-600']

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* Total goals */}
      <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-[#2a2a2a] text-center">
        <div className="text-6xl font-display text-wc-green">{totalGoals ?? 0}</div>
        <div className="text-sm text-wc-dark-gray mt-2 uppercase tracking-widest font-display">
          Mål i VM 2026
        </div>
      </div>

      {/* Skytteliga */}
      <div>
        <h2 className="font-display text-sm uppercase tracking-widest text-wc-dark-gray px-1 mb-3">
          Skytteliga
        </h2>

        {scorers.length === 0 ? (
          <div className="bg-[#1a1a1a] rounded-xl p-8 border border-[#2a2a2a] text-center">
            <p className="text-wc-dark-gray text-sm">Inga mål registrerade ännu.</p>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden border border-[#2a2a2a]">
            <table className="w-full">
              <thead>
                <tr className="bg-[#1a1a1a] border-b border-[#2a2a2a]">
                  <th className="text-left px-4 py-3 text-xs text-wc-dark-gray uppercase tracking-widest font-medium w-10">#</th>
                  <th className="text-left px-4 py-3 text-xs text-wc-dark-gray uppercase tracking-widest font-medium">Spelare</th>
                  <th className="text-right px-4 py-3 text-xs text-wc-dark-gray uppercase tracking-widest font-medium">Mål</th>
                </tr>
              </thead>
              <tbody>
                {scorers.map((s, i) => (
                  <tr
                    key={s.name}
                    className={`border-b border-[#1a1a1a] transition-colors ${
                      i === 0 ? 'bg-[#1a1f1a] hover:bg-[#1e231e]' : 'bg-[#111] hover:bg-[#1a1a1a]'
                    }`}
                  >
                    <td className={`px-4 py-3 font-display text-lg ${medalColors[i] ?? 'text-wc-dark-gray'}`}>
                      {i + 1}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-wc-light-gray">{s.name}</div>
                      <div className="text-xs text-wc-dark-gray mt-0.5">{s.team}</div>
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
