'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Standing } from '@/lib/types'

export default function LeaderboardTable({ initial }: { initial: Standing[] }) {
  const [standings, setStandings] = useState<Standing[]>(initial)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('standings-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'predictions' },
        async () => {
          const { data } = await supabase
            .from('standings')
            .select('*')
            .order('rank')
          if (data) setStandings(data as Standing[])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const medalColors = ['text-yellow-400', 'text-gray-400', 'text-amber-600']

  return (
    <div className="rounded-xl overflow-hidden border border-[#2a2a2a]">
      <table className="w-full">
        <thead>
          <tr className="bg-[#1a1a1a] border-b border-[#2a2a2a]">
            <th className="text-left px-4 py-3 text-xs text-wc-dark-gray uppercase tracking-widest font-medium w-12">#</th>
            <th className="text-left px-4 py-3 text-xs text-wc-dark-gray uppercase tracking-widest font-medium">Spelare</th>
            <th className="text-right px-4 py-3 text-xs text-wc-dark-gray uppercase tracking-widest font-medium">Poäng</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s, i) => (
            <tr
              key={s.user_id}
              className={`border-b border-[#1a1a1a] transition-colors ${
                i === 0 ? 'bg-[#1a1f1a]' : 'bg-[#111] hover:bg-[#1a1a1a]'
              }`}
            >
              <td className={`px-4 py-3 font-display text-lg ${medalColors[i] ?? 'text-wc-dark-gray'}`}>
                {s.rank}
              </td>
              <td className="px-4 py-3">
                <span className="text-wc-light-gray font-medium">{s.display_name}</span>
              </td>
              <td className="px-4 py-3 text-right font-display text-xl text-wc-light-gray">
                {s.total_points}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {standings.length === 0 && (
        <p className="text-wc-dark-gray text-center py-8">Inga spelare ännu.</p>
      )}
    </div>
  )
}
