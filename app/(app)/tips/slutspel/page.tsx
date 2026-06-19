import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TournamentBracket from '@/components/tournament-bracket'
import KnockoutCard from '@/components/knockout-card'
import type { Match, Prediction } from '@/lib/types'

const KNOCKOUT_STAGES = [
  'round_of_32',
  'round_of_16',
  'quarter_final',
  'semi_final',
  'third_place',
  'final',
]

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

  const predMap = new Map((predictions ?? []).map(p => [p.match_id, p]))

  const allMatches = (matches ?? []) as Match[]
  const allPreds   = predMap as Map<string, Prediction>

  const bracketMatches = allMatches.filter(m => m.stage !== 'third_place')
  const thirdPlace     = allMatches.filter(m => m.stage === 'third_place')

  const totalKnockout  = allMatches.length
  const tippedKnockout = allMatches.filter(m => predMap.has(m.id)).length

  return (
    <div>
      <div className="flex items-baseline gap-3 mb-1">
        <h1 className="font-display text-4xl text-wc-light-gray uppercase tracking-wide">
          Slutspel
        </h1>
        {totalKnockout > 0 && (
          <span className="text-xs text-wc-dark-gray">
            {tippedKnockout}/{totalKnockout} tips
          </span>
        )}
      </div>
      <p className="text-sm text-wc-dark-gray mb-6">
        {totalKnockout === 0
          ? 'Bracketen fylls i när slutspelet börjar'
          : 'Klicka på en match för att lägga ditt tips'}
      </p>

      <TournamentBracket matches={bracketMatches} predMap={allPreds} />

      {thirdPlace.length > 0 && (
        <div className="mt-8">
          <h2 className="font-display text-lg text-wc-red uppercase tracking-widest mb-3">
            Bronsmatch
          </h2>
          <div className="max-w-sm">
            {thirdPlace.map(m => (
              <KnockoutCard
                key={m.id}
                match={m}
                prediction={allPreds.get(m.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
