'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import type { Match, Prediction } from '@/lib/types'
import { isMatchLocked } from '@/lib/points'
import KnockoutCard from './knockout-card'

// ── Layout constants ──────────────────────────────────────────────────────────
const CW     = 130   // card width px
const CH     = 56    // card height px
const CGAP   = 20    // gap between columns (connector space)
const SH     = 76    // slot vertical pitch at R32 level
const N_R32  = 8     // R32 match slots per side
const N_COLS = 9     // 4 left + 1 center + 4 right

const TW     = N_COLS * CW + (N_COLS - 1) * CGAP   // total bracket width
const TH     = N_R32 * SH                            // total bracket height
const LBL_H  = 22                                    // label bar height

// Column left-edge x
const cx = (col: number) => col * (CW + CGAP)

// Vertical centre of slot in SVG space (round 0=R32, 1=R16, 2=QF, 3=SF)
const cy = (round: number, idx: number): number =>
  SH * Math.pow(2, round) * (idx + 0.5)

// Top edge of slot card (SVG space)
const ty = (round: number, idx: number): number => cy(round, idx) - CH / 2

function pad<T>(arr: T[], n: number, fill: T): T[] {
  const a = [...arr]
  while (a.length < n) a.push(fill)
  return a
}

// ── SVG connectors ────────────────────────────────────────────────────────────
function Connectors() {
  const lines: React.ReactNode[] = []
  const stroke = '#2d2d2d'
  const sw = 1.5

  for (const side of ['left', 'right'] as const) {
    // R32→R16, R16→QF, QF→SF
    for (let r = 0; r < 3; r++) {
      const n = N_R32 / Math.pow(2, r)  // 8, 4, 2 matches in round r
      for (let p = 0; p < n / 2; p++) {
        const y1 = cy(r, p * 2)
        const y2 = cy(r, p * 2 + 1)
        const ym = (y1 + y2) / 2

        let xe: number, xm: number, xn: number

        if (side === 'left') {
          xe = cx(r) + CW
          xm = xe + CGAP / 2
          xn = cx(r + 1)
        } else {
          const col = N_COLS - 1 - r
          xe = cx(col)
          xm = xe - CGAP / 2
          xn = cx(col - 1) + CW
        }

        const k = `${side}-r${r}-p${p}`
        lines.push(
          <line key={`${k}a`} x1={xe} y1={y1} x2={xm} y2={y1} stroke={stroke} strokeWidth={sw} />,
          <line key={`${k}b`} x1={xe} y1={y2} x2={xm} y2={y2} stroke={stroke} strokeWidth={sw} />,
          <line key={`${k}c`} x1={xm} y1={y1} x2={xm} y2={y2} stroke={stroke} strokeWidth={sw} />,
          <line key={`${k}d`} x1={xm} y1={ym} x2={xn} y2={ym} stroke={stroke} strokeWidth={sw} />,
        )
      }
    }

    // SF → Final (straight horizontal — both at y = TH/2)
    const sfY = cy(3, 0)  // = TH/2 = 304px
    if (side === 'left') {
      lines.push(
        <line key="sf-l" x1={cx(3) + CW} y1={sfY} x2={cx(4)} y2={sfY} stroke={stroke} strokeWidth={sw} />
      )
    } else {
      lines.push(
        <line key="sf-r" x1={cx(5)} y1={sfY} x2={cx(4) + CW} y2={sfY} stroke={stroke} strokeWidth={sw} />
      )
    }
  }

  return (
    <svg
      className="absolute inset-x-0 pointer-events-none"
      style={{ top: LBL_H, left: 0 }}
      width={TW}
      height={TH}
      viewBox={`0 0 ${TW} ${TH}`}
    >
      {lines}
    </svg>
  )
}

// ── Team row inside slot card ─────────────────────────────────────────────────
function TeamRow({
  logo, name, score, highlight,
}: {
  logo?: string | null
  name?: string | null
  score?: number | null
  highlight?: boolean
}) {
  return (
    <div className={`flex items-center gap-1 px-2 flex-1 min-w-0 ${highlight ? 'bg-wc-blue/20' : ''}`}>
      {logo ? (
        <Image
          src={logo}
          alt=""
          width={14}
          height={14}
          className="rounded-full flex-shrink-0 object-cover"
          unoptimized
        />
      ) : (
        <div className="w-3.5 h-3.5 rounded-full bg-[#2a2a2a] flex-shrink-0" />
      )}
      <span className={`text-[10px] font-medium truncate flex-1 leading-tight ${highlight ? 'text-white' : 'text-wc-light-gray/80'}`}>
        {name || 'TBD'}
      </span>
      {score != null && (
        <span className={`text-[10px] font-bold flex-shrink-0 ml-0.5 ${highlight ? 'text-wc-blue' : 'text-white/50'}`}>
          {score}
        </span>
      )}
    </div>
  )
}

