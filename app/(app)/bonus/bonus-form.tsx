'use client'
import { useState } from 'react'
import type { BonusType, BonusPrediction } from '@/lib/types'

export default function BonusForm({
  bonusType,
  existing,
}: {
  bonusType: BonusType
  existing?: BonusPrediction
}) {
  const [value, setValue] = useState(existing?.value ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const locked = bonusType.locked_at ? new Date(bonusType.locked_at) <= new Date() : false

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!value.trim() || locked) return
    setSaving(true)
    await fetch('/api/bonus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: bonusType.type, value }),
    })
    setSaving(false)
    setSaved(true)
  }

  return (
    <div className="bg-[#1a1a1a] rounded-xl p-5 border border-[#2a2a2a]">
      <div className="flex justify-between items-center mb-1">
        <h3 className="font-display text-lg text-wc-light-gray uppercase tracking-wide">
          {bonusType.label}
        </h3>
        <span className="text-xs font-display text-wc-green">+{bonusType.points}p</span>
      </div>
      {locked && bonusType.locked_at && (
        <p className="text-xs text-wc-red mb-3">
          Låst sedan {new Date(bonusType.locked_at).toLocaleDateString('sv-SE')}
        </p>
      )}
      <form onSubmit={handleSave} className="flex gap-2 mt-3">
        <input
          type="text"
          value={value}
          onChange={e => { setValue(e.target.value); setSaved(false) }}
          disabled={locked}
          placeholder="Namn..."
          className="flex-1 bg-[#111] border border-wc-dark-gray rounded-lg px-4 py-2.5
                     text-wc-light-gray placeholder-wc-dark-gray focus:outline-none
                     focus:border-wc-blue disabled:opacity-40"
        />
        {!locked && (
          <button
            type="submit"
            disabled={saving}
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
