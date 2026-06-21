import { redirect } from 'next/navigation'
import { createClient, getUser } from '@/lib/supabase/server'
import type { Match, Prediction } from '@/lib/types'
import TodayMatchList from '@/components/today-match-list'

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

  const todayMatches = (matches ?? []) as Match[]
  const todayPredictions = (predictions ?? []) as Prediction[]

  return (
    <div>
      <h1 className="font-display text-3xl sm:text-4xl text-wc-light-gray uppercase tracking-wide mb-4">
        Dagens matcher
      </h1>
      <TodayMatchList matches={todayMatches} predictions={todayPredictions} />
    </div>
  )
}
