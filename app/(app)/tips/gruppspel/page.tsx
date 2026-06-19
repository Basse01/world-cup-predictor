import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Match, Prediction } from '@/lib/types'

function fmt(iso: string) {
  const d = new Date(iso)
  return (
    d.toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short' }) +
    ' ' +
    d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
  )
}

export default async function GruppspelPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
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
      <h1 className="font-display text-4xl text-wc-light-gray mb-6 uppercase tracking-wide">
        Gruppspel
      </h1>

      {/* Kommande matcher */}
      {upcoming.length > 0 && (
        <section className="mb-8">
          <h2 className="font-display text-xs text-wc-dark-gray uppercase tracking-widest mb-3">
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
                    <div className="text-xs text-wc-dark-gray mb-0.5">
                      {fmt(m.kickoff_at)} · Grupp {m.group_name}
                    </div>
                    <div className="text-sm text-wc-light-gray truncate">
                      {m.home_team}{' '}
                      <span className="text-wc-dark-gray mx-1">vs</span> {m.away_team}
                    </div>
                  </div>
                  <div className="ml-3 flex-shrink-0">
                    {pred?.pick ? (
                      <span className={`text-xs font-display px-2.5 py-1 rounded-lg ${pickColor}`}>
                        {pred.pick}
                      </span>
                    ) : (
                      <span className="text-xs text-wc-dark-gray">Tippa →</span>
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
            <h2 className="font-display text-xs text-wc-dark-gray uppercase tracking-widest">
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
                  <div className="text-xs text-wc-dark-gray mb-0.5">
                    {fmt(m.kickoff_at)} · Grupp {m.group_name}
                  </div>
                  <div className="text-sm text-wc-light-gray">
                    {m.home_team}{' '}
                    <span className="text-wc-dark-gray mx-1">vs</span> {m.away_team}
                  </div>
                </div>
                <span className="ml-3 text-xs text-wc-red flex-shrink-0">Tippa →</span>
              </Link>
            ))}
            {missing.length > 5 && (
              <p className="text-xs text-wc-dark-gray text-center pt-1">
                + {missing.length - 5} till i de olika grupperna
              </p>
            )}
          </div>
        </section>
      )}

      {/* All groups grid */}
      <section>
        <h2 className="font-display text-xs text-wc-dark-gray uppercase tracking-widest mb-3">
          Alla grupper
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {sortedGroups.map((group) => {
            const ms = grouped[group]
            const done = ms.filter((m) => predMap.has(m.id)).length
            const total = ms.length
            const teams = Array.from(new Set(ms.flatMap((m) => [m.home_team, m.away_team])))
            const allDone = done === total
            const noneDone = done === 0

            return (
              <Link
                key={group}
                href={`/tips/gruppspel/${group}`}
                className={`bg-[#1a1a1a] rounded-xl p-4 border transition-colors hover:border-wc-blue active:scale-[0.98] ${
                  allDone
                    ? 'border-wc-green/40'
                    : noneDone
                      ? 'border-wc-red/30'
                      : 'border-[#2a2a2a]'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-display text-wc-blue text-xl tracking-widest">
                    {group}
                  </span>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      allDone
                        ? 'bg-wc-green/10 text-wc-green'
                        : noneDone
                          ? 'bg-wc-red/10 text-wc-red'
                          : 'bg-[#2a2a2a] text-wc-dark-gray'
                    }`}
                  >
                    {done}/{total}
                  </span>
                </div>
                <ul className="space-y-1">
                  {teams.slice(0, 4).map((team) => (
                    <li key={team} className="text-xs text-wc-light-gray truncate leading-relaxed">
                      {team}
                    </li>
                  ))}
                </ul>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}
