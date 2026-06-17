import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MatchCard from '@/components/match-card'
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

  return (
    <div>
      <h1 className="font-display text-4xl text-wc-light-gray mb-6 uppercase tracking-wide">
        Gruppspel
      </h1>
      {Object.entries(grouped).sort().map(([group, ms]) => (
        <section key={group} className="mb-8">
          <h2 className="font-display text-xl text-wc-blue mb-3 uppercase tracking-widest">
            Grupp {group}
          </h2>
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
      ))}
      {Object.keys(grouped).length === 0 && (
        <p className="text-wc-dark-gray">Inga matcher laddade ännu.</p>
      )}
    </div>
  )
}
