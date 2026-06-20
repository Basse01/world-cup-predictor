'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import SearchSelect from '@/components/search-select'
import { WC_PLAYERS } from '@/lib/onboarding-data'
import type { BonusType, BonusOption } from '@/lib/types'

type FieldType = 'select' | 'players' | 'number' | 'text'

function inferFieldType(type: string, hasOptions: boolean): FieldType {
  if (hasOptions) return 'select'
  if (/scorer|ball|player/i.test(type)) return 'players'
  if (/goal|count/i.test(type)) return 'number'
  return 'text'
}

const HINTS: Record<string, string> = {
  total_goals: 'VM 2022 hade 172 mål på 64 matcher. VM 2026 spelas på 104 matcher — vad tror du?',
  top_scorer: 'Skyttekungen (Golden Boot) är den spelare som gör flest mål under hela VM-turneringen. Gissar du rätt spelare vinner du poäng.',
  golden_ball: 'Golden Ball delas ut till hela turneringens bästa spelare — det är ett prestationspris och behöver inte gå till skyttekungen.',
}

export interface BonusTypeWithOptions extends BonusType {
  options: BonusOption[]
}

interface Props {
  existing: Record<string, string>
  bonusTypes: BonusTypeWithOptions[]
}

export default function OnboardingForm({ existing, bonusTypes }: Props) {
  const router = useRouter()

  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(bonusTypes.map(b => [b.type, existing[b.type] ?? '']))
  )
  const [selectedPoints, setSelectedPoints] = useState<Record<string, number | null>>(
    Object.fromEntries(bonusTypes.map(b => {
      if (b.options.length === 0) return [b.type, null]
      const match = b.options.find(o => o.value === (existing[b.type] ?? ''))
      return [b.type, match?.points ?? null]
    }))
  )
  const [saving, setSaving] = useState(false)

  const allFilled = bonusTypes.every(b => (values[b.type] ?? '').trim() !== '')

  function set(type: string, val: string) {
    setValues(v => ({ ...v, [type]: val }))
  }

  function selectOption(type: string, options: BonusOption[], val: string) {
    set(type, val)
    const opt = options.find(o => o.value === val)
    setSelectedPoints(p => ({ ...p, [type]: opt?.points ?? null }))
  }

  async function handleSubmit() {
    if (!allFilled || saving) return
    setSaving(true)
    await Promise.all(
      bonusTypes.map(b => {
        const body: Record<string, unknown> = { type: b.type, value: values[b.type].trim() }
        const pts = selectedPoints[b.type]
        if (pts != null) body.locked_points = pts
        return fetch('/api/bonus', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      })
    )
    await fetch('/api/complete-onboarding', { method: 'POST' })
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div
        className="bg-[#1a1a0a] border border-wc-red/30 rounded-xl px-4 py-3"
        style={{ animation: 'fade-up 0.4s ease-out 0.05s both' }}
      >
        <p className="text-wc-red text-xs font-display tracking-wide uppercase text-center">
          Dessa val gör du en gång och går inte att ändra på!
        </p>
      </div>

      {bonusTypes.map((bt, i) => {
        const fieldType = inferFieldType(bt.type, bt.options.length > 0)
        const hint = HINTS[bt.type] ?? null
        const pointsToShow = fieldType === 'select' ? selectedPoints[bt.type] : bt.points

        return (
          <div
            key={bt.type}
            className="bg-[#1a1a1a] rounded-xl p-5 border border-[#2a2a2a]"
            style={{ animation: `fade-up 0.4s ease-out ${0.15 + i * 0.08}s both` }}
          >
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-display text-lg text-wc-light-gray uppercase tracking-wide">
                {bt.label}
              </h3>
              {pointsToShow != null && (
                <span className="text-xs font-display text-wc-green">+{pointsToShow}p</span>
              )}
            </div>

            {fieldType === 'select' && (
              <p className="text-xs text-[#888] mb-3">
                Poängen baseras på odds — ju större outsider, desto mer poäng.
              </p>
            )}

            {hint && (
              <div className="bg-[#111] border border-[#2a2a2a] rounded-lg px-4 py-3 mb-3">
                <p className="text-xs text-[#999] leading-relaxed">{hint}</p>
              </div>
            )}

            {fieldType === 'select' && (
              <select
                value={values[bt.type]}
                onChange={e => selectOption(bt.type, bt.options, e.target.value)}
                className="w-full bg-[#111] border border-wc-dark-gray rounded-lg px-4 py-3
                           text-base text-wc-light-gray focus:outline-none focus:border-wc-blue"
              >
                <option value="" disabled>Välj...</option>
                {bt.options.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.display_label} (+{opt.points}p)
                  </option>
                ))}
              </select>
            )}

            {fieldType === 'players' && (
              <SearchSelect
                options={WC_PLAYERS}
                value={values[bt.type]}
                onChange={val => set(bt.type, val)}
                placeholder="Sök eller välj spelare..."
              />
            )}

            {fieldType === 'number' && (
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={700}
                value={values[bt.type]}
                onChange={e => set(bt.type, e.target.value)}
                placeholder="Ditt tips..."
                className="w-full bg-[#111] border border-wc-dark-gray rounded-lg px-4 py-3
                           text-base text-wc-light-gray placeholder-wc-dark-gray
                           focus:outline-none focus:border-wc-blue"
              />
            )}

            {fieldType === 'text' && (
              <input
                type="text"
                value={values[bt.type]}
                onChange={e => set(bt.type, e.target.value)}
                placeholder="Ditt tips..."
                className="w-full bg-[#111] border border-wc-dark-gray rounded-lg px-4 py-3
                           text-base text-wc-light-gray placeholder-wc-dark-gray
                           focus:outline-none focus:border-wc-blue"
              />
            )}
          </div>
        )
      })}

      <div style={{ animation: 'fade-up 0.4s ease-out 0.55s both' }} className="pt-2">
        <button
          onClick={handleSubmit}
          disabled={!allFilled || saving}
          className="relative w-full overflow-hidden rounded-xl py-4 text-white font-display
                     tracking-[0.18em] text-base uppercase transition-all duration-150
                     hover:scale-[1.02] hover:shadow-[0_8px_32px_rgba(230,29,37,0.45)]
                     active:scale-[0.98]
                     disabled:opacity-40 disabled:cursor-not-allowed
                     disabled:hover:scale-100 disabled:hover:shadow-none group"
          style={{ background: 'linear-gradient(135deg, #E61D25 0%, #c4151c 100%)' }}
        >
          <span
            className="-left-full absolute inset-y-0 w-[60%]
                       bg-gradient-to-r from-transparent via-white/20 to-transparent
                       -skew-x-12 group-hover:translate-x-[350%]
                       transition-transform duration-500 ease-out pointer-events-none"
          />
          <span className="relative flex items-center justify-center gap-2">
            {saving ? (
              <>
                <span className="inline-block h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Sparar...
              </>
            ) : (
              'Lås in mina val'
            )}
          </span>
        </button>
      </div>
    </div>
  )
}
