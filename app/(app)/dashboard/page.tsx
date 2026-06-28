import { createClient, getUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Match, MatchEvent, Standing, Prediction } from '@/lib/types'
import LiveMatchBanner from '@/components/live-match-banner'
import TodayMatchTipper from '@/components/today-match-tipper'

const KNOCKOUT_STAGES = ['round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'final']

export default async function DashboardPage() {
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

  const [
    { data: profile },
    { data: liveMatches },
    { data: upcomingMatches },
    { data: topStandings },
    { data: myStanding },
    { data: recentMatches },
    { data: groupMatchIds },
    { data: knockoutMatchIds },
    { data: myPredictions },
  ] = await Promise.all([
    supabase.from('profiles').select('display_name').eq('id', user.id).single(),
    supabase.from('matches').select('*').eq('status', 'live').order('kickoff_at'),
    supabase.from('matches').select('*').eq('status', 'scheduled').gte('kickoff_at', nowDate.toISOString()).lt('kickoff_at', windowEnd.toISOString()).order('kickoff_at'),
    supabase.from('standings').select('*').order('rank').limit(5),
    supabase.from('standings').select('total_points, rank').eq('user_id', user.id).single(),
    supabase.from('matches')
      .select('id, home_team, away_team, home_score, away_score, kickoff_at, stage, home_team_logo, away_team_logo')
      .eq('status', 'finished')
      .order('kickoff_at', { ascending: false })
      .limit(3),
    supabase.from('matches').select('id').eq('stage', 'group'),
    supabase.from('matches').select('id').in('stage', KNOCKOUT_STAGES),
    supabase.from('predictions').select('*').eq('user_id', user.id),
  ])

  // Fetch events for live matches (separate query since IDs needed first)
  const liveMatchIds = (liveMatches ?? []).map(m => m.id)
  const { data: liveEventsRaw } = liveMatchIds.length > 0
    ? await supabase.from('match_events').select('*').in('match_id', liveMatchIds)
    : { data: [] }

  const eventsByMatch: Record<string, MatchEvent[]> = {}
  for (const e of (liveEventsRaw ?? []) as MatchEvent[]) {
    if (!eventsByMatch[e.match_id]) eventsByMatch[e.match_id] = []
    eventsByMatch[e.match_id].push(e)
  }

  const myPredSet = new Set(myPredictions?.map(p => p.match_id) ?? [])
  const groupTotal = groupMatchIds?.length ?? 0
  const groupDone = groupMatchIds?.filter(m => myPredSet.has(m.id)).length ?? 0
  const knockoutTotal = knockoutMatchIds?.length ?? 0
  const knockoutDone = knockoutMatchIds?.filter(m => myPredSet.has(m.id)).length ?? 0
  const predByMatch = new Map(myPredictions?.map(p => [p.match_id, p]) ?? [])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl text-wc-light-gray uppercase tracking-wide">
          Välkommen, {profile?.display_name}
        </h1>
        <p className="text-white/50 text-sm mt-1">
          {new Date().toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Stockholm' })}
        </p>
      </div>

      <LiveMatchBanner matches={(liveMatches ?? []) as Match[]} events={eventsByMatch} />

      {myStanding ? (
        <div className="bg-[#1a1a1a] rounded-xl p-5 border border-wc-blue/30 flex justify-between items-center">
          <div>
            <p className="text-xs text-white/50 uppercase tracking-widest">Min placering</p>
            <p className="font-display text-5xl text-wc-light-gray mt-1">#{myStanding.rank}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/50 uppercase tracking-widest">Poäng</p>
            <p className="font-display text-5xl text-wc-green mt-1">{myStanding.total_points}</p>
          </div>
        </div>
      ) : (
        <div className="bg-[#1a1a1a] rounded-xl p-5 border border-[#2a2a2a] text-center">
          <p className="text-white/50 text-sm">Du har inte lämnat några tips ännu.</p>
          <Link href="/tips/gruppspel" className="text-wc-blue text-sm hover:underline mt-1 inline-block">
            Lämna tips →
          </Link>
        </div>
      )}

      {(groupTotal > 0 || knockoutTotal > 0) && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a]">
            <p className="text-xs text-white/50 uppercase tracking-widest mb-2">Gruppspel</p>
            <div className="h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
              <div
                className="h-full bg-wc-blue rounded-full transition-all duration-500"
                style={{ width: groupTotal > 0 ? `${(groupDone / groupTotal) * 100}%` : '0%' }}
              />
            </div>
            <p className="text-xs text-white/50 mt-2">{groupDone}/{groupTotal} tips</p>
          </div>
          <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a]">
            <p className="text-xs text-white/50 uppercase tracking-widest mb-2">Slutspel</p>
            <div className="h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
              <div
                className="h-full bg-wc-red rounded-full transition-all duration-500"
                style={{ width: knockoutTotal > 0 ? `${(knockoutDone / knockoutTotal) * 100}%` : '0%' }}
              />
            </div>
            <p className="text-xs text-white/50 mt-2">{knockoutDone}/{knockoutTotal} tips</p>
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-display text-xl text-wc-light-gray uppercase tracking-wide">Dagens matcher</h2>
            {(upcomingMatches ?? []).length > 0 && (() => {
              const untipped = (upcomingMatches ?? []).filter((m: Match) => !myPredSet.has(m.id)).length
              return untipped > 0
                ? <p className="text-xs text-wc-blue mt-0.5">{untipped} matcher kvar att tippa</p>
                : <p className="text-xs text-wc-green mt-0.5">Alla matcher tippade ✓</p>
            })()}
          </div>
          <Link href="/tips/gruppspel" className="text-xs text-wc-blue hover:underline">Alla tips →</Link>
        </div>
        {(() => {
          const untipped = (upcomingMatches ?? []).filter((m: Match) => !myPredSet.has(m.id)).length
          return untipped > 0 ? (
            <Link
              href="/tips/idag"
              className="flex items-center justify-between bg-wc-blue/10 border border-wc-blue/40 rounded-xl px-4 py-4 mb-3 hover:bg-wc-blue/15 hover:border-wc-blue/70 transition-all active:scale-[0.99]"
            >
              <div>
                <p className="font-display text-wc-light-gray uppercase tracking-wide text-sm">
                  Tippa på dagens matcher här!
                </p>
                <p className="text-white/50 text-xs mt-0.5">{untipped} matcher kvar att tippa</p>
              </div>
              <span className="bg-wc-blue text-white font-display text-xs tracking-widest uppercase px-3 py-2 rounded-lg flex-shrink-0">
                Tippa nu →
              </span>
            </Link>
          ) : null
        })()}
        <TodayMatchTipper
          matches={(upcomingMatches ?? []) as Match[]}
          predictions={(myPredictions ?? []) as Prediction[]}
        />
      </div>

      {(recentMatches ?? []).length > 0 && (
        <div>
          <h2 className="font-display text-xl text-wc-light-gray uppercase tracking-wide mb-3">
            Senaste resultat
          </h2>
          <div className="space-y-2">
            {(recentMatches ?? []).map(m => {
              const pred = predByMatch.get(m.id)
              return (
                <div
                  key={m.id}
                  className="bg-[#1a1a1a] rounded-xl px-4 py-4 flex items-center border border-[#252525]"
                >
                  {/* Mirror spacer */}
                  <div className="w-[62px] flex-shrink-0" aria-hidden="true" />

                  {/* Flags + score — centered */}
                  <div className="flex-1 flex items-center justify-center gap-5">
                    {m.home_team_logo
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={m.home_team_logo} alt={m.home_team} title={m.home_team} className="w-10 h-10 object-contain flex-shrink-0" />
                      : <div className="w-10 h-10 bg-white/10 rounded-full flex-shrink-0" />
                    }
                    <span className="font-display text-xl text-wc-light-gray flex-shrink-0">
                      {m.home_score}–{m.away_score}
                    </span>
                    {m.away_team_logo
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={m.away_team_logo} alt={m.away_team} title={m.away_team} className="w-10 h-10 object-contain flex-shrink-0" />
                      : <div className="w-10 h-10 bg-white/10 rounded-full flex-shrink-0" />
                    }
                  </div>

                  {/* Points */}
                  <div className="w-[62px] flex-shrink-0 flex justify-end">
                    {pred ? (
                      <span className={`text-sm font-display ${(pred.points_awarded ?? 0) > 0 ? 'text-wc-green' : 'text-white/30'}`}>
                        {(pred.points_awarded ?? 0) > 0 ? `+${pred.points_awarded}p` : '0p'}
                      </span>
                    ) : (
                      <span className="text-xs text-white/25">–</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-xl text-wc-light-gray uppercase tracking-wide">Topp 5</h2>
          <Link href="/leaderboard" className="text-xs text-wc-blue hover:underline">Full tabell →</Link>
        </div>
        <div className="space-y-2">
          {(topStandings ?? []).map((s: Standing, i: number) => (
            <Link
              key={s.user_id}
              href={`/profile/${s.user_id}`}
              className={`rounded-lg px-4 py-3 flex justify-between items-center transition-colors ${
                s.user_id === user.id
                  ? 'bg-wc-blue/10 border border-wc-blue/30 hover:bg-wc-blue/15 active:bg-wc-blue/20'
                  : 'bg-[#1a1a1a] hover:bg-[#222] active:bg-[#252525]'
              }`}
            >
              <span className="text-wc-light-gray text-sm">
                {(['🥇', '🥈', '🥉'] as const)[i] ?? `${i + 1}.`}{' '}
                {s.display_name}
                {s.user_id === user.id && (
                  <span className="text-wc-blue text-xs ml-1.5">(du)</span>
                )}
              </span>
              <span className="font-display text-lg text-wc-light-gray">{s.total_points}p</span>
            </Link>
          ))}
          {(topStandings ?? []).length === 0 && (
            <p className="text-white/50 text-sm">Inga spelare ännu.</p>
          )}
        </div>
      </div>
    </div>
  )
}
