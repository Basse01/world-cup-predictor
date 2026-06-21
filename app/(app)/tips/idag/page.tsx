import { redirect } from 'next/navigation'
import { createClient, getUser } from '@/lib/supabase/server'
import type { Match, Prediction } from '@/lib/types'
import MatchCard from '@/components/match-card'
import KnockoutCard from '@/components/knockout-card'

export default async function TippaIdagPage() {
  const [supabase, user] = await Promise.all([createClient(), getUser()])
  if (!user) redirect('/login')

  // Matchday window: 08:00 Stockholm → 08:00 Stockholm next day
  const nowMs = Date.now()
  const nowDate = new Date(nowMs)
  const stockholmFakeUTC = new Date(nowDate.toLocaleString('en-US', { timeZone: 'Europe/Stockholm' })).getTime()
  const offsetMs = nowMs - stockholmFakeUTC
  const stockholmDateStr = nowDate.toLocaleDateString('en-CA', { timeZone: 'Europe/Stockholm' })
  const [syear, smonth, sday] = stockholmDateStr.split('-').map(Number)
  const today8amStockholmUTC = new Date(Date.UTC(syear, smonth - 1, sday, 8, 0, 0) + offsetMs)
  const windowStart = today8amStockholmUTC.getTime() <= nowMs
    ? today8amStockholmUTC
    : new Date(today8amStockholmUTC.getTime() - 86400000)
  const windowEnd = new Date(windowStart.getTime() + 86400000)

  const [{ data: matches }, { data: predictions }] = await Promise.all([
    supabase
      .from('matches')
      .select('*')
      .eq('status', 'scheduled')
      .gte('kickoff_at', nowDate.toISOString())
      .lt('kickoff_at', windowEnd.toISOString())
      .order('kickoff_at'),
    supabase.from('predictions').select('*').eq('user_id', user.id),
  ])

  const predMap = new Map((predictions ?? []).map((p: Prediction) => [p.match_id, p]))
  const todayMatches = (matches ?? []) as Match[]
  const tipped = todayMatches.filter(m => predMap.has(m.id)).length
  const total = todayMatches.length
  const allDone = total > 0 && tipped === total

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl sm:text-4xl text-wc-light-gray uppercase tracking-wide">
          Dagens matcher
        </h1>
        {total > 0 && (
          <div className="flex items-center gap-3 mt-2">
            <div className="flex-1 h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
              <div
                className="h-full bg-wc-blue rounded-full transition-all duration-500"
                style={{ width: `${(tipped / total) * 100}%` }}
              />
            </div>
            {allDone
              ? <p className="text-xs text-wc-green whitespace-nowrap">Alla tippade ✓</p>
              : <p className="text-xs text-white/50 whitespace-nowrap">{tipped}/{total} tippade</p>
            }
          </div>
        )}
      </div>

      {total === 0 ? (
        <div className="bg-[#1a1a1a] rounded-xl p-8 border border-[#2a2a2a] text-center">
          <p className="text-white/50">Inga fler matcher idag — nästa matchdag börjar 08:00.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {todayMatches.map(m =>
            m.stage === 'group'
              ? <MatchCard key={m.id} match={m} prediction={predMap.get(m.id)} />
              : <KnockoutCard key={m.id} match={m} prediction={predMap.get(m.id)} />
          )}
        </div>
      )}
    </div>
  )
}
