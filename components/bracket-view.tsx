'use client'
import { useEffect, useRef, useState } from 'react'
import type { Match, Prediction } from '@/lib/types'
import { STAGE_LABELS, deriveMatchState, teamDisplay, actualWinner, type MatchState } from '@/lib/knockout'
import { KNOCKOUT_SLOTS, apiIdToMatchNo, type KnockoutSlot } from '@/lib/wc2026-bracket'

interface Props {
  byStage: Record<string, Match[]>
  predOf: (matchId: string) => Prediction | undefined
  onSelect: (match: Match) => void
}

// ── Geometry (mirrored two-sided bracket) ───────────────────────────────────
const CW = 58, CH = 42, CGAP = 14, SH = 56, N_R32 = 8, N_COLS = 9, LBL_H = 20
const TW = N_COLS * CW + (N_COLS - 1) * CGAP
const TH = N_R32 * SH
const ROUND_NUM: Record<string, number> = { r32: 0, r16: 1, qf: 2, sf: 3 }

const cx = (col: number) => col * (CW + CGAP)
const cy = (round: number, idx: number) => SH * Math.pow(2, round) * (idx + 0.5)
const ty = (round: number, idx: number) => cy(round, idx) - CH / 2

function Connectors() {
  const lines: React.ReactNode[] = []
  const stroke = '#2a2a2a', sw = 1.5
  for (const side of ['left', 'right'] as const) {
    for (let r = 0; r < 3; r++) {
      const n = N_R32 / Math.pow(2, r)
      for (let p = 0; p < n / 2; p++) {
        const y1 = cy(r, p * 2), y2 = cy(r, p * 2 + 1), ym = (y1 + y2) / 2
        let xe: number, xm: number, xn: number
        if (side === 'left') { xe = cx(r) + CW; xm = xe + CGAP / 2; xn = cx(r + 1) }
        else { const col = N_COLS - 1 - r; xe = cx(col); xm = xe - CGAP / 2; xn = cx(col - 1) + CW }
        const k = `${side}-r${r}-p${p}`
        lines.push(
          <line key={`${k}a`} x1={xe} y1={y1} x2={xm} y2={y1} stroke={stroke} strokeWidth={sw} />,
          <line key={`${k}b`} x1={xe} y1={y2} x2={xm} y2={y2} stroke={stroke} strokeWidth={sw} />,
          <line key={`${k}c`} x1={xm} y1={y1} x2={xm} y2={y2} stroke={stroke} strokeWidth={sw} />,
          <line key={`${k}d`} x1={xm} y1={ym} x2={xn} y2={ym} stroke={stroke} strokeWidth={sw} />,
        )
      }
    }
    const sfY = cy(3, 0)
    if (side === 'left') lines.push(<line key="sf-l" x1={cx(3) + CW} y1={sfY} x2={cx(4)} y2={sfY} stroke={stroke} strokeWidth={sw} />)
    else lines.push(<line key="sf-r" x1={cx(5)} y1={sfY} x2={cx(4) + CW} y2={sfY} stroke={stroke} strokeWidth={sw} />)
  }
  return (
    <svg className="absolute pointer-events-none" style={{ top: LBL_H, left: 0 }} width={TW} height={TH} viewBox={`0 0 ${TW} ${TH}`}>{lines}</svg>
  )
}

function Flag({ url, size = 15, dim }: { url: string | null; size?: number; dim?: boolean }) {
  if (!url) return <div style={{ width: size, height: size }} className="rounded-full bg-[#2a2a2a] flex-shrink-0" />
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" style={{ width: size, height: size }} className={`rounded-full object-cover flex-shrink-0 ${dim ? 'opacity-30 grayscale' : ''}`} />
}

function TeamRow({ name, logo, score, win, lose }: { name: string | null; logo: string | null; score: number | null; win: boolean; lose: boolean }) {
  const t = teamDisplay(name, logo)
  return (
    <div className={`flex items-center gap-1 px-1 leading-none ${win ? 'text-wc-light-gray' : lose ? 'text-white/30' : 'text-white/75'}`}>
      <Flag url={t.flagUrl} dim={lose} />
      <span className={`font-display text-[9px] tracking-wide flex-1 truncate ${lose ? 'line-through' : ''}`}>{t.abbr}</span>
      {score != null && <span className={`font-display text-[9px] ${win ? 'text-wc-green' : 'text-white/35'}`}>{score}</span>}
    </div>
  )
}

function GhostRow({ feed }: { feed: number }) {
  return (
    <div className="flex items-center gap-1 px-1 leading-none text-white/30">
      <span className="w-[15px] h-[15px] rounded-full bg-[#1f1f1f] flex-shrink-0" />
      <span className="font-display text-[9px] tracking-wide flex-1 truncate">V{feed}</span>
    </div>
  )
}

