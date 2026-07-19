'use client'
import { useState } from 'react'
import type { BonusType, BonusPrediction, BonusOption } from '@/lib/types'
import { BONUS_INFO } from '@/lib/bonus-info'
import { InfoIcon } from '@/components/bonus-info'

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
  const [showInfo, setShowInfo] = useState(false)

  const infoText = BONUS_INFO[bonusType.type]
  const infoButton = infoText ? (
    <button
      type="button"
      onClick={() => setShowInfo(o => !o)}
      aria-expanded={showInfo}
      aria-label={`Vad gäller för ${bonusType.label}?`}
      className={`p-3 -m-3 ml-0 transition-colors ${showInfo ? 'text-wc-blue' : 'text-white/40 hover:text-white/70 active:text-white/70'}`}
    >
      <InfoIcon />
    </button>
  ) : null
  const infoPanel = showInfo && infoText ? (
    <p className="text-xs text-white/45 leading-relaxed mb-3">{infoText}</p>
  ) : null

  const isLocked = bonusType.locked_at ? new Date(bonusType.locked_at) <= new Date() : false
  const isReadOnly = isLocked || !!existing?.value
  const isNumber = /goal|count/i.test(bonusType.type)

  const earnedPoints = existing?.points_awarded ?? 0
  const expectedPoints = selectedPoints ?? existing?.locked_points ?? bonusType.points

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!value.trim() || isReadOnly || saving) return
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
  }

  // — Read-only state (already submitted or type is locked) —
  if (isReadOnly) {
    return (
      <div className="bg-[#111] rounded-xl p-4 border border-[#252525]">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-base text-wc-light-gray uppercase tracking-wide">
              {bonusType.label}
            </h3>
            {infoButton}
          </div>
          {earnedPoints > 0 ? (
            <span className="text-xs font-display text-wc-green">+{earnedPoints}p ✓</span>
          ) : expectedPoints ? (
            <span className="text-xs font-display text-[#888]">+{expectedPoints}p</span>
          ) : null}
        </div>
        {infoPanel}
        <div className="bg-[#1a1a1a] rounded-lg px-4 py-3 flex items-center justify-between gap-2">
          <span className={`text-base ${value ? 'text-wc-light-gray' : 'text-[#555] italic'}`}>
            {value || 'Ej valt'}
          </span>
          <span className="text-[#444] text-sm flex-shrink-0">🔒</span>
        </div>
      </div>
    )
  }

  // — Editable form (no existing value yet, type not locked) —
  return (
    <div className="bg-[#111] rounded-xl p-4 border border-[#252525]">
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-base text-wc-light-gray uppercase tracking-wide">
            {bonusType.label}
          </h3>
          {infoButton}
        </div>
        <span className="text-xs font-display text-[#888]">
          +{selectedPoints ?? bonusType.points}p
        </span>
      </div>

      {infoPanel}

      {hasOptions && (
        <p className="text-xs text-[#888] mb-3">
          Ju större outsider, desto mer poäng.
        </p>
      )}

      <form onSubmit={handleSave} className="flex gap-2 mt-2">
        {hasOptions ? (
          <select
            value={value}
            onChange={e => {
              const val = e.target.value
              setValue(val)
              const opt = options.find(o => o.value === val)
              setSelectedPoints(opt?.points ?? null)
            }}
            className="flex-1 bg-[#0d0d0d] border border-[#3a3a3a] rounded-lg px-3 py-2.5
                       text-base text-wc-light-gray focus:outline-none focus:border-wc-blue"
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
            type={isNumber ? 'number' : 'text'}
            inputMode={isNumber ? 'numeric' : 'text'}
            min={isNumber ? 0 : undefined}
            max={isNumber ? 700 : undefined}
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={isNumber ? 'Antal mål...' : 'Namn...'}
            className="flex-1 bg-[#0d0d0d] border border-[#3a3a3a] rounded-lg px-3 py-2.5
                       text-base text-wc-light-gray placeholder-[#555] focus:outline-none
                       focus:border-wc-blue"
          />
        )}

        <button
          type="submit"
          disabled={saving || !value.trim()}
          className="bg-wc-green hover:bg-green-700 text-white font-display tracking-widest
                     px-4 py-2 rounded-lg transition-colors disabled:opacity-50 text-sm uppercase
                     min-w-[72px]"
        >
          {saving ? '...' : 'Spara'}
        </button>
      </form>
    </div>
  )
}
