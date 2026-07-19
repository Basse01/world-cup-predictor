'use client'
import { useState } from 'react'
import { BONUS_INFO } from '@/lib/bonus-info'

export function InfoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 7.2v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="4.6" r="0.9" fill="currentColor" />
    </svg>
  )
}

// Label + locked value + expandable explanation, used in the read-only
// bonus list on other users' profiles.
export default function BonusInfo({
  type,
  label,
  value,
}: {
  type: string
  label: string
  value: string | null
}) {
  const [open, setOpen] = useState(false)
  const text = BONUS_INFO[type]

  return (
    <div>
      <div className="text-xs text-white/50 mb-0.5 flex items-center gap-1">
        <span>{label}</span>
        {text && (
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            aria-expanded={open}
            aria-label={`Vad gäller för ${label}?`}
            className={`p-3 -m-3 transition-colors ${open ? 'text-wc-blue' : 'text-white/40 hover:text-white/70 active:text-white/70'}`}
          >
            <InfoIcon />
          </button>
        )}
      </div>
      <div className="text-wc-light-gray font-medium">{value || '—'}</div>
      {open && text && (
        <p className="mt-1.5 text-xs text-white/45 leading-relaxed max-w-[42ch]">{text}</p>
      )}
    </div>
  )
}
