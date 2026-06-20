import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MatchCard from '@/components/match-card'
import type { Match, Prediction } from '@/lib/types'

export default async function AllaOtippadeMatcherPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: matches }, { data: predictions }] = await Promise.all([
    supabase.from('matches').select('*').eq('stage', 'group').order('kickoff_at'),
    supabase.from('predictions').select('*').eq('user_id', user.id),
  ])

  const predMap = new Map((predictions ?? []).map((p: Prediction) => [p.match_id, p]))
  const now = new Date()

  const untipped = (matches ?? []).filter(
    (m: Match) => m.status === 'scheduled' && new Date(m.lock_at) > now && !predMap.has(m.id),
  ) as Match[]

  return (
    <div>
      <Link
        href="/tips/gruppspel"
        className="inline-flex items-center gap-1 text-sm text-white/50 hover:text-wc-light-gray mb-5 transition-colors"
      >
        ← Tillbaka
      </Link>

      <div className="flex items-baseline gap-3 mb-6">
        <h1 className="font-display text-4xl text-wc-light-gray uppercase tracking-wide">
          Otippade matcher
        </h1>
        {untipped.length > 0 && (
          <span className="text-sm text-white/50">{untipped.length} kvar</span>
        )}
      </div>

      {untipped.length === 0 ? (
        <div className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] p-8 text-center">
          <div className="text-3xl mb-3">✓</div>
          <p className="text-wc-light-gray font-display text-lg uppercase tracking-wide mb-1">
            Alla matcher tippade!
          </p>
          <p className="text-white/50 text-sm">
            Du har inte missat någon öppen match.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {untipped.map((match) => (
            <div key={match.id} id={match.id} className="scroll-mt-4">
              <MatchCard
                match={match}
                prediction={predMap.get(match.id) as Prediction | undefined}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
