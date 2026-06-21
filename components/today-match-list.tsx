'use client'
import { useState } from 'react'
import type { Match, Prediction } from '@/lib/types'
import MatchCard from './match-card'
import KnockoutCard from './knockout-card'

interface Props {
  matches: Match[]
  predictions: Prediction[]
}

export default function TodayMatchList({ matches, predictions }: Props) {
  const predMap = new Map(predictions.map(p => [p.match_id, p]))
  const [tippedIds, setTippedIds] = useState<Set<string>>(
    () => new Set(predictions.map(p => p.match_id))
  )

  function handlePickChange(matchId: string, hasPick: boolean) {
    setTippedIds(prev => {
      const next = new Set(prev)
      if (hasPick) next.add(matchId)
      else next.delete(matchId)
      return next
    })
  }

  const total = matches.length
  const tipped = tippedIds.size
  const allDone = total > 0 && tipped === total

  if (total === 0) {
    return (
      <div className="bg-[#1a1a1a] rounded-xl p-8 border border-[#2a2a2a] text-center">
        <p className="text-white/50">Inga fler matcher idag — nästa matchdag börjar 08:00.</p>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
          <div
            className="h-full bg-wc-blue rounded-full transition-all duration-300"
            style={{ width: `${(tipped / total) * 100}%` }}
          />
        </div>
        {allDone
          ? <p className="text-xs text-wc-green whitespace-nowrap">Alla tippade ✓</p>
          : <p className="text-xs text-white/50 whitespace-nowrap">{tipped}/{total} tippade</p>
        }
      </div>
      <div className="space-y-3">
        {matches.map(m =>
          m.stage === 'group'
            ? <MatchCard key={m.id} match={m} prediction={predMap.get(m.id)} onPickChange={handlePickChange} />
            : <KnockoutCard key={m.id} match={m} prediction={predMap.get(m.id)} onPickChange={handlePickChange} />
        )}
      </div>
    </>
  )
}
