'use client'
import { useState } from 'react'
import type { BonusType, BonusPrediction, BonusOption } from '@/lib/types'

export default function BonusForm({
  bonusType,
  existing,
  options,
}: {
  bonusType: BonusType
  existing?: BonusPrediction
  options?: BonusOption[]
}) {
  const hasOptions = options && options.length > 0
  const initialValue = existing?.value ?? ''
  const initialPoints = hasOptions
    ? (options.find(o => o.value === initialValue)?.points ?? null)
    : null

  const [value, setValue] = useState(initialValue)
  const [selectedPoints, setSelectedPoints] = useState<number | null>(initialPoints)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(!!existing?.value)

  const locked = bonusType.locked_at ? new Date(bonusType.locked_at) <= new Date() : false

  function handleSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value
    setValue(val)
    setSaved(false)
    if (hasOptions) {
      const opt = options.find(o => o.value === val)
      setSelectedPoints(opt?.points ?? null)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!value.trim() || locked) return
    setSaving(true)
    await fetch('/api/bonus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: bonusType.type,
        value,
        ...(selectedPoints != null ? { locked_points: selectedPoints } : {}),
      }),
    })
    setSaving(false)
    setSaved(true)
  }

  const pointsToShow = selectedPoints ?? bonusType.points

  return (
    <div className="bg-[#1a1a1a] rounded-xl p-5 border border-[#2a2a2a]">
      <div className="flex justify-between items-center mb-1">
        <h3 className="font-display text-lg text-wc-light-gray uppercase tracking-wide">
          {bonusType.label}
        </h3>
        <span className="text-xs font-display text-wc-green">
          +{pointsToShow}p
        </span>
      </div>

      {hasOptions && !locked && (
        <p className="text-xs text-wc-dark-gray mb-3">
          Poängen baseras på odds vid turneringsstart — ju större outsider, desto mer poäng.
        </p>
      )}

      {locked && bonusType.locked_at && (
        <p className="text-xs text-wc-red mb-3">
          Låst sedan {new Date(bonusType.locked_at).toLocaleDateString('sv-SE')}
        </p>
      )}

      <form onSubmit={handleSave} className="flex gap-2 mt-3">
        {hasOptions ? (
          <select
            value={value}
            onChange={handleSelect}
            disabled={locked}
            className="flex-1 bg-[#111] border border-wc-dark-gray rounded-lg px-4 py-2.5
                       text-base text-wc-light-gray focus:outline-none focus:border-wc-blue
                       disabled:opacity-40"
          >
            <option value="" disabled>Välj lag...</option>
            {options.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.display_label} (+{opt.points}p)
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={value}
            onChange={e => { setValue(e.target.value); setSaved(false) }}
            disabled={locked}
            placeholder="Namn..."
            className="flex-1 bg-[#111] border border-wc-dark-gray rounded-lg px-4 py-2.5
                       text-base text-wc-light-gray placeholder-wc-dark-gray focus:outline-none
                       focus:border-wc-blue disabled:opacity-40"
          />
        )}

        {!locked && (
          <button
            type="submit"
            disabled={saving || !value}
            className="bg-wc-green hover:bg-green-700 text-white font-display tracking-widest
                       px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50 text-sm uppercase"
          >
            {saving ? '...' : saved ? '✓' : 'Spara'}
          </button>
        )}
      </form>

      {existing?.points_awarded != null && existing.points_awarded > 0 && (
        <p className="text-xs text-wc-green mt-2 font-medium">
          +{existing.points_awarded}p intjänade!
        </p>
      )}
    </div>
  )
}
