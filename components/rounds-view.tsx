'use client'
import { useState } from 'react'
import type { Match, Prediction, Stage } from '@/lib/types'
import {
  STAGE_LABELS,
  deriveMatchState,
  teamDisplay,
  actualWinner,
  type MatchState,
} from '@/lib/knockout'

interface Props {
  stages: Stage[]
  byStage: Record<string, Match[]>
  predOf: (matchId: string) => Prediction | undefined
  onSelect: (match: Match) => void
}

function fmt(iso: string) {
  const d = new Date(iso)
  return {
    date: d.toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Stockholm' }),
    time: d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Stockholm' }),
  }
}

function isTodayStockholm(iso: string) {
  const opts = { timeZone: 'Europe/Stockholm' } as const
  return new Date(iso).toLocaleDateString('sv-SE', opts) === new Date().toLocaleDateString('sv-SE', opts)
}

function StatusBadge({ match, pred, state, today }: { match: Match; pred?: Prediction; state: MatchState; today: boolean }) {
  if (state === 'finished') {
    const pts = pred?.points_awarded ?? 0
    return (
      <div className="flex flex-col items-end gap-0.5">
        <span className="font-display text-base text-wc-light-gray">{match.home_score}–{match.away_score}</span>
        {pred
          ? <span className={`text-[10px] font-display ${pts > 0 ? 'text-wc-green' : 'text-white/30'}`}>{pts > 0 ? `+${pts}p` : '0p'}</span>
          : <span className="text-[10px] text-white/30">otippad</span>}
      </div>
    )
  }
  if (state === 'locked') {
    return (
      <span className="text-[11px] font-display tracking-widest text-white/40 uppercase whitespace-nowrap">
        🔒 {pred ? `${pred.home_score}–${pred.away_score}` : 'Låst'}
      </span>
    )
  }
  if (state === 'predicted') {
    return (
      <div className="flex flex-col items-end gap-1">
        <span className="text-[11px] font-display tracking-widest text-wc-green bg-wc-green/10 px-2.5 py-1.5 rounded-lg whitespace-nowrap">
          ✓ {pred?.home_score}–{pred?.away_score}
        </span>
        <span className="text-[9px] text-white/35 uppercase tracking-widest">Tryck för att ändra</span>
      </div>
    )
  }
  if (state === 'open') {
    return (
      <span className={`text-[11px] font-display tracking-widest text-white px-3 py-1.5 rounded-lg whitespace-nowrap ${today ? 'bg-wc-red' : 'bg-wc-blue'}`}>
        Tippa →
      </span>
    )
  }
  return <span className="text-[11px] font-display tracking-widest text-white/25 uppercase whitespace-nowrap">Väntar</span>
}

