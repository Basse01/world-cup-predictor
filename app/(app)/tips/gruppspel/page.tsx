import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MatchCard from '@/components/match-card'
import GroupTabs from '@/components/group-tabs'
import type { Match, Prediction } from '@/lib/types'

export default async function GruppspelPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .eq('stage', 'group')
    .order('kickoff_at')

  const { data: predictions } = await supabase
    .from('predictions')
    .select('*')
    .eq('user_id', user!.id)

  const predMap = new Map(predictions?.map(p => [p.match_id, p]) ?? [])

  const grouped = (matches ?? []).reduce<Record<string, Match[]>>((acc, m) => {
    const key = m.group_name ?? 'Övriga'
    if (!acc[key]) acc[key] = []
    acc[key].push(m)
    return acc
  }, {})

  const sortedGroups = Object.keys(grouped).sort()

  return (
    <div>
      <h1 className="font-display text-4xl text-wc-light-gray mb-4 uppercase tracking-wide">
        Gruppspel
      </h1>

      <GroupTabs groups={sortedGroups} />

      {sortedGroups.map(group => {
        const ms = grouped[group]
        const done = ms.filter(m => predMap.has(m.id)).length
        return (
          <section
            key={group}
            id={`group-${group}`}
            className="mb-10 scroll-mt-32"
          >
            <div className="flex items-baseline gap-3 mb-3">
              <h2 className="font-display text-xl text-wc-blue uppercase tracking-widest">
                Grupp {group}
              </h2>
              <span className="text-xs text-wc-dark-gray">{done}/{ms.length} tips</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {ms.map(match => (
                <MatchCard
                  key={match.id}
                  match={match as Match}
                  prediction={predMap.get(match.id) as Prediction | undefined}
                />
              ))}
            </div>
          </section>
        )
      })}

      {sortedGroups.length === 0 && (
        <p className="text-wc-dark-gray">Matcher synkroniseras snart, kom tillbaka.</p>
      )}
    </div>
  )
}
