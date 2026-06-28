'use client'
import { useEffect, useRef } from 'react'
import KnockoutCard from './knockout-card'
import type { Match, Prediction } from '@/lib/types'
import { STAGE_LABELS } from '@/lib/knockout'

interface Props {
  match: Match
  prediction?: Prediction
  preview?: boolean
  onClose: () => void
  onPickChange?: (matchId: string, hasPick: boolean, values?: Pick<Prediction, 'winner_pick' | 'home_score' | 'away_score'>) => void
}

export default function KnockoutMatchSheet({ match, prediction, preview, onClose, onPickChange }: Props) {
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Lock body scroll + close on Escape while the sheet is open.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
      if (closeTimer.current) clearTimeout(closeTimer.current)
    }
  }, [onClose])

  // After a successful save, briefly show the confirmation then close the sheet.
  function handlePick(
    matchId: string,
    hasPick: boolean,
    values?: Pick<Prediction, 'winner_pick' | 'home_score' | 'away_score'>,
  ) {
    onPickChange?.(matchId, hasPick, values)
    if (hasPick) closeTimer.current = setTimeout(onClose, 700)
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end sm:items-center sm:justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-[fade-up_0.2s_ease-out]"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${STAGE_LABELS[match.stage].full}: ${match.home_team} mot ${match.away_team}`}
        className="relative w-full sm:max-w-md bg-[#111] border-t-2 sm:border-2 border-wc-red/60
                   rounded-t-3xl sm:rounded-3xl px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]
                   shadow-2xl animate-slide-in max-h-[88vh] overflow-y-auto"
      >
        {/* Grab handle (mobile) */}
        <div className="sm:hidden mx-auto mb-2 h-1.5 w-10 rounded-full bg-white/20" />

        <div className="flex justify-end mb-1">
          <button
            onClick={onClose}
            aria-label="Stäng"
            className="flex items-center justify-center w-9 h-9 -mr-1 rounded-full text-white/50
                       hover:text-white active:scale-90 transition"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>

        <KnockoutCard match={match} prediction={prediction} preview={preview} onPickChange={handlePick} />
      </div>
    </div>
  )
}
