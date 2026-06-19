import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MatchCard from '@/components/match-card'
import type { Match, Prediction } from '@/lib/types'

export default async function GroupPage({
  params,
}: {
  params: Promise<{ group: string }>
}) {
  const { group: rawGroup } = await params
  const group = rawGroup.toUpperCase()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .eq('stage', 'group')
    .eq('group_name', group)
    .order('kickoff_at')

  if (!matches || matches.length === 0) notFound()

  const { data: predictions } = await supabase
    .from('predictions')
    .select('*')
    .eq('user_id', user.id)
    .in(
      'match_id',
      matches.map((m) => m.id),
    )

  const predMap = new Map((predictions ?? []).map((p: Prediction) => [p.match_id, p]))
  const done = matches.filter((m) => predMap.has(m.id)).length

  const teams = Array.from(new Set(matches.flatMap((m) => [m.home_team, m.away_team])))

  return (
    <div>
      <Link
        href="/tips/gruppspel"
        className="inline-flex items-center gap-1 text-sm text-wc-dark-gray hover:text-wc-light-gray mb-5 transition-colors"
      >
        ← Alla grupper
      </Link>

      <div className="mb-6">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-4xl text-wc-light-gray uppercase tracking-wide">
            Grupp {group}
          </h1>
          <span className="text-sm text-wc-dark-gray">
            {done}/{matches.length} tips
          </span>
        </div>
        <div className="flex flex-wrap gap-x-3 mt-2">
          {teams.map((t) => (
            <span key={t} className="text-xs text-wc-dark-gray">
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {matches.map((match) => (
          <MatchCard
            key={match.id}
            match={match as Match}
            prediction={predMap.get(match.id) as Prediction | undefined}
          />
        ))}
      </div>
    </div>
  )
}
