import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OnboardingForm from './onboarding-form'

const ONBOARDING_TYPES = ['world_cup_winner', 'golden_ball', 'top_scorer', 'total_goals']

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: predictions }, { data: winnerOptions }] = await Promise.all([
    supabase
      .from('bonus_predictions')
      .select('type, value')
      .eq('user_id', user.id)
      .in('type', ONBOARDING_TYPES),
    supabase
      .from('bonus_options')
      .select('type, value, display_label, points, sort_order')
      .eq('type', 'world_cup_winner')
      .order('sort_order'),
  ])

  const existing = Object.fromEntries((predictions ?? []).map(p => [p.type, p.value]))

  return (
    <div>
      <div className="mb-8 text-center" style={{ animation: 'fade-up 0.4s ease-out 0s both' }}>
        <div className="text-5xl mb-4">🏆</div>
        <h1 className="font-display text-3xl sm:text-4xl text-wc-light-gray uppercase tracking-wide mb-2">
          Innan vi kommer igång
        </h1>
        <p className="text-wc-dark-gray text-sm leading-relaxed">
          Lås in dina bonusgissningar för chans till extra poäng
        </p>
      </div>

      <OnboardingForm existing={existing} winnerOptions={winnerOptions ?? []} />
    </div>
  )
}
