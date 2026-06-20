import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, getUser } from '@/lib/supabase/server'
import type { Match, Prediction } from '@/lib/types'

function fmt(iso: string) {
  const d = new Date(iso)
  return (
    d.toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Stockholm' }) +
    ' ' +
    d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Stockholm' })
  )
}

interface TeamRow {
  team: string
  logo: string | null
  played: number
  won: number
  drawn: number
  lost: number
  gf: number
  ga: number
  gd: number
  pts: number
}

function computeGroupStandings(matches: Match[]): TeamRow[] {
  const map = new Map<string, TeamRow>()

  for (const m of matches) {
    if (!map.has(m.home_team))
      map.set(m.home_team, { team: m.home_team, logo: m.home_team_logo, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, pts: 0 })
    if (!map.has(m.away_team))
      map.set(m.away_team, { team: m.away_team, logo: m.away_team_logo, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, pts: 0 })

    if (m.status === 'finished' && m.home_score != null && m.away_score != null) {
      const h = map.get(m.home_team)!
      const a = map.get(m.away_team)!
      h.played++; a.played++
      h.gf += m.home_score; h.ga += m.away_score
      a.gf += m.away_score; a.ga += m.home_score
      if (m.home_score > m.away_score) { h.won++; h.pts += 3; a.lost++ }
      else if (m.home_score < m.away_score) { a.won++; a.pts += 3; h.lost++ }
      else { h.drawn++; h.pts += 1; a.drawn++; a.pts += 1 }
    }
  }

  return Array.from(map.values())
    .map(t => ({ ...t, gd: t.gf - t.ga }))
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team))
}

