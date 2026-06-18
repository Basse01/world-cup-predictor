import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import KnockoutCard from '@/components/knockout-card'
import StageTabs from '@/components/stage-tabs'
import type { Match, Prediction } from '@/lib/types'

const KNOCKOUT_STAGES = ['round_of_16', 'quarter_final', 'semi_final', 'final']
const STAGE_LABELS: Record<string, string> = {
  round_of_16: 'Åttondelsfinaler',
  quarter_final: 'Kvartsfinaler',
  semi_final: 'Semifinaler',
  final: 'Final',
}

export default async function SlutspelPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .in('stage', KNOCKOUT_STAGES)
    .order('kickoff_at')

  const { data: predictions } = await supabase
    .from('predictions')
    .select('*')
    .eq('user_id', user!.id)

  const predMap = new Map(predictions?.map(p => [p.match_id, p]) ?? [])

  const grouped = (matches ?? []).reduce<Record<string, Match[]>>((acc, m) => {
    const key = m.stage
    if (!acc[key]) acc[key] = []
    acc[key].push(m)
    return acc
  }, {})

  const availableStages = KNOCKOUT_STAGES.filter(s => grouped[s]?.length)

  return (
    <div>
      <h1 className="font-display text-4xl text-wc-light-gray mb-4 uppercase tracking-wide">
        Slutspel
      </h1>

      <StageTabs stages={availableStages} />

      {availableStages.map(stage => {
        const ms = grouped[stage]
        const done = ms.filter(m => predMap.has(m.id)).length
        return (
          <section
            key={stage}
            id={`stage-${stage}`}
            className="mb-10 scroll-mt-32"
          >
            <div className="flex items-baseline gap-3 mb-3">
              <h2 className="font-display text-xl text-wc-red uppercase tracking-widest">
                {STAGE_LABELS[stage]}
              </h2>
              <span className="text-xs text-wc-dark-gray">{done}/{ms.length} tips</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {ms.map(match => (
                <KnockoutCard
                  key={match.id}
                  match={match as Match}
                  prediction={predMap.get(match.id) as Prediction | undefined}
                />
              ))}
            </div>
          </section>
        )
      })}

      {availableStages.length === 0 && (
        <p className="text-wc-dark-gray">Slutspelet är inte satt ännu.</p>
      )}
    </div>
  )
}