function Row({ match, pred, onSelect }: { match: Match; pred?: Prediction; onSelect: () => void }) {
  const state = deriveMatchState(match, pred)
  const isTbd = state === 'tbd'
  const winSide = state === 'finished' ? actualWinner(match) : (pred?.winner_pick ?? null)
  const home = teamDisplay(match.home_team, match.home_team_logo)
  const away = teamDisplay(match.away_team, match.away_team_logo)

  const TeamName = ({ side, t }: { side: 'home' | 'away'; t: ReturnType<typeof teamDisplay> }) => {
    const loser = !!winSide && winSide !== side && state === 'finished'
    return (
      <span className={`flex items-center gap-2.5 ${winSide === side ? 'text-wc-light-gray' : loser ? 'text-white/35' : 'text-wc-light-gray/90'}`}>
        {isTbd || !t.flagUrl
          ? <span className="w-7 h-7 rounded-full bg-[#262626] flex-shrink-0 flex items-center justify-center text-[10px] text-white/40 font-display">{isTbd ? '?' : t.abbr}</span>
          // eslint-disable-next-line @next/next/no-img-element
          : <img src={t.flagUrl} alt="" className={`w-7 h-7 rounded-full object-cover flex-shrink-0 ${loser ? 'opacity-40 grayscale' : ''}`} />}
        <span className={`font-display text-sm tracking-wide ${loser ? 'line-through' : ''}`}>{isTbd ? 'Ej klar' : (t.name || t.abbr)}</span>
      </span>
    )
  }

  const today = !isTbd && isTodayStockholm(match.kickoff_at)
  const { date, time } = fmt(match.kickoff_at)
  const border = state === 'open' ? (today ? 'border-wc-red/50' : 'border-wc-blue/40') : 'border-[#2a2a2a]'

  return (
    <button
      onClick={isTbd ? undefined : onSelect}
      disabled={isTbd}
      className={`w-full bg-[#1a1a1a] border ${border} rounded-xl px-4 py-3 flex flex-col gap-2 text-left
        ${isTbd ? 'opacity-50 cursor-default' : 'active:scale-[0.99] transition-all'}`}
    >
      {/* Date + time (Stockholm) */}
      <div className="flex items-center justify-between">
        <span className={`text-[11px] font-display tracking-widest uppercase ${today ? 'text-wc-red' : 'text-white/45'}`}>
          {isTbd ? 'Datum ej klart' : `${today ? 'Idag' : date} · ${time}`}
        </span>
        {state === 'finished' && <span className="text-[10px] text-white/35 uppercase tracking-widest">Spelad</span>}
        {state === 'locked' && <span className="text-[10px] text-white/35 uppercase tracking-widest">Låst</span>}
      </div>

      {/* Teams + status */}
      <div className="flex items-center justify-between gap-3">
        <span className="flex flex-col gap-1.5 min-w-0">
          <TeamName side="home" t={home} />
          <TeamName side="away" t={away} />
        </span>
        <StatusBadge match={match} pred={pred} state={state} today={today} />
      </div>
    </button>
  )
}

export default function RoundsView({ stages, byStage, predOf, onSelect }: Props) {
  const [idx, setIdx] = useState(() => {
    // Land on the first round that still has something to tip, else the first.
    const firstOpen = stages.findIndex(s =>
      (byStage[s] ?? []).some(m => deriveMatchState(m, predOf(m.id)) === 'open'),
    )
    return firstOpen >= 0 ? firstOpen : 0
  })

  if (!stages.length) return null
  const stage = stages[idx]
  const matches = byStage[stage] ?? []
  const tipped = matches.filter(m => {
    const st = deriveMatchState(m, predOf(m.id))
    return st === 'predicted' || st === 'locked' || st === 'finished'
  }).length

  return (
    <div>
      {/* Segmented progress */}
      <div className="flex gap-1.5 mb-4">
        {stages.map((s, i) => (
          <button
            key={s}
            onClick={() => setIdx(i)}
            aria-label={STAGE_LABELS[s].full}
            className={`flex-1 h-1.5 rounded-full transition-colors ${i === idx ? 'bg-wc-red' : i < idx ? 'bg-wc-red/30' : 'bg-[#2a2a2a]'}`}
          />
        ))}
      </div>

      {/* Round header with chevrons */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setIdx(i => Math.max(0, i - 1))}
          disabled={idx === 0}
          aria-label="Föregående runda"
          className="w-10 h-10 flex items-center justify-center rounded-lg text-white/60 disabled:opacity-20 active:scale-90 transition"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <div className="text-center">
          <h2 className="font-display text-lg text-wc-light-gray uppercase tracking-wide leading-none">
            {STAGE_LABELS[stage].full}
          </h2>
          <p className="text-[11px] text-white/40 mt-1">{tipped}/{matches.length} klara</p>
        </div>
        <button
          onClick={() => setIdx(i => Math.min(stages.length - 1, i + 1))}
          disabled={idx === stages.length - 1}
          aria-label="Nästa runda"
          className="w-10 h-10 flex items-center justify-center rounded-lg text-white/60 disabled:opacity-20 active:scale-90 transition"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      </div>

      {/* Match rows */}
      <div className="space-y-2.5">
        {matches.map(m => (
          <Row key={m.id} match={m} pred={predOf(m.id)} onSelect={() => onSelect(m)} />
        ))}
      </div>
    </div>
  )
}