export default async function GruppspelPage() {
  const [supabase, user] = await Promise.all([createClient(), getUser()])
  if (!user) redirect('/login')

  const [{ data: matches }, { data: predictions }] = await Promise.all([
    supabase.from('matches').select('*').eq('stage', 'group').order('kickoff_at'),
    supabase.from('predictions').select('*').eq('user_id', user.id),
  ])

  const predMap = new Map((predictions ?? []).map((p: Prediction) => [p.match_id, p]))
  const allMatches = (matches ?? []) as Match[]
  const now = new Date()

  // Group by group_name
  const grouped = allMatches.reduce<Record<string, Match[]>>((acc, m) => {
    const key = m.group_name ?? 'Övriga'
    if (!acc[key]) acc[key] = []
    acc[key].push(m)
    return acc
  }, {})
  const sortedGroups = Object.keys(grouped).sort()

  const upcoming = allMatches
    .filter((m) => m.status === 'scheduled' && new Date(m.lock_at) > now)
    .slice(0, 4)

  const missing = allMatches.filter(
    (m) => m.status === 'scheduled' && new Date(m.lock_at) > now && !predMap.has(m.id),
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl sm:text-4xl text-wc-light-gray uppercase tracking-wide">
          Gruppspel
        </h1>
        {missing.length > 0 && (
          <Link
            href="/tips/gruppspel/alla"
            className="flex items-center gap-2 bg-wc-red hover:bg-red-700 active:opacity-75 transition-colors text-white font-display text-sm uppercase tracking-wide px-4 py-2.5 rounded-xl"
          >
            <span>Tippa alla</span>
            <span className="bg-white/20 text-white text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
              {missing.length}
            </span>
          </Link>
        )}
      </div>

      {/* Kommande matcher */}
      {upcoming.length > 0 && (
        <section className="mb-8">
          <h2 className="font-display text-xs text-white/50 uppercase tracking-widest mb-3">
            Kommande matcher
          </h2>
          <div className="space-y-2">
            {upcoming.map((m) => {
              const pred = predMap.get(m.id) as Prediction | undefined
              const pickColor =
                pred?.pick === '1'
                  ? 'bg-wc-blue/20 text-wc-blue'
                  : pred?.pick === 'X'
                    ? 'bg-wc-green/20 text-wc-green'
                    : 'bg-wc-red/20 text-wc-red'
              return (
                <Link
                  key={m.id}
                  href={`/tips/gruppspel/${m.group_name}`}
                  className="flex items-center justify-between bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 hover:border-wc-blue transition-colors active:scale-[0.99]"
                >
                  <div className="min-w-0">
                    <div className="text-xs text-white/50 mb-0.5">
                      {fmt(m.kickoff_at)} · Grupp {m.group_name}
                    </div>
                    <div className="text-sm text-wc-light-gray truncate">
                      {m.home_team}{' '}
                      <span className="text-white/30 mx-1">vs</span> {m.away_team}
                    </div>
                  </div>
                  <div className="ml-3 flex-shrink-0">
                    {pred?.pick ? (
                      <span className={`text-xs font-display px-2.5 py-1 rounded-lg ${pickColor}`}>
                        {pred.pick}
                      </span>
                    ) : (
                      <span className="text-xs text-white/50">Tippa →</span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Matcher du inte gissat på */}
      {missing.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-xs text-white/50 uppercase tracking-widest">
              Matcher du inte gissat på
            </h2>
            <span className="text-xs bg-wc-red/10 text-wc-red px-2 py-0.5 rounded-full font-medium">
              {missing.length} kvar
            </span>
          </div>
          <div className="space-y-2">
            {missing.slice(0, 5).map((m) => (
              <Link
                key={m.id}
                href={`/tips/gruppspel/${m.group_name}`}
                className="flex items-center justify-between bg-[#1a1a1a] border border-wc-red/20 rounded-xl px-4 py-3 hover:border-wc-red/60 transition-colors active:scale-[0.99]"
              >
                <div>
                  <div className="text-xs text-white/50 mb-0.5">
                    {fmt(m.kickoff_at)} · Grupp {m.group_name}
                  </div>
                  <div className="text-sm text-wc-light-gray">
                    {m.home_team}{' '}
                    <span className="text-white/30 mx-1">vs</span> {m.away_team}
                  </div>
                </div>
                <span className="ml-3 text-xs text-wc-red flex-shrink-0">Tippa →</span>
              </Link>
            ))}
            {missing.length > 5 && (
              <p className="text-xs text-white/50 text-center pt-1">
                + {missing.length - 5} till i de olika grupperna
              </p>
            )}
          </div>
        </section>
      )}

      {/* All groups grid */}
      <section>
        <h2 className="font-display text-xs text-white/50 uppercase tracking-widest mb-3">
          Alla grupper
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {sortedGroups.map((group) => {
            const ms = grouped[group]
            const done = ms.filter((m) => predMap.has(m.id)).length
            const total = ms.length
            const allDone = done === total
            const noneDone = done === 0
            const standings = computeGroupStandings(ms)
            const hasPlayed = standings.some(t => t.played > 0)

            return (
              <Link
                key={group}
                href={`/tips/gruppspel/${group}`}
                className={`bg-[#1a1a1a] rounded-xl p-3.5 border transition-colors hover:border-wc-blue/60 active:scale-[0.98] block ${
                  allDone
                    ? 'border-wc-green/40'
                    : noneDone
                      ? 'border-wc-red/20'
                      : 'border-[#2a2a2a]'
                }`}
              >
                {/* Card header */}
                <div className="flex items-center justify-between mb-3">
                  <span className="font-display text-wc-blue text-xl tracking-widest">
                    Grupp {group}
                  </span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    allDone
                      ? 'bg-wc-green/10 text-wc-green'
                      : noneDone
                        ? 'bg-wc-red/10 text-wc-red'
                        : 'bg-[#252525] text-white/40'
                  }`}>
                    {done}/{total}
                  </span>
                </div>

                {hasPlayed ? (
                  /* Mini standings table */
                  <div className="space-y-[5px]">
                    {standings.map((t, i) => (
                      <div
                        key={t.team}
                        className={`flex items-center gap-1.5 text-[11px] ${
                          i < 2 ? 'text-wc-light-gray' : 'text-white/40'
                        }`}
                      >
                        <span className="w-3 text-center opacity-40 font-display leading-none">{i + 1}</span>
                        {t.logo ? (
                          <img src={t.logo} alt="" className="w-4 h-4 object-contain flex-shrink-0" />
                        ) : (
                          <span className="w-4 h-4 flex-shrink-0" />
                        )}
                        <span className="flex-1 truncate leading-none">{t.team}</span>
                        <span className={`w-7 text-right font-display leading-none text-[10px] ${
                          t.gd > 0 ? 'text-wc-green' : t.gd < 0 ? 'text-wc-red/70' : 'text-white/30'
                        }`}>
                          {t.gd > 0 ? `+${t.gd}` : t.gd}
                        </span>
                        <span className={`w-5 text-right font-display leading-none font-bold ${
                          i < 2 ? 'text-wc-light-gray' : 'text-white/40'
                        }`}>{t.pts}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Logo + name grid (no matches played yet) */
                  <div className="grid grid-cols-2 gap-x-2 gap-y-2">
                    {standings.map((t) => (
                      <div key={t.team} className="flex items-center gap-1.5 min-w-0">
                        {t.logo ? (
                          <img src={t.logo} alt="" className="w-4 h-4 object-contain flex-shrink-0" />
                        ) : (
                          <span className="w-4 h-4 rounded-full bg-[#2a2a2a] flex-shrink-0" />
                        )}
                        <span className="text-[11px] text-wc-light-gray truncate">{t.team}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}
