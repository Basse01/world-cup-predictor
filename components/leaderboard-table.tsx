'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Standing } from '@/lib/types'

export default function LeaderboardTable({ initial, userId }: { initial: Standing[], userId?: string }) {
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
    <div className="rounded-xl overflow-x-auto border border-[#2a2a2a]">
      <table className="w-full min-w-[280px]">
        <thead>
          <tr className="bg-[#1a1a1a] border-b border-[#2a2a2a]">
            <th className="text-left px-4 py-3 text-xs text-white/50 uppercase tracking-widest font-medium w-12">#</th>
            <th className="text-left px-4 py-3 text-xs text-white/50 uppercase tracking-widest font-medium">Spelare</th>
            <th className="text-right px-4 py-3 text-xs text-white/50 uppercase tracking-widest font-medium">Poäng</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s, i) => {
            const isMe = userId && s.user_id === userId
            return (
              <tr
                key={s.user_id}
                className={`border-b border-[#1a1a1a] transition-colors ${
                  isMe
                    ? 'bg-wc-blue/10 hover:bg-wc-blue/15'
                    : i === 0 ? 'bg-[#1a1f1a] hover:bg-[#1e231e]' : 'bg-[#111] hover:bg-[#1a1a1a]'
                }`}
              >
                <td className={`px-4 py-3 font-display text-lg ${medalColors[i] ?? 'text-white/50'}`}>
                  {s.rank}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/profile/${s.user_id}`}
                    className={`font-medium hover:underline underline-offset-2 ${isMe ? 'text-wc-blue' : 'text-wc-light-gray'}`}
                  >
                    <span className="block truncate max-w-[180px] sm:max-w-none">{s.display_name}</span>
                    {isMe && <span className="text-xs ml-1.5 opacity-70">(du)</span>}
                  </Link>
                </td>
                <td className="px-4 py-3 text-right font-display text-xl text-wc-light-gray">
                  {s.total_points}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {standings.length === 0 && (
        <p className="text-white/50 text-center py-8">Inga spelare ännu.</p>
      )}
    </div>
  )
}
