'use client'
import { useState } from 'react'
import Image from 'next/image'
import type { Match, Prediction, WinnerPick } from '@/lib/types'
import { isMatchLocked } from '@/lib/points'

interface KnockoutCardProps {
  match: Match
  prediction?: Prediction
}

export default function KnockoutCard({ match, prediction }: KnockoutCardProps) {
  const [winnerPick, setWinnerPick] = useState<WinnerPick | null>(prediction?.winner_pick ?? null)
  const [homeScore, setHomeScore] = useState<string>(prediction?.home_score?.toString() ?? '')
  const [awayScore, setAwayScore] = useState<string>(prediction?.away_score?.toString() ?? '')
  const [saving, setSaving] = useState(false)
  const [shake, setShake] = useState(false)
  const [saved, setSaved] = useState(false)
  const locked = isMatchLocked(match.lock_at)

  const kickoff = new Date(match.kickoff_at)
  const kickoffStr = kickoff.toLocaleDateString('sv-SE', {
    weekday: 'short', month: 'short', day: 'numeric',
  }) + ' ' + kickoff.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })

  async function handleSave() {
    if (locked || saving) return
    if (!winnerPick || homeScore === '' || awayScore === '') {
      setShake(true)
      setTimeout(() => setShake(false), 400)
      return
    }
    setSaving(true)
    setSaved(false)
    const res = await fetch('/api/predictions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        match_id: match.id,
        winner_pick: winnerPick,
        home_score: parseInt(homeScore),
        away_score: parseInt(awayScore),
      }),
    })
    setSaving(false)
    if (res.ok) setSaved(true)
    else {
      setShake(true)
      setTimeout(() => setShake(false), 400)
    }
  }

  const stageLabel: Record<string, string> = {
    round_of_16: 'Åttondel',
    quarter_final: 'Kvartsfinal',
    semi_final: 'Semifinal',
    final: 'Final',
  }

  return (
    <div className={`bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a] ${shake ? 'animate-shake' : ''}`}>
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs font-display tracking-widest text-wc-blue uppercase">
          {stageLabel[match.stage] ?? match.stage}
        </span>
        <span className="text-xs text-wc-dark-gray">{kickoffStr}</span>
      </div>

      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => !locked && setWinnerPick('home')}
          disabled={locked}
          aria-label={`Välj ${match.home_team} som vinnare`}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all border-2 w-[72px] sm:w-28 min-h-[44px]
            ${winnerPick === 'home' ? 'border-wc-blue bg-wc-blue/10 scale-105' : 'border-transparent'}
            ${locked ? 'cursor-default' : 'cursor-pointer hover:border-wc-dark-gray'}`}
        >
          {match.home_team_logo && (
            <Image src={match.home_team_logo} alt={match.home_team} width={36} height={36} />
          )}
          <span className="font-display text-sm text-wc-light-gray text-center leading-tight">
            {match.home_team}
          </span>
        </button>

        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0} max={20}
            value={homeScore}
            onChange={e => {
              if (locked) return
              const v = parseInt(e.target.value)
              setHomeScore(isNaN(v) ? '' : String(Math.max(0, Math.min(20, v))))
            }}
            disabled={locked}
            placeholder="0"
            aria-label="Hemmamål"
            className="w-12 text-center font-display text-2xl bg-[#111] border border-wc-dark-gray
                       rounded-lg py-3 min-h-[44px] text-wc-light-gray focus:outline-none focus:border-wc-blue
                       disabled:opacity-40"
          />
          <span className="font-display text-2xl text-wc-dark-gray">–</span>
          <input
            type="number"
            min={0} max={20}
            value={awayScore}
            onChange={e => {
              if (locked) return
              const v = parseInt(e.target.value)
              setAwayScore(isNaN(v) ? '' : String(Math.max(0, Math.min(20, v))))
            }}
            disabled={locked}
            placeholder="0"
            aria-label="Bortamål"
            className="w-12 text-center font-display text-2xl bg-[#111] border border-wc-dark-gray
                       rounded-lg py-3 min-h-[44px] text-wc-light-gray focus:outline-none focus:border-wc-blue
                       disabled:opacity-40"
          />
        </div>

        <button
          onClick={() => !locked && setWinnerPick('away')}
          disabled={locked}
          aria-label={`Välj ${match.away_team} som vinnare`}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all border-2 w-[72px] sm:w-28 min-h-[44px]
            ${winnerPick === 'away' ? 'border-wc-red bg-wc-red/10 scale-105' : 'border-transparent'}
            ${locked ? 'cursor-default' : 'cursor-pointer hover:border-wc-dark-gray'}`}
        >
          {match.away_team_logo && (
            <Image src={match.away_team_logo} alt={match.away_team} width={36} height={36} />
          )}
          <span className="font-display text-sm text-wc-light-gray text-center leading-tight">
            {match.away_team}
          </span>
        </button>
      </div>

      <p className="text-xs text-wc-dark-gray text-center mb-3">
        Klicka på ett lag för att välja vinnare · Ange exakt resultat efter 90 min
      </p>

      {!locked && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-wc-green hover:bg-green-700 text-white font-display tracking-widest
                     py-2.5 rounded-lg transition-colors disabled:opacity-50 text-sm uppercase"
        >
          {saving ? 'Sparar...' : saved ? '✓ Sparad' : 'Spara prediktion'}
        </button>
      )}

      {prediction?.points_awarded != null && prediction.points_awarded > 0 && (
        <p className="text-xs text-wc-green mt-2 text-center font-medium animate-count-up">
          +{prediction.points_awarded}p
        </p>
      )}
    </div>
  )
}
