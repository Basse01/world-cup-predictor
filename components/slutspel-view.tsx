'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Match, Prediction } from '@/lib/types'
import { groupByStage, presentStages } from '@/lib/knockout'
import BracketView from './bracket-view'
import RoundsView from './rounds-view'
import KnockoutMatchSheet from './knockout-match-sheet'

interface Props {
  matches: Match[]
  predictions: Prediction[]
  preview?: boolean
  openMatchId?: string
}

type View = 'bracket' | 'rounds'

export default function SlutspelView({ matches, predictions, preview, openMatchId }: Props) {
  const router = useRouter()
  const [view, setView] = useState<View>('bracket')
  const [selectedId, setSelectedId] = useState<string | null>(openMatchId ?? null)
  const [preds, setPreds] = useState<Record<string, Prediction>>(
    () => Object.fromEntries(predictions.map(p => [p.match_id, p])),
  )

  // Reconcile with server truth after a refresh (skip in preview — no DB there).
  useEffect(() => {
    if (preview) return
    setPreds(Object.fromEntries(predictions.map(p => [p.match_id, p])))
  }, [predictions, preview])

  // Live: refresh server data when any match changes (scores, status, new fixtures).
  useEffect(() => {
    if (preview) return
    const supabase = createClient()
    const channel = supabase
      .channel('knockout-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => router.refresh())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [preview, router])

  const byStage = useMemo(() => groupByStage(matches), [matches])
  const stages = useMemo(() => presentStages(matches), [matches])
  const matchById = useMemo(() => new Map(matches.map(m => [m.id, m])), [matches])

  const predOf = (id: string) => preds[id]
  const selected = selectedId ? matchById.get(selectedId) : undefined

  function handlePickChange(
    matchId: string,
    hasPick: boolean,
    values?: Pick<Prediction, 'winner_pick' | 'home_score' | 'away_score'>,
  ) {
    setPreds(prev => {
      const next = { ...prev }
      if (hasPick) {
        next[matchId] = {
          ...(prev[matchId] ?? { id: `local-${matchId}`, user_id: 'me', match_id: matchId, pick: null, points_awarded: 0 }),
          winner_pick: values?.winner_pick ?? prev[matchId]?.winner_pick ?? null,
          home_score: values?.home_score ?? prev[matchId]?.home_score ?? null,
          away_score: values?.away_score ?? prev[matchId]?.away_score ?? null,
        } as Prediction
      } else {
        delete next[matchId]
      }
      return next
    })
  }

  return (
    <div>
      <h1 className="font-display text-3xl sm:text-4xl text-wc-light-gray uppercase tracking-wide mb-4">
        Slutspel
      </h1>

      {preview && (
        <div className="mb-4 flex items-center gap-2 bg-wc-blue/10 border border-wc-blue/30 text-wc-blue text-xs font-medium px-3 py-2 rounded-lg">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-wc-blue animate-pulse" />
          Förhandsvisning med exempeldata — riktiga lag visas när gruppspelet är klart.
        </div>
      )}

      {/* Sticky view toggle */}
      <div className="sticky top-12 sm:top-14 z-30 bg-[#111] -mx-4 px-4 py-2 mb-5">
        <div className="flex bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-1">
          {(['bracket', 'rounds'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex-1 py-2.5 rounded-lg font-display text-sm tracking-widest uppercase transition-colors ${
                view === v ? 'bg-wc-red text-white' : 'text-white/50 active:text-white'
              }`}
            >
              {v === 'bracket' ? 'Bracket' : 'Omgångar'}
            </button>
          ))}
        </div>
      </div>

      {view === 'bracket'
        ? <BracketView byStage={byStage} predOf={predOf} onSelect={m => setSelectedId(m.id)} />
        : <RoundsView stages={stages} byStage={byStage} predOf={predOf} onSelect={m => setSelectedId(m.id)} />}

      {selected && (
        <KnockoutMatchSheet
          match={selected}
          prediction={predOf(selected.id)}
          preview={preview}
          onClose={() => setSelectedId(null)}
          onPickChange={handlePickChange}
        />
      )}
    </div>
  )
}
