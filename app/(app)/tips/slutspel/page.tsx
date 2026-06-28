import { redirect } from 'next/navigation'
import { createClient, getUser } from '@/lib/supabase/server'
import type { Match, Prediction } from '@/lib/types'
import { KNOCKOUT_STAGES } from '@/lib/knockout'
import { SAMPLE_KNOCKOUT, SAMPLE_PREDICTIONS } from '@/lib/knockout-sample'
import SlutspelView from '@/components/slutspel-view'

export default async function SlutspelPage({
  searchParams,
}: {
  searchParams: Promise<{ match?: string }>
}) {
  const [{ match: openMatch }, [supabase, user]] = await Promise.all([
    searchParams,
    Promise.all([createClient(), getUser()]),
  ])
  if (!user) redirect('/login')

  const [{ data: matchData }, { data: predData }] = await Promise.all([
    supabase.from('matches').select('*').in('stage', KNOCKOUT_STAGES).order('kickoff_at'),
    supabase.from('predictions').select('*').eq('user_id', user.id),
  ])

  const matches = (matchData ?? []) as Match[]
  const allPredictions = (predData ?? []) as Prediction[]
  const isDev = process.env.NODE_ENV !== 'production'

  // The bracket frame is "live" once the Round of 32 is meaningfully populated.
  const populated = matches.filter(m => m.stage === 'round_of_32').length >= 8

  // Show real fixtures when the bracket is populated, or always in production
  // (so the frame fills in live as fixtures sync, even when still sparse).
  if (matches.length > 0 && (populated || !isDev)) {
    const matchIds = new Set(matches.map(m => m.id))
    const predictions = allPredictions.filter(p => matchIds.has(p.match_id))
    return <SlutspelView matches={matches} predictions={predictions} openMatchId={openMatch} />
  }

  // In development with no/sparse real fixtures, render the sample bracket so the
  // full UI is reviewable now. Disappears automatically once the bracket fills.
  if (isDev) {
    return <SlutspelView matches={SAMPLE_KNOCKOUT} predictions={SAMPLE_PREDICTIONS} preview />
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-4">
      <h1 className="font-display text-4xl text-wc-light-gray uppercase tracking-wide">Slutspel</h1>
      <div className="inline-flex items-center gap-2 bg-wc-blue/10 border border-wc-blue/30 text-wc-blue text-sm font-medium px-5 py-2.5 rounded-full">
        <span className="inline-block w-2 h-2 rounded-full bg-wc-blue animate-pulse" />
        Kommer snart
      </div>
      <p className="text-sm text-white/50 max-w-xs">
        Slutspelets bracket öppnar när gruppspelet är klart.
      </p>
    </div>
  )
}
