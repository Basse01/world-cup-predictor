import type { Match } from '@/lib/types'

interface Props {
  matches: Match[]
}

export default function LiveMatchBanner({ matches }: Props) {
  if (matches.length === 0) return null

  return (
    <div className="space-y-3">
      {matches.map(m => (
        <div
          key={m.id}
          className="relative rounded-xl border border-wc-red bg-[#160808] overflow-hidden"
          style={{ animation: 'live-glow 1.8s ease-in-out infinite' }}
        >
          {/* LIVE badge */}
          <div className="absolute top-3 left-4 flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full bg-wc-red"
              style={{ animation: 'live-pulse 1.2s ease-in-out infinite' }}
            />
            <span className="text-xs font-display text-wc-red tracking-[0.2em] uppercase">
              Live
            </span>
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
            <div className="flex items-center gap-3 px-2">
              <span className="font-display text-5xl text-wc-light-gray tabular-nums">
                {m.home_score ?? 0}
              </span>
              <span className="font-display text-3xl text-wc-dark-gray">–</span>
              <span className="font-display text-5xl text-wc-light-gray tabular-nums">
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
        </div>
      ))}
    </div>
  )
}
