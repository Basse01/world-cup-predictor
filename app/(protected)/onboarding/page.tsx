import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OnboardingForm from './onboarding-form'
import type { BonusOption } from '@/lib/types'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date().toISOString()

  const [{ data: predictions }, { data: bonusTypes }, { data: bonusOptions }] = await Promise.all([
    supabase.from('bonus_predictions').select('type, value').eq('user_id', user.id),
    supabase.from('bonus_types').select('*').order('type'),
    supabase.from('bonus_options').select('*').order('sort_order'),
  ])

  const existing = Object.fromEntries((predictions ?? []).map(p => [p.type, p.value]))

  const optionsByType = new Map<string, BonusOption[]>()
  for (const opt of (bonusOptions ?? []) as BonusOption[]) {
    if (!optionsByType.has(opt.type)) optionsByType.set(opt.type, [])
    optionsByType.get(opt.type)!.push(opt)
  }

  const typesWithOptions = (bonusTypes ?? []).map(bt => ({
    ...bt,
    options: optionsByType.get(bt.type) ?? [],
  }))

  return (
    <div>
      <div className="mb-8 text-center" style={{ animation: 'fade-up 0.4s ease-out 0s both' }}>
        <div className="text-5xl mb-4">🏆</div>
        <h1 className="font-display text-3xl sm:text-4xl text-wc-light-gray uppercase tracking-wide mb-2">
          Innan vi kommer igång
        </h1>
        <p className="text-[#888] text-sm leading-relaxed">
          Lås in dina bonusgissningar för chans till extra poäng
        </p>
      </div>

      <OnboardingForm existing={existing} bonusTypes={typesWithOptions} />
    </div>
  )
}
