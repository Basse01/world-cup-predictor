'use client'
import { useState, useRef } from 'react'
import Image from 'next/image'
import type { Match, Pick1X2, Prediction } from '@/lib/types'
import { isMatchLocked } from '@/lib/points'

interface MatchCardProps {
  match: Match
  prediction?: Prediction
}

export default function MatchCard({ match, prediction }: MatchCardProps) {
  const [pick, setPick] = useState<Pick1X2 | null>(prediction?.pick ?? null)
  const [saving, setSaving] = useState(false)
  const [shake, setShake] = useState(false)
  const locked = isMatchLocked(match.lock_at)
  const savingRef = useRef(false)

  const kickoff = new Date(match.kickoff_at)
  const kickoffStr = kickoff.toLocaleDateString('sv-SE', {
    weekday: 'short', month: 'short', day: 'numeric',
  }) + ' ' + kickoff.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })

  async function handlePick(p: Pick1X2) {
    if (locked || savingRef.current) return
    savingRef.current = true
    setSaving(true)
    setPick(p)
    const res = await fetch('/api/predictions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ match_id: match.id, pick: p }),
    })
    if (!res.ok) {
      setPick(prediction?.pick ?? null)
      setShake(true)
      setTimeout(() => setShake(false), 400)
    }
    savingRef.current = false
    setSaving(false)
  }

  const baseBtn = 'flex-1 py-2.5 rounded-lg font-display tracking-widest text-lg transition-all duration-150 border-2'
  const activeBtn = 'border-transparent text-white scale-105'
  const inactiveBtn = 'border-wc-dark-gray text-wc-dark-gray hover:border-wc-light-gray hover:text-wc-light-gray'
  const disabledBtn = 'opacity-40 cursor-not-allowed'

  return (
    <div className={`bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a] ${shake ? 'animate-shake' : ''}`}>
      {match.status === 'live' && (
        <span className="inline-flex items-center gap-1.5 text-xs text-wc-red font-medium mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-wc-red animate-live-pulse" />
          LIVE
        </span>
      )}
      <div className="text-xs text-wc-dark-gray mb-3">{kickoffStr}</div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-col items-center gap-1 w-28">
          {match.home_team_logo && (
            <Image src={match.home_team_logo} alt={match.home_team} width={36} height={36} />
          )}
          <span className="font-display text-sm text-wc-light-gray text-center leading-tight">
            {match.home_team}
          </span>
        </div>
        <div className="font-display text-3xl text-wc-dark-gray">
          {match.status === 'finished' ? `${match.home_score} – ${match.away_score}` : 'VS'}
        </div>
        <div className="flex flex-col items-center gap-1 w-28">
          {match.away_team_logo && (
            <Image src={match.away_team_logo} alt={match.away_team} width={36} height={36} />
          )}
          <span className="font-display text-sm text-wc-light-gray text-center leading-tight">
            {match.away_team}
          </span>
        </div>
      </div>

      <div className="flex gap-2">
        {(['1', 'X', '2'] as Pick1X2[]).map(p => (
          <button
            key={p}
            onClick={() => handlePick(p)}
            disabled={locked}
            aria-label={p === '1' ? `Hemmavinst (${match.home_team})` : p === '2' ? `Bortavinst (${match.away_team})` : 'Oavgjort'}
            className={`${baseBtn}
              ${pick === p
                ? `${activeBtn} ${p === '1' ? 'bg-wc-blue' : p === 'X' ? 'bg-wc-green' : 'bg-wc-red'}`
                : inactiveBtn}
              ${locked ? disabledBtn : ''}`}
          >
            {p}
          </button>
        ))}
      </div>

      {locked && !prediction?.pick && (
        <p className="text-xs text-wc-dark-gray mt-2 text-center">Låst — ingen prediktion</p>
      )}
      {prediction?.points_awarded != null && prediction.points_awarded > 0 && (
        <p className="text-xs text-wc-green mt-2 text-center font-medium animate-count-up">
          +{prediction.points_awarded}p
        </p>
      )}
    </div>
  )
}
