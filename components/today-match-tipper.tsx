'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Match, Prediction } from '@/lib/types'
import KnockoutMatchSheet from './knockout-match-sheet'

function fmtDay(iso: string) {
  const ko = new Date(iso)
  const isToday =
    ko.toLocaleDateString('sv-SE', { timeZone: 'Europe/Stockholm' }) ===
    new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Stockholm' })
  return {
    dayLabel: isToday
      ? 'Idag'
      : ko.toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Stockholm' }),
    time: ko.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Stockholm' }),
  }
}

function rowClass(hasPred: boolean) {
  return `w-full text-left rounded-xl px-4 py-4 flex items-center transition-all active:scale-[0.99] ${
    hasPred
      ? 'bg-[#1a1a1a] border border-[#252525] hover:bg-[#1e1e1e]'
      : 'bg-[#111a24] border border-wc-blue/40 hover:border-wc-blue/70 hover:bg-[#131e2a]'
  }`
}

function RowInner({ m, hasPred }: { m: Match; hasPred: boolean }) {
  const { dayLabel, time } = fmtDay(m.kickoff_at)
  return (
    <>
      <div className="w-[62px] flex-shrink-0" aria-hidden="true" />
      <div className="flex-1 flex items-center justify-center gap-5">
        {m.home_team_logo
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={m.home_team_logo} alt={m.home_team} title={m.home_team} className="w-10 h-10 object-contain flex-shrink-0" />
          : <div className="w-10 h-10 bg-white/10 rounded-full flex-shrink-0" />}
        <div className="text-center">
          <div className="text-[10px] text-white/40 uppercase tracking-widest font-display">{dayLabel}</div>
          <div className="font-display text-xl text-wc-light-gray leading-tight">{time}</div>
        </div>
        {m.away_team_logo
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={m.away_team_logo} alt={m.away_team} title={m.away_team} className="w-10 h-10 object-contain flex-shrink-0" />
          : <div className="w-10 h-10 bg-white/10 rounded-full flex-shrink-0" />}
      </div>
      <div className="w-[62px] flex-shrink-0 flex justify-end">
        {hasPred
          ? <span className="text-wc-green text-lg">✓</span>
          : <span className="bg-wc-blue text-white text-xs font-display tracking-widest uppercase px-3 py-1.5 rounded-lg whitespace-nowrap">Tippa</span>}
      </div>
    </>
  )
}

export default function TodayMatchTipper({ matches, predictions }: { matches: Match[]; predictions: Prediction[] }) {
  const router = useRouter()
  const [openId, setOpenId] = useState<string | null>(null)
  const [preds, setPreds] = useState<Record<string, Prediction>>(
    () => Object.fromEntries(predictions.map(p => [p.match_id, p])),
  )

  // Keep in sync with server truth after a refresh.
  useEffect(() => {
    setPreds(Object.fromEntries(predictions.map(p => [p.match_id, p])))
  }, [predictions])

  const open = openId ? matches.find(m => m.id === openId) : undefined

  function handlePick(
    matchId: string,
    hasPick: boolean,
    values?: Pick<Prediction, 'winner_pick' | 'home_score' | 'away_score'>,
  ) {
    setPreds(prev => {
      const next = { ...prev }
      if (hasPick) {
        next[matchId] = {
          ...(prev[matchId] ?? { id: `local-${matchId}`, user_id: 'me', match_id: matchId, pick: null, points_awarded: 0 }),
          winner_pick: values?.winner_pick ?? null,
          home_score: values?.home_score ?? null,
          away_score: values?.away_score ?? null,
        } as Prediction
      } else delete next[matchId]
      return next
    })
    // Refresh server-rendered progress bars / counts.
    router.refresh()
  }

  if (matches.length === 0) {
    return <p className="text-white/50 text-sm">Inga fler matcher idag — nästa matchdag börjar 08:00.</p>
  }

  return (
    <div className="space-y-2">
      {matches.map(m => {
        const hasPred = !!preds[m.id]
        // Group matches still go to the group page (inline 1X2 tipping lives there);
        // knockout matches open the tipping sheet right here on the dashboard.
        return m.stage === 'group' ? (
          <Link key={m.id} href={`/tips/gruppspel/${m.group_name}#${m.id}`} className={rowClass(hasPred)}>
            <RowInner m={m} hasPred={hasPred} />
          </Link>
        ) : (
          <button key={m.id} onClick={() => setOpenId(m.id)} className={rowClass(hasPred)}>
            <RowInner m={m} hasPred={hasPred} />
          </button>
        )
      })}

      {open && (
        <KnockoutMatchSheet
          match={open}
          prediction={preds[open.id]}
          onClose={() => setOpenId(null)}
          onPickChange={handlePick}
        />
      )}
    </div>
  )
}
