import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Match, Standing } from '@/lib/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: profile },
    { data: upcomingMatches },
    { data: standings },
    { data: myStanding },
  ] = await Promise.all([
    supabase.from('profiles').select('display_name').eq('id', user.id).single(),
    supabase.from('matches').select('*').eq('status', 'scheduled')
      .order('kickoff_at').limit(3),
    supabase.from('standings').select('*').order('rank').limit(3),
    supabase.from('standings').select('total_points, rank').eq('user_id', user.id).single(),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl text-wc-light-gray uppercase tracking-wide">
          Välkommen, {profile?.display_name}
        </h1>
      </div>

      {myStanding && (
        <div className="bg-[#1a1a1a] rounded-xl p-5 border border-wc-blue/30 flex justify-between items-center">
          <div>
            <p className="text-xs text-wc-dark-gray uppercase tracking-widest">Min placering</p>
            <p className="font-display text-5xl text-wc-light-gray mt-1">#{myStanding.rank}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-wc-dark-gray uppercase tracking-widest">Poäng</p>
            <p className="font-display text-5xl text-wc-green mt-1">{myStanding.total_points}</p>
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-xl text-wc-light-gray uppercase tracking-wide">Nästa matcher</h2>
          <Link href="/tips/gruppspel" className="text-xs text-wc-blue hover:underline">Alla tips →</Link>
        </div>
        <div className="space-y-2">
          {(upcomingMatches ?? []).map((m: Match) => {
            const ko = new Date(m.kickoff_at)
            return (
              <div key={m.id} className="bg-[#1a1a1a] rounded-lg px-4 py-3 flex justify-between items-center">
                <span className="text-wc-light-gray text-sm">
                  {m.home_team} <span className="text-wc-dark-gray">vs</span> {m.away_team}
                </span>
                <span className="text-xs text-wc-dark-gray">
                  {ko.toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short' })}
                  {' '}
                  {ko.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )
          })}
          {(upcomingMatches ?? []).length === 0 && (
            <p className="text-wc-dark-gray text-sm">Inga kommande matcher.</p>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-xl text-wc-light-gray uppercase tracking-wide">Topp 3</h2>
          <Link href="/leaderboard" className="text-xs text-wc-blue hover:underline">Full tabell →</Link>
        </div>
        <div className="space-y-2">
          {(standings ?? []).map((s: Standing, i: number) => (
            <div key={s.user_id} className="bg-[#1a1a1a] rounded-lg px-4 py-3 flex justify-between items-center">
              <span className="text-wc-light-gray text-sm">
                {['🥇', '🥈', '🥉'][i]} {s.display_name}
              </span>
              <span className="font-display text-lg text-wc-light-gray">{s.total_points}p</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
