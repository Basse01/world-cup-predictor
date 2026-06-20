import type { MatchEvent } from '@/lib/types'

const EVENT_ICON: Record<string, string> = {
  'Normal Goal':     '⚽',
  'Penalty':         '⚽',
  'Own Goal':        '⚽',
  'Missed Penalty':  '❌',
  'Yellow Card':     '🟨',
  'Red Card':        '🟥',
  'Yellow Red Card': '🟥',
  'Substitution 1':  '🔄',
  'Substitution 2':  '🔄',
  'Substitution 3':  '🔄',
}

function icon(e: MatchEvent): string {
  if (e.type === 'subst') return '🔄'
  if (e.type === 'Var') return '📺'
  return EVENT_ICON[e.detail ?? ''] ?? (e.type === 'Goal' ? '⚽' : e.type === 'Card' ? '🟨' : '•')
}

function label(e: MatchEvent): string {
  if (e.type === 'subst') {
    return `${e.player_name ?? '—'} ↓  ${e.assist_name ?? '—'} ↑`
  }
  if (e.detail === 'Own Goal') return `${e.player_name ?? '—'} (självmål)`
  if (e.detail === 'Penalty') return `${e.player_name ?? '—'} (straff)`
  if (e.detail === 'Missed Penalty') return `${e.player_name ?? '—'} (miss)`
  if (e.type === 'Var') return `VAR${e.detail ? ` — ${e.detail}` : ''}`
  return e.player_name ?? e.detail ?? ''
}

function minuteStr(e: MatchEvent): string {
  return e.extra_time ? `${e.elapsed}+${e.extra_time}'` : `${e.elapsed}'`
}

interface Props {
  events: MatchEvent[]
  /** If provided, show only events for one team on each side  */
  homeTeam?: string
  limit?: number
}

export default function MatchEventsList({ events, homeTeam, limit }: Props) {
  const shown = limit ? events.slice(-limit) : events
  const sorted = [...shown].sort((a, b) =>
    a.elapsed !== b.elapsed ? a.elapsed - b.elapsed : (a.extra_time ?? 0) - (b.extra_time ?? 0)
  )

  if (sorted.length === 0) return null

  return (
    <div className="space-y-0 divide-y divide-[#1e1e1e]">
      {sorted.map((e, i) => {
        const isHome = homeTeam ? e.team_name === homeTeam : false
        const ico = icon(e)
        const lbl = label(e)
        const min = minuteStr(e)

        return (
          <div key={i} className="flex items-center gap-3 px-4 py-2.5">
            {/* Minute */}
            <span className="text-xs font-display text-white/50 w-10 shrink-0 text-right">
              {min}
            </span>

            {/* Icon */}
            <span className="text-base w-5 text-center shrink-0">{ico}</span>

            {/* Description — home on left, away on right */}
            {homeTeam ? (
              isHome ? (
                <>
                  <span className="text-xs text-wc-light-gray flex-1">{lbl}</span>
                  <span className="flex-1" />
                </>
              ) : (
                <>
                  <span className="flex-1" />
                  <span className="text-xs text-wc-light-gray flex-1 text-right">{lbl}</span>
                </>
              )
            ) : (
              <span className="text-xs text-wc-light-gray flex-1">{lbl}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