// A team that has advanced into a not-yet-synced slot (provisional — either a
// finished result or the user's own tip). Rendered dimmer than a live match row.
function AdvancerRow({ name, logo }: { name: string | null; logo: string | null }) {
  const t = teamDisplay(name, logo)
  return (
    <div className="flex items-center gap-1 px-1 leading-none text-white/60">
      <Flag url={t.flagUrl} />
      <span className="font-display text-[9px] tracking-wide flex-1 truncate">{t.abbr}</span>
    </div>
  )
}

export default function BracketView({ byStage, predOf, onSelect }: Props) {
  const [scale, setScale] = useState(1)
  const [wrapW, setWrapW] = useState(TW)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const update = () => { setWrapW(window.innerWidth); setScale(Math.min(1, (window.innerWidth * 0.96) / TW)) }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // Map synced R32 fixtures to their official slots (by api_match_id). Falls back
  // to positional order when ids don't match the draw (e.g. dev preview data).
  const r32Matches = byStage['round_of_32'] ?? []
  const byApiId = new Map(r32Matches.map(m => [m.api_match_id, m]))
  const anyMapped = r32Matches.some(m => apiIdToMatchNo.has(m.api_match_id))
  const r32SlotIds = KNOCKOUT_SLOTS.filter(s => s.round === 'r32').map(s => s.id)
  const slotById = new Map(KNOCKOUT_SLOTS.map(s => [s.id, s]))
  const STAGE_OF: Record<KnockoutSlot['round'], string> = {
    r32: 'round_of_32', r16: 'round_of_16', qf: 'quarter_final',
    sf: 'semi_final', final: 'final', bronze: 'third_place',
  }

  type Advancer = { name: string; logo: string | null }

  // The fixture occupying a slot. R32 is pinned by api_match_id (or positional in
  // preview). Later rounds have no such pin, so a fixture is matched to its slot
  // once its two feeder winners are known and a synced fixture pairs those teams.
  function matchForSlot(slot: KnockoutSlot): Match | undefined {
    if (slot.round === 'r32') {
      if (anyMapped) return byApiId.get(slot.apiMatchId!)
      return r32Matches[r32SlotIds.indexOf(slot.id)] // preview fallback
    }
    if (!slot.feeds) return undefined
    const a = advancerFrom(slot.feeds[0])
    const b = advancerFrom(slot.feeds[1])
    if (!a || !b) return undefined
    const pool = byStage[STAGE_OF[slot.round]] ?? []
    return pool.find(m => {
      const teams = [m.home_team, m.away_team]
      return teams.includes(a.name) && teams.includes(b.name)
    })
  }

  // Who advances out of match number `no` — the actual winner, but only once the
  // match is finished. Until then the downstream slot keeps its "Vinnare match X"
  // placeholder. As soon as a real result syncs, the winner flows forward on its
  // own. Feeds always reference an earlier round, so recursion bottoms out at R32.
  function advancerFrom(no: number): Advancer | null {
    const slot = slotById.get(no)
    if (!slot) return null
    const match = matchForSlot(slot)
    if (!match || match.status !== 'finished') return null
    const side = actualWinner(match)
    if (!side) return null
    return side === 'home'
      ? { name: match.home_team, logo: match.home_team_logo }
      : { name: match.away_team, logo: match.away_team_logo }
  }

  function slotTop(slot: KnockoutSlot) {
    if (slot.round === 'final') return (TH - CH) / 2 + LBL_H
    return ty(ROUND_NUM[slot.round], slot.idx) + LBL_H
  }

  function renderSlot(slot: KnockoutSlot) {
    const match = matchForSlot(slot)
    if (match) {
      const state: MatchState = deriveMatchState(match, predOf(match.id))
      const finished = state === 'finished'
      const winSide = finished ? actualWinner(match) : (predOf(match.id)?.winner_pick ?? null)
      const ring =
        state === 'open' ? 'border-wc-blue/70 shadow-[0_0_7px_rgba(42,57,141,0.45)]'
        : state === 'predicted' ? 'border-wc-blue/50'
        : state === 'finished' ? 'border-wc-green/30'
        : 'border-[#2a2a2a]'
      return (
        <button
          onClick={() => onSelect(match)}
          aria-label={`${match.home_team} mot ${match.away_team}`}
          style={{ width: CW, height: CH }}
          className={`relative bg-[#1a1a1a] border ${ring} rounded-md flex flex-col justify-around overflow-hidden active:scale-95 transition-transform`}
        >
          <TeamRow name={match.home_team} logo={match.home_team_logo} score={finished ? match.home_score : null} win={winSide === 'home'} lose={finished && winSide !== 'home'} />
          <div className="h-px bg-white/5" />
          <TeamRow name={match.away_team} logo={match.away_team_logo} score={finished ? match.away_score : null} win={winSide === 'away'} lose={finished && winSide !== 'away'} />
          {state === 'open' && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-wc-blue animate-pulse" />}
          {state === 'predicted' && <span className="absolute top-0.5 right-0.5 text-[7px] text-wc-green">✓</span>}
        </button>
      )
    }
    // Placeholder slot — show each advancing team once its feeder resolves
    // (finished result or the user's tip), otherwise "Vinnare match X".
    const [f0, f1] = slot.feeds!
    const a0 = advancerFrom(f0)
    const a1 = advancerFrom(f1)
    return (
      <div style={{ width: CW, height: CH }} className="bg-[#161616] border border-dashed border-[#2a2a2a] rounded-md flex flex-col justify-around overflow-hidden">
        {a0 ? <AdvancerRow name={a0.name} logo={a0.logo} /> : <GhostRow feed={f0} />}
        <div className="h-px bg-white/5" />
        {a1 ? <AdvancerRow name={a1.name} logo={a1.logo} /> : <GhostRow feed={f1} />}
      </div>
    )
  }

  const labels = ['16-DEL', '8-DEL', 'KVART', 'SEMI', 'FINAL', 'SEMI', 'KVART', '8-DEL', '16-DEL']
  const treeSlots = KNOCKOUT_SLOTS.filter(s => s.round !== 'bronze')
  const bronze = KNOCKOUT_SLOTS.find(s => s.round === 'bronze')!

  // Champion (only once the final is decided)
  const finalMatch = byStage['final']?.[0]
  const champSide = finalMatch && finalMatch.status === 'finished' ? actualWinner(finalMatch) : null
  const champName = champSide === 'home' ? finalMatch?.home_team : champSide === 'away' ? finalMatch?.away_team : null
  const champ = champName ? teamDisplay(champName, null) : null

  const scaledH = (TH + LBL_H) * scale

  return (
    <div>
      <div className="flex flex-col items-center mb-3">
        <span className="text-2xl leading-none">🏆</span>
        {champ
          ? <span className="font-display text-sm text-[#d4af37] tracking-wide mt-1 flex items-center gap-1.5"><Flag url={champ.flagUrl} size={16} /> {champ.name}</span>
          : <span className="font-display text-[10px] text-white/30 tracking-widest uppercase mt-1">Mästare</span>}
      </div>

      <div ref={wrapRef} style={{ position: 'relative', left: '50%', transform: 'translateX(-50%)', width: '100vw', height: scaledH, overflow: 'hidden' }}>
        <div style={{ width: TW, height: TH + LBL_H, transform: `scale(${scale})`, transformOrigin: 'top left', marginLeft: (wrapW - TW * scale) / 2 }}>
          {/* Column labels */}
          {labels.map((label, col) => (
            <div key={col} className="absolute flex items-center justify-center" style={{ left: cx(col), width: CW, top: 0, height: LBL_H }}>
              <span className={`font-display tracking-widest uppercase ${col === 4 ? 'text-[10px] text-wc-red' : 'text-[8px] text-wc-blue'}`}>{label}</span>
            </div>
          ))}

          <Connectors />

          {/* Slots + match-number labels */}
          {treeSlots.map(slot => (
            <div key={slot.id} className="absolute" style={{ left: cx(slot.col), top: slotTop(slot) }}>
              {renderSlot(slot)}
              <div className="text-center font-display text-[7px] text-white/25 tracking-widest mt-0.5">M{slot.id}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bronze match */}
      <div className="mt-5 pt-4 border-t border-[#1a1a1a] flex flex-col items-center">
        <p className="font-display text-[9px] tracking-widest text-white/40 uppercase mb-2">{STAGE_LABELS.third_place.full} · M{bronze.id}</p>
        <div className="bg-[#161616] border border-dashed border-[#2a2a2a] rounded-md flex flex-col justify-around overflow-hidden" style={{ width: CW * 1.4, height: CH }}>
          <div className="flex items-center gap-1 px-1 leading-none text-white/30">
            <span className="w-[15px] h-[15px] rounded-full bg-[#1f1f1f]" />
            <span className="font-display text-[9px] tracking-wide flex-1">Förlorare M{bronze.feeds![0]}</span>
          </div>
          <div className="h-px bg-white/5" />
          <div className="flex items-center gap-1 px-1 leading-none text-white/30">
            <span className="w-[15px] h-[15px] rounded-full bg-[#1f1f1f]" />
            <span className="font-display text-[9px] tracking-wide flex-1">Förlorare M{bronze.feeds![1]}</span>
          </div>
        </div>
      </div>

      <p className="text-[10px] text-white/30 text-center mt-4">Tryck på en match för att tippa</p>
    </div>
  )
}
