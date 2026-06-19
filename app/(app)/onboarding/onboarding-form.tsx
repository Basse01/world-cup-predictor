'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const BONUS_TYPES = [
  {
    type: 'world_cup_winner',
    label: 'VM-vinnare',
    points: 15,
    placeholder: 'Vilket lag vinner VM 2026?',
    inputMode: 'text' as const,
    hint: null,
  },
  {
    type: 'golden_ball',
    label: 'Golden Ball',
    points: 10,
    placeholder: 'Turneringens bästa spelare...',
    inputMode: 'text' as const,
    hint: null,
  },
  {
    type: 'top_scorer',
    label: 'Skyttekung (Golden Boot)',
    points: 10,
    placeholder: 'Turneringens bästa målskytt...',
    inputMode: 'text' as const,
    hint: null,
  },
  {
    type: 'total_goals',
    label: 'Antal mål i VM',
    points: 10,
    placeholder: 'Ditt tips...',
    inputMode: 'numeric' as const,
    hint: 'VM 2022 hade 172 mål på 64 matcher. VM 2026 spelas på 104 matcher — vad tror du?',
  },
] as const

interface Props {
  existing: Record<string, string>
}

export default function OnboardingForm({ existing }: Props) {
  const router = useRouter()
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(BONUS_TYPES.map(b => [b.type, existing[b.type] ?? '']))
  )
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    setSaving(true)
    const filled = BONUS_TYPES.filter(b => values[b.type].trim())
    await Promise.all(
      filled.map(b =>
        fetch('/api/bonus', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: b.type, value: values[b.type].trim() }),
        })
      )
    )
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {BONUS_TYPES.map((bt, i) => (
        <div
          key={bt.type}
          className="bg-[#1a1a1a] rounded-xl p-5 border border-[#2a2a2a]"
          style={{ animation: `fade-up 0.4s ease-out ${0.1 + i * 0.08}s both` }}
        >
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-display text-lg text-wc-light-gray uppercase tracking-wide">
              {bt.label}
            </h3>
            <span className="text-xs font-display text-wc-green">+{bt.points}p</span>
          </div>

          {bt.hint && (
            <div className="bg-[#111] border border-[#2a2a2a] rounded-lg px-4 py-3 mb-3">
              <p className="text-xs text-wc-dark-gray leading-relaxed">{bt.hint}</p>
            </div>
          )}

          <input
            type={bt.inputMode === 'numeric' ? 'number' : 'text'}
            inputMode={bt.inputMode}
            min={bt.inputMode === 'numeric' ? 0 : undefined}
            max={bt.inputMode === 'numeric' ? 700 : undefined}
            value={values[bt.type]}
            onChange={e => setValues(v => ({ ...v, [bt.type]: e.target.value }))}
            placeholder={bt.placeholder}
            className="w-full bg-[#111] border border-wc-dark-gray rounded-lg px-4 py-3
                       text-base text-wc-light-gray placeholder-wc-dark-gray focus:outline-none
                       focus:border-wc-blue"
          />
        </div>
      ))}

      <div
        className="flex flex-col gap-3 pt-2"
        style={{ animation: 'fade-up 0.4s ease-out 0.45s both' }}
      >
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="relative w-full overflow-hidden rounded-xl py-4 text-white font-display
                     tracking-[0.18em] text-base uppercase
                     transition-all duration-150
                     hover:scale-[1.02] hover:shadow-[0_8px_32px_rgba(230,29,37,0.45)]
                     active:scale-[0.98]
                     disabled:opacity-50 disabled:cursor-not-allowed
                     disabled:hover:scale-100 disabled:hover:shadow-none
                     group"
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
              'Spara och börja tippa'
            )}
          </span>
        </button>

        <button
          onClick={() => router.push('/dashboard')}
          className="text-center text-wc-dark-gray text-sm hover:text-wc-light-gray
                     transition-colors duration-150 py-2 min-h-[44px]"
        >
          Hoppa över för nu
        </button>
      </div>
    </div>
  )
}
