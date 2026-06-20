import Link from 'next/link'
import type { Match, MatchEvent } from '@/lib/types'

function matchMinuteLabel(m: Match): string {
  const s = m.api_status
  if (s === 'HT') return 'Halvlek'
  if (s === 'BT') return 'Paus (FT)'
  if (s === 'ET') return `FT ${m.elapsed_minutes ?? ''}'`
  if (s === 'P') return 'Straffar'
  if (m.elapsed_minutes != null) return `${m.elapsed_minutes}'`
  return ''
}

const EVENT_ICON: Record<string, string> = {
  'Normal Goal':    '⚽',
  'Penalty':        '⚽',
  'Own Goal':       '⚽',
  'Missed Penalty': '❌',
  'Yellow Card':    '🟨',
  'Red Card':       '🟥',
  'Yellow Red Card':'🟥',
}

function recentEventLine(e: MatchEvent): string {
  const min = e.extra_time ? `${e.elapsed}+${e.extra_time}'` : `${e.elapsed}'`
  const ico = e.type === 'subst' ? '🔄' : e.type === 'Var' ? '📺' : (EVENT_ICON[e.detail ?? ''] ?? '•')
  if (e.type === 'subst') return `${min}  ${ico}  ${e.player_name ?? ''}`
  return `${min}  ${ico}  ${e.player_name ?? e.detail ?? ''}`
}

interface Props {
  matches: Match[]
  events?: Record<string, MatchEvent[]>
}

export default function LiveMatchBanner({ matches, events = {} }: Props) {
  if (matches.length === 0) return null

  return (
    <div className="space-y-3">
      {matches.map(m => {
        const minuteLabel = matchMinuteLabel(m)
        const matchEvents = (events[m.id] ?? [])
          .filter((e: MatchEvent) => e.type !== 'subst' && e.type !== 'Var')
          .slice(-4)
          .reverse()
        return (
        <Link
          key={m.id}
          href={`/match/${m.id}`}
          className="block"
        >
        <div
          className="relative rounded-xl border border-wc-red bg-[#160808] overflow-hidden"
          style={{ animation: 'live-glow 1.8s ease-in-out infinite' }}
        >
          {/* LIVE badge + minute */}
          <div className="absolute top-3 left-4 flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full bg-wc-red"
              style={{ animation: 'live-pulse 1.2s ease-in-out infinite' }}
            />
            <span className="text-xs font-display text-wc-red tracking-[0.2em] uppercase">
              Live
            </span>
            {minuteLabel && (
              <span className="text-xs font-display text-wc-red/70 tracking-wide">
                · {minuteLabel}
              </span>
            )}
          </div>

          {/* Match row */}
          <div className="flex items-center justify-between px-5 py-5 pt-10">
            {/* Home team */}
            <div className="flex flex-col items-center gap-2 flex-1">
              {m.home_team_logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.home_team_logo}
                  alt={m.home_team}
                  className="w-12 h-12 object-contain drop-shadow-md"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-[#2a2a2a]" />
              )}
              <span className="text-xs font-display text-wc-light-gray text-center uppercase tracking-wide leading-tight max-w-[80px]">
                {m.home_team}
              </span>
            </div>

            {/* Score */}
            <div className="flex items-center gap-2 px-1">
              <span className="font-display text-4xl sm:text-5xl text-wc-light-gray tabular-nums">
                {m.home_score ?? 0}
              </span>
              <span className="font-display text-2xl sm:text-3xl text-white/50">–</span>
              <span className="font-display text-4xl sm:text-5xl text-wc-light-gray tabular-nums">
                {m.away_score ?? 0}
              </span>
            </div>

            {/* Away team */}
            <div className="flex flex-col items-center gap-2 flex-1">
              {m.away_team_logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.away_team_logo}
                  alt={m.away_team}
                  className="w-12 h-12 object-contain drop-shadow-md"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-[#2a2a2a]" />
              )}
              <span className="text-xs font-display text-wc-light-gray text-center uppercase tracking-wide leading-tight max-w-[80px]">
                {m.away_team}
              </span>
            </div>
          </div>

          {/* Recent events */}
          {matchEvents.length > 0 && (
            <div className="border-t border-wc-red/20 px-5 py-3 space-y-1.5">
              {matchEvents.map((e: MatchEvent, i: number) => (
                <p key={i} className="text-xs text-white/50">
                  {recentEventLine(e)}
                </p>
              ))}
            </div>
          )}
        </div>
        </Link>
        )
      })}
    </div>
  )
}
