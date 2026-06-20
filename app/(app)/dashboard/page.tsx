import { createClient, getUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Match, MatchEvent, Standing } from '@/lib/types'
import LiveMatchBanner from '@/components/live-match-banner'

const KNOCKOUT_STAGES = ['round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'final']

export default async function DashboardPage() {
  const [supabase, user] = await Promise.all([createClient(), getUser()])
  if (!user) redirect('/login')

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
    supabase.from('matches').select('*').eq('status', 'scheduled').order('kickoff_at').limit(3),
    supabase.from('standings').select('*').order('rank').limit(5),
    supabase.from('standings').select('total_points, rank').eq('user_id', user.id).single(),
    supabase.from('matches')
      .select('id, home_team, away_team, home_score, away_score, kickoff_at, stage, home_team_logo, away_team_logo')
      .eq('status', 'finished')
      .order('kickoff_at', { ascending: false })
      .limit(3),
    supabase.from('matches').select('id').eq('stage', 'group'),
    supabase.from('matches').select('id').in('stage', KNOCKOUT_STAGES),
    supabase.from('predictions').select('match_id, points_awarded').eq('user_id', user.id),
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
        <p className="text-wc-dark-gray text-sm mt-1">
          {new Date().toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      <LiveMatchBanner matches={(liveMatches ?? []) as Match[]} events={eventsByMatch} />

      {myStanding ? (
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
      ) : (
        <div className="bg-[#1a1a1a] rounded-xl p-5 border border-[#2a2a2a] text-center">
          <p className="text-wc-dark-gray text-sm">Du har inte lämnat några tips ännu.</p>
          <Link href="/tips/gruppspel" className="text-wc-blue text-sm hover:underline mt-1 inline-block">
            Lämna tips →
          </Link>
        </div>
      )}

      {(groupTotal > 0 || knockoutTotal > 0) && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a]">
            <p className="text-xs text-wc-dark-gray uppercase tracking-widest mb-2">Gruppspel</p>
            <div className="h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
              <div
                className="h-full bg-wc-blue rounded-full transition-all duration-500"
                style={{ width: groupTotal > 0 ? `${(groupDone / groupTotal) * 100}%` : '0%' }}
              />
            </div>
            <p className="text-xs text-wc-dark-gray mt-2">{groupDone}/{groupTotal} tips</p>
          </div>
          <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a]">
            <p className="text-xs text-wc-dark-gray uppercase tracking-widest mb-2">Slutspel</p>
            <div className="h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
              <div
                className="h-full bg-wc-red rounded-full transition-all duration-500"
                style={{ width: knockoutTotal > 0 ? `${(knockoutDone / knockoutTotal) * 100}%` : '0%' }}
              />
            </div>
            <p className="text-xs text-wc-dark-gray mt-2">{knockoutDone}/{knockoutTotal} tips</p>
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
            const tipsHref = m.stage === 'group'
              ? `/tips/gruppspel/${m.group_name}#${m.id}`
              : '/tips/slutspel'
            const hasPred = myPredSet.has(m.id)
            return (
              <Link
                key={m.id}
                href={tipsHref}
                className="bg-[#1a1a1a] rounded-lg px-4 py-3.5 flex items-center gap-3 hover:bg-[#222] active:bg-[#252525] transition-colors"
              >
                {/* Home team */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {m.home_team_logo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.home_team_logo} alt="" className="w-6 h-6 object-contain flex-shrink-0" />
                  )}
                  <span className="text-wc-light-gray text-sm truncate">{m.home_team}</span>
                </div>
                {/* Time */}
                <div className="text-center flex-shrink-0">
                  <span className="text-xs text-wc-dark-gray whitespace-nowrap">
                    {ko.toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short' })}
                    {' '}
                    {ko.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {/* Away team */}
                <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                  <span className="text-wc-light-gray text-sm truncate text-right">{m.away_team}</span>
                  {m.away_team_logo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.away_team_logo} alt="" className="w-6 h-6 object-contain flex-shrink-0" />
                  )}
                </div>
                {/* Bet indicator */}
                <div className="flex-shrink-0 ml-1">
                  {hasPred ? (
                    <span className="text-wc-green text-xs">✓</span>
                  ) : (
                    <span className="text-wc-blue text-xs font-display">Tippa →</span>
                  )}
                </div>
              </Link>
            )
          })}
          {(upcomingMatches ?? []).length === 0 && (
            <p className="text-wc-dark-gray text-sm">Inga kommande matcher.</p>
          )}
        </div>
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
                  className="bg-[#1a1a1a] rounded-lg px-4 py-3.5 flex items-center gap-3"
                >
                  {/* Home */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {m.home_team_logo && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.home_team_logo} alt="" className="w-5 h-5 object-contain flex-shrink-0" />
                    )}
                    <span className="text-wc-light-gray text-sm truncate">{m.home_team}</span>
                  </div>
                  {/* Score */}
                  <span className="font-display text-base text-wc-light-gray flex-shrink-0">
                    {m.home_score}–{m.away_score}
                  </span>
                  {/* Away */}
                  <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                    <span className="text-wc-light-gray text-sm truncate text-right">{m.away_team}</span>
                    {m.away_team_logo && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.away_team_logo} alt="" className="w-5 h-5 object-contain flex-shrink-0" />
                    )}
                  </div>
                  {/* Points */}
                  {pred ? (
                    <span className={`text-sm font-display flex-shrink-0 w-10 text-right ${(pred.points_awarded ?? 0) > 0 ? 'text-wc-green' : 'text-wc-dark-gray'}`}>
                      {(pred.points_awarded ?? 0) > 0 ? `+${pred.points_awarded}p` : '0p'}
                    </span>
                  ) : (
                    <span className="text-xs text-wc-dark-gray flex-shrink-0">(inget tips)</span>
                  )}
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
            <p className="text-wc-dark-gray text-sm">Inga spelare ännu.</p>
          )}
        </div>
      </div>
    </div>
  )
}
