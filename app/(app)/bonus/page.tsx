import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BonusForm from './bonus-form'
import type { BonusType, BonusPrediction, BonusOption } from '@/lib/types'

export default async function BonusPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: bonusTypes }, { data: myPredictions }, { data: bonusOptions }] = await Promise.all([
    supabase.from('bonus_types').select('*').order('type'),
    supabase.from('bonus_predictions').select('*').eq('user_id', user.id),
    supabase.from('bonus_options').select('*').order('sort_order'),
  ])

  const predMap = new Map((myPredictions ?? []).map(p => [p.type, p]))

  const optionsByType = new Map<string, BonusOption[]>()
  for (const opt of (bonusOptions ?? []) as BonusOption[]) {
    if (!optionsByType.has(opt.type)) optionsByType.set(opt.type, [])
    optionsByType.get(opt.type)!.push(opt)
  }

  return (
    <div>
      <h1 className="font-display text-4xl text-wc-light-gray mb-2 uppercase tracking-wide">
        Bonusprediktion
      </h1>
      <p className="text-wc-dark-gray text-sm mb-6">
        Extra poäng för rätt svar på dessa frågor.
      </p>
      <div className="space-y-4">
        {(bonusTypes ?? []).map((bt: BonusType) => (
          <BonusForm
            key={bt.type}
            bonusType={bt}
            existing={predMap.get(bt.type) as BonusPrediction | undefined}
            options={optionsByType.get(bt.type)}
          />
        ))}
        {(bonusTypes ?? []).length === 0 && (
          <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#2a2a2a] text-center">
            <p className="text-wc-dark-gray text-sm">Bonusfrågor läggs till av admin inom kort.</p>
          </div>
        )}
      </div>
    </div>
  )
}
