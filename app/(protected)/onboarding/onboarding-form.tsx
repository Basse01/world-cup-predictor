'use client'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
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

function OptionDropdown({
  options,
  value,
  onSelect,
  label,
}: {
  options: BonusOption[]
  value: string
  onSelect: (val: string, pts: number | null) => void
  label: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const selected = options.find(o => o.value === value)

  const filtered = query.trim().length === 0
    ? options
    : options.filter(o => o.display_label.toLowerCase().includes(query.toLowerCase()))

  function handleOpen() { setOpen(true); setQuery('') }
  function handleClose() { setOpen(false); setQuery('') }

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => searchRef.current?.focus(), 100)
      return () => clearTimeout(t)
    }
  }, [open])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [open])

  const overlay = open ? createPortal(
    <div className="fixed inset-0 z-[9999] bg-[#0d0d0d] flex flex-col">
      {/* Header — always stays above keyboard */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-[#2a2a2a] flex-shrink-0"
           style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
        <button type="button" onPointerDown={handleClose}
          className="flex items-center justify-center w-10 h-10 -ml-1 text-white/60 hover:text-white">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span className="font-display text-base text-wc-light-gray uppercase tracking-wide flex-1">{label}</span>
      </div>

      {/* Search — stays visible, keyboard only pushes the list */}
      {options.length > 4 && (
        <div className="px-4 py-3 flex-shrink-0">
          <div className="relative">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Sök lag..."
              autoComplete="off"
              className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl pl-10 pr-4 py-3.5
                         text-base text-wc-light-gray placeholder-white/30
                         focus:outline-none focus:border-wc-blue"
            />
            {query.length > 0 && (
              <button type="button" onPointerDown={() => setQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* List — shrinks when keyboard opens */}
      <ul className="flex-1 overflow-y-auto overscroll-contain divide-y divide-white/5"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {filtered.length === 0 ? (
          <li className="px-4 py-8 text-center text-white/40 text-sm">Inga träffar</li>
        ) : (
          filtered.map(opt => (
            <li key={opt.value}>
              <button
                type="button"
                onPointerDown={e => { e.preventDefault(); onSelect(opt.value, opt.points); handleClose() }}
                className={`w-full text-left px-4 py-4 flex items-center justify-between gap-3 text-base transition-colors active:bg-white/10
                  ${opt.value === value ? 'text-wc-blue font-medium bg-wc-blue/10' : 'text-wc-light-gray'}`}
              >
                <span>{opt.display_label}</span>
                <span className="text-wc-green text-sm font-display flex-shrink-0">+{opt.points}p</span>
              </button>
            </li>
          ))
        )}
      </ul>
    </div>,
    document.body
  ) : null

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="w-full bg-[#111] border border-[#3a3a3a] rounded-xl px-4 py-3.5
                   flex items-center justify-between gap-2 text-base min-h-[52px]
                   focus:outline-none focus:border-wc-blue transition-colors hover:border-[#4a4a4a]
                   active:border-wc-blue"
      >
        <span className={selected ? 'text-wc-light-gray flex-1 text-left' : 'text-white/30 flex-1 text-left'}>
          {selected ? selected.display_label : 'Välj...'}
        </span>
        <div className="flex items-center gap-2 flex-shrink-0">
          {selected && <span className="text-wc-green text-sm font-display">+{selected.points}p</span>}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-white/40">
            <path d="M3 6L8 11L13 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </button>
      {overlay}
    </>
  )
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

  const now = new Date()
  const isLocked = (bt: BonusTypeWithOptions) => !!(bt.locked_at && new Date(bt.locked_at) <= now)
  const editableTypes = bonusTypes.filter(b => !isLocked(b))
  const allFilled = editableTypes.every(b => (values[b.type] ?? '').trim() !== '')

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
        const locked = isLocked(bt)
        const fieldType = inferFieldType(bt.type, bt.options.length > 0)
        const hint = HINTS[bt.type] ?? null
        const pointsToShow = fieldType === 'select' ? selectedPoints[bt.type] : bt.points

        return (
          <div
            key={bt.type}
            className={`rounded-xl p-5 border ${locked ? 'bg-[#111] border-[#1e1e1e] opacity-60' : 'bg-[#1a1a1a] border-[#2a2a2a]'}`}
            style={{ animation: `fade-up 0.4s ease-out ${0.15 + i * 0.08}s both` }}
          >
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-display text-lg text-wc-light-gray uppercase tracking-wide">
                {bt.label}
              </h3>
              <div className="flex items-center gap-2">
                {locked && <span className="text-white/30 text-xs">🔒 Låst</span>}
                {pointsToShow != null && (
                  <span className="text-xs font-display text-wc-green">+{pointsToShow}p</span>
                )}
              </div>
            </div>

            {!locked && fieldType === 'select' && (
              <p className="text-xs text-[#888] mb-3">
                Poängen baseras på odds — ju större outsider, desto mer poäng.
              </p>
            )}

            {!locked && hint && (
              <div className="bg-[#111] border border-[#2a2a2a] rounded-lg px-4 py-3 mb-3">
                <p className="text-xs text-[#999] leading-relaxed">{hint}</p>
              </div>
            )}

            {locked ? (
              <div className="bg-[#0d0d0d] rounded-lg px-4 py-3 text-white/40 text-sm italic">
                Anmälningsperioden för detta val är stängd
              </div>
            ) : fieldType === 'select' ? (
              <OptionDropdown
                options={bt.options}
                value={values[bt.type]}
                onSelect={(val, pts) => selectOption(bt.type, bt.options, val)}
                label={bt.label}
              />
            ) : fieldType === 'players' ? (
              <SearchSelect
                options={WC_PLAYERS}
                value={values[bt.type]}
                onChange={val => set(bt.type, val)}
                placeholder="Sök eller välj spelare..."
              />
            ) : fieldType === 'number' ? (
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={700}
                value={values[bt.type]}
                onChange={e => set(bt.type, e.target.value)}
                placeholder="Ditt tips..."
                className="w-full bg-[#111] border border-[#3a3a3a] rounded-lg px-4 py-3.5
                           text-base text-wc-light-gray placeholder-white/30
                           focus:outline-none focus:border-wc-blue"
              />
            ) : (
              <input
                type="text"
                value={values[bt.type]}
                onChange={e => set(bt.type, e.target.value)}
                placeholder="Ditt tips..."
                className="w-full bg-[#111] border border-[#3a3a3a] rounded-lg px-4 py-3.5
                           text-base text-wc-light-gray placeholder-white/30
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
