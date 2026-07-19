import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import MatchEventsList from '@/components/match-events-list'
import type { MatchEvent } from '@/lib/types'

const STAGE_LABEL: Record<string, string> = {
  group:          'Gruppspel',
  round_of_32:   'Omgång 32',
  round_of_16:   'Åttondelsfinaler',
  quarter_final:  'Kvartsfinaler',
  semi_final:     'Semifinaler',
  third_place:    'Bronsmatch',
  final:          'Final',
}

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { id } = await params

  const [{ data: match }, { data: events }, { data: myPred }, { data: allPreds }, { data: profiles }] = await Promise.all([
    supabase.from('matches').select('*').eq('id', id).single(),
    supabase.from('match_events').select('*').eq('match_id', id).order('elapsed').order('extra_time'),
    supabase.from('predictions').select('*').eq('match_id', id).eq('user_id', user.id).maybeSingle(),
    supabase.from('predictions')
      .select('user_id, pick, home_score, away_score, winner_pick, points_awarded')
      .eq('match_id', id),
    supabase.from('profiles').select('id, display_name'),
  ])

  if (!match) notFound()

  const kickoff = new Date(match.kickoff_at)
  const isLive = match.status === 'live'
  const isFinished = match.status === 'finished'

  // Everyone's tips are secret until the match locks — after that they're
  // frozen, so showing them spoils nothing.
  const isTipsLocked = new Date(match.lock_at) <= new Date()
  const nameById = new Map((profiles ?? []).map((p: { id: string; display_name: string }) => [p.id, p.display_name]))
  const allTips = (allPreds ?? [])
    .map(p => ({
      ...p,
      name: nameById.get(p.user_id) ?? 'Okänd',
      tipLabel: p.pick
        ? p.pick === '1' ? match.home_team : p.pick === '2' ? match.away_team : 'Kryss'
        : `${p.home_score ?? '?'}–${p.away_score ?? '?'} · ${p.winner_pick === 'home' ? match.home_team : match.away_team}`,
    }))
    .sort((a, b) =>
      (a.winner_pick ?? a.pick ?? '').localeCompare(b.winner_pick ?? b.pick ?? '') ||
      a.name.localeCompare(b.name, 'sv')
    )

  const goalEvents = (events ?? []).filter((e: MatchEvent) =>
    e.type === 'Goal' && e.detail !== 'Missed Penalty'
  )

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* Back */}
      <Link href="/dashboard" className="text-xs text-white/50 hover:text-wc-light-gray flex items-center gap-1">
        ← Tillbaka
      </Link>

      {/* Header card */}
      <div
        className={`rounded-2xl border overflow-hidden ${
          isLive
            ? 'border-wc-red bg-[#160808]'
            : 'border-[#2a2a2a] bg-[#1a1a1a]'
        }`}
        style={isLive ? { animation: 'live-glow 1.8s ease-in-out infinite' } : undefined}
      >
        {/* Stage + status bar */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <span className="text-xs text-white/50 font-display uppercase tracking-widest">
            {STAGE_LABEL[match.stage] ?? match.stage}
            {match.group_name ? ` — Grupp ${match.group_name}` : ''}
          </span>
          {isLive && (
            <span className="flex items-center gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full bg-wc-red"
                style={{ animation: 'live-pulse 1.2s ease-in-out infinite' }}
              />
              <span className="text-xs font-display text-wc-red tracking-[0.2em] uppercase">
                Live{match.elapsed_minutes != null ? ` · ${match.elapsed_minutes}'` : ''}
              </span>
            </span>
          )}
          {!isLive && !isFinished && (
            <span className="text-xs text-white/50">
              {kickoff.toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Stockholm' })}{' '}
              {kickoff.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Stockholm' })}
            </span>
          )}
          {isFinished && (
            <span className="text-xs text-white/50 font-display uppercase tracking-wider">Avslutad</span>
          )}
        </div>

        {/* Teams + score */}
        <div className="flex items-center justify-between px-6 py-5">
          <div className="flex flex-col items-center gap-2 flex-1">
            {match.home_team_logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={match.home_team_logo} alt={match.home_team} className="w-14 h-14 object-contain drop-shadow-md" />
            )}
            <span className="text-xs font-display text-wc-light-gray uppercase tracking-wide text-center max-w-[90px] leading-tight">
              {match.home_team}
            </span>
          </div>

          <div className="flex flex-col items-center gap-1">
            {isFinished || isLive ? (
              <span className="font-display text-5xl text-wc-light-gray tabular-nums">
                {match.home_score ?? 0} – {match.away_score ?? 0}
              </span>
            ) : (
              <span className="font-display text-2xl text-white/50">vs</span>
            )}
          </div>

          <div className="flex flex-col items-center gap-2 flex-1">
            {match.away_team_logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={match.away_team_logo} alt={match.away_team} className="w-14 h-14 object-contain drop-shadow-md" />
            )}
            <span className="text-xs font-display text-wc-light-gray uppercase tracking-wide text-center max-w-[90px] leading-tight">
              {match.away_team}
            </span>
          </div>
        </div>

        {/* Goal scorers summary */}
        {goalEvents.length > 0 && (
          <div className="flex justify-between px-6 pb-4 gap-4 text-xs text-white/50">
            <div className="flex-1 space-y-0.5">
              {goalEvents
                .filter((e: MatchEvent) => e.team_name === match.home_team)
                .map((e: MatchEvent, i: number) => (
                  <div key={i}>
                    {e.player_name} {e.extra_time ? `${e.elapsed}+${e.extra_time}'` : `${e.elapsed}'`}
                    {e.detail === 'Own Goal' && ' (SG)'}
                    {e.detail === 'Penalty' && ' (str)'}
                  </div>
                ))}
            </div>
            <div className="flex-1 space-y-0.5 text-right">
              {goalEvents
                .filter((e: MatchEvent) => e.team_name === match.away_team)
                .map((e: MatchEvent, i: number) => (
                  <div key={i}>
                    {e.extra_time ? `${e.elapsed}+${e.extra_time}'` : `${e.elapsed}'`} {e.player_name}
                    {e.detail === 'Own Goal' && ' (SG)'}
                    {e.detail === 'Penalty' && ' (str)'}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* My prediction */}
      {myPred && (
        <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] px-5 py-4">
          <p className="text-xs text-white/50 uppercase tracking-widest mb-1">Mitt tips</p>
          <div className="flex items-center justify-between">
            <span className="text-wc-light-gray text-sm font-display">
              {myPred.pick
                ? myPred.pick === '1' ? match.home_team : myPred.pick === '2' ? match.away_team : 'Oavgjort'
                : `${myPred.home_score ?? '?'} – ${myPred.away_score ?? '?'}`}
            </span>
            {myPred.points_awarded != null && (
              <span className={`font-display text-lg ${myPred.points_awarded > 0 ? 'text-wc-green' : 'text-white/50'}`}>
                {myPred.points_awarded > 0 ? `+${myPred.points_awarded}p` : '0p'}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Everyone's tips — visible once the match is locked */}
      {isTipsLocked && allTips.length > 0 && (
        <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] overflow-hidden">
          <div className="px-5 py-3 border-b border-[#2a2a2a]">
            <h2 className="font-display text-sm uppercase tracking-widest text-white/50">
              Alla tips <span className="text-white/40">({allTips.length})</span>
            </h2>
          </div>
          <div className="divide-y divide-[#252525]">
            {allTips.map(t => {
              const pts = t.points_awarded ?? 0
              return (
                <div key={t.user_id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <Link
                    href={`/profile/${t.user_id}`}
                    className="text-sm text-wc-light-gray truncate min-h-[44px] flex items-center flex-1"
                  >
                    {t.name}
                  </Link>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm font-display text-wc-light-gray">{t.tipLabel}</span>
                    {isFinished && (
                      <span className={`text-xs font-display font-bold w-9 text-right ${pts > 0 ? 'text-wc-green' : 'text-white/30'}`}>
                        {pts > 0 ? `+${pts}p` : '0p'}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Full event timeline */}
      {(events ?? []).length > 0 && (
        <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] overflow-hidden">
          <div className="px-5 py-3 border-b border-[#2a2a2a] flex items-center justify-between">
            <h2 className="font-display text-sm uppercase tracking-widest text-white/50">
              Matchhändelser
            </h2>
            <div className="flex gap-4 text-xs text-white/50">
              <span className="truncate max-w-[80px]">{match.home_team}</span>
              <span className="truncate max-w-[80px] text-right">{match.away_team}</span>
            </div>
          </div>
          <MatchEventsList
            events={events as MatchEvent[]}
            homeTeam={match.home_team}
          />
        </div>
      )}

      {(events ?? []).length === 0 && (isLive || isFinished) && (
        <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] px-5 py-4 text-center">
          <p className="text-white/50 text-sm">Inga händelser synkade ännu.</p>
        </div>
      )}
    </div>
  )
}