// ── Compact match card in bracket ─────────────────────────────────────────────
function SlotCard({
  match, pred, onClick,
}: {
  match: Match | null
  pred?: Prediction
  onClick?: () => void
}) {
  if (!match) return (
    <div
      style={{ width: CW, height: CH }}
      className="rounded-lg border border-[#282828] overflow-hidden flex flex-col opacity-50"
    >
      <TeamRow />
      <div className="h-px bg-[#282828]" />
      <TeamRow />
    </div>
  )

  const locked  = isMatchLocked(match.lock_at)
  const hasPred = !!pred
  const homeW   = pred?.winner_pick === 'home'
  const awayW   = pred?.winner_pick === 'away'

  // Show prediction scores if set, otherwise actual score for finished matches
  const hScore = pred?.home_score ?? (match.status === 'finished' ? match.home_score : null)
  const aScore = pred?.away_score ?? (match.status === 'finished' ? match.away_score : null)

  return (
    <button
      onClick={!locked ? onClick : undefined}
      style={{ width: CW, height: CH }}
      className={[
        'rounded-lg border overflow-hidden flex flex-col text-left transition-transform',
        hasPred
          ? 'border-wc-blue/60 shadow-[0_0_10px_rgba(0,100,255,0.12)]'
          : 'border-[#2a2a2a]',
        !locked
          ? 'cursor-pointer hover:border-wc-blue/40 active:scale-[0.96]'
          : 'cursor-default',
      ].join(' ')}
    >
      <TeamRow logo={match.home_team_logo} name={match.home_team} score={hScore} highlight={homeW} />
      <div className={`h-px flex-shrink-0 ${hasPred ? 'bg-wc-blue/20' : 'bg-[#2a2a2a]'}`} />
      <TeamRow logo={match.away_team_logo} name={match.away_team} score={aScore} highlight={awayW} />
    </button>
  )
}

// ── Main bracket component ────────────────────────────────────────────────────
export default function TournamentBracket({
  matches,
  predMap,
}: {
  matches: Match[]
  predMap: Map<string, Prediction>
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<Match | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [wrapW, setWrapW] = useState(TW)

  useEffect(() => {
    const update = () => {
      // Use 95% of viewport width so bracket fills the screen on any device
      const vw = window.innerWidth
      const available = vw * 0.95
      setWrapW(vw)
      setScale(Math.min(1, available / TW))  // never upscale past 1:1
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const sort = (stage: string) =>
    matches
      .filter(m => m.stage === stage)
      .sort((a, b) => new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime())

  const r32 = sort('round_of_32')
  const r16 = sort('round_of_16')
  const qf  = sort('quarter_final')
  const sf  = sort('semi_final')
  const fin = sort('final')

  // Split each stage left/right
  const cols: Array<{ col: number; round: number; matches: (Match | null)[]; label: string }> = [
    { col: 0, round: 0, matches: pad<Match | null>(r32.slice(0, 8),  8, null), label: 'R32' },
    { col: 1, round: 1, matches: pad<Match | null>(r16.slice(0, 4),  4, null), label: 'R16' },
    { col: 2, round: 2, matches: pad<Match | null>(qf.slice(0, 2),   2, null), label: 'QF'  },
    { col: 3, round: 3, matches: pad<Match | null>(sf.slice(0, 1),   1, null), label: 'SF'  },
    { col: 4, round: 3, matches: pad<Match | null>(fin.slice(-1),    1, null), label: '🏆'  },
    { col: 5, round: 3, matches: pad<Match | null>(sf.slice(1, 2),   1, null), label: 'SF'  },
    { col: 6, round: 2, matches: pad<Match | null>(qf.slice(2, 4),   2, null), label: 'QF'  },
    { col: 7, round: 1, matches: pad<Match | null>(r16.slice(4, 8),  4, null), label: 'R16' },
    { col: 8, round: 0, matches: pad<Match | null>(r32.slice(8, 16), 8, null), label: 'R32' },
  ]

  function handleClose() {
    setSelected(null)
    router.refresh()
  }

  const scaledH = (TH + LBL_H) * scale

  return (
    <>
      {/* Breaks out of page max-width — fills full viewport */}
      <div
        ref={wrapRef}
        style={{
          position: 'relative',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100vw',
          height: scaledH,
          overflow: 'hidden',
        }}
      >
        {/* Scaled bracket, centered inside viewport */}
        <div
          style={{
            width: TW,
            height: TH + LBL_H,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            marginLeft: (wrapW - TW * scale) / 2,
          }}
        >
          {/* Column labels */}
          {cols.map(({ col, label }) => (
            <div
              key={col}
              className="absolute flex items-center justify-center"
              style={{ left: cx(col), width: CW, top: 0, height: LBL_H }}
            >
              <span className={`font-display tracking-widest uppercase ${col === 4 ? 'text-sm' : 'text-[9px] text-white/50'}`}>
                {label}
              </span>
            </div>
          ))}

          {/* Connector SVG */}
          <Connectors />

          {/* Gold glow behind Final */}
          <div
            className="absolute pointer-events-none rounded-xl"
            style={{
              left: cx(4) - 5,
              top: (TH - CH) / 2 + LBL_H - 5,
              width: CW + 10,
              height: CH + 10,
              boxShadow: '0 0 24px rgba(212,175,55,0.2)',
              border: '1px solid rgba(212,175,55,0.25)',
              borderRadius: 12,
            }}
          />

          {/* Match slot cards */}
          {cols.map(({ col, round, matches: colMatches }) =>
            colMatches.map((match, i) => {
              const topY = col === 4
                ? (TH - CH) / 2   // center Final vertically
                : ty(round, i)

              return (
                <div
                  key={`c${col}i${i}`}
                  className="absolute"
                  style={{ left: cx(col), top: topY + LBL_H }}
                >
                  <SlotCard
                    match={match}
                    pred={match ? predMap.get(match.id) : undefined}
                    onClick={() => match && setSelected(match)}
                  />
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Prediction modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6"
          onClick={handleClose}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="relative z-10 w-full max-w-sm"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-end mb-2">
              <button
                onClick={handleClose}
                className="text-xs font-display tracking-widest uppercase text-white/50 hover:text-wc-light-gray"
              >
                Stäng ✕
              </button>
            </div>
            <KnockoutCard
              match={selected}
              prediction={predMap.get(selected.id)}
            />
          </div>
        </div>
      )}
    </>
  )
}
