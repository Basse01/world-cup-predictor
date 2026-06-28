'use client'
import { useState } from 'react'
import type { Match, Prediction, WinnerPick } from '@/lib/types'
import { isMatchLocked } from '@/lib/points'
import { STAGE_LABELS, teamDisplay, actualWinner } from '@/lib/knockout'

interface KnockoutCardProps {
  match: Match
  prediction?: Prediction
  preview?: boolean
  onPickChange?: (
    matchId: string,
    hasPick: boolean,
    values?: Pick<Prediction, 'winner_pick' | 'home_score' | 'away_score'>,
  ) => void
}

function Flag({ url, size = 32, dim }: { url: string | null; size?: number; dim?: boolean }) {
  if (!url) return <div style={{ width: size, height: size }} className="rounded-full bg-[#262626]" />
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" style={{ width: size, height: size }} className={`rounded-full object-cover ${dim ? 'opacity-40 grayscale' : ''}`} />
}

export default function KnockoutCard({ match, prediction, preview, onPickChange }: KnockoutCardProps) {
  const [winnerPick, setWinnerPick] = useState<WinnerPick | null>(prediction?.winner_pick ?? null)
  const [homeScore, setHomeScore] = useState<string>(prediction?.home_score?.toString() ?? '')
  const [awayScore, setAwayScore] = useState<string>(prediction?.away_score?.toString() ?? '')
  const [saving, setSaving] = useState(false)
  const [shake, setShake] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const locked = isMatchLocked(match.lock_at)
  const finished = match.status === 'finished'

  const home = teamDisplay(match.home_team, match.home_team_logo)
  const away = teamDisplay(match.away_team, match.away_team_logo)
  const stageFull = STAGE_LABELS[match.stage]?.full ?? match.stage

  const kickoff = new Date(match.kickoff_at)
  const kickoffStr = kickoff.toLocaleDateString('sv-SE', {
    weekday: 'short', month: 'short', day: 'numeric', timeZone: 'Europe/Stockholm',
  }) + ' ' + kickoff.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Stockholm' })

  async function handleSave() {
    if (locked || saving) return
    if (!winnerPick) {
      setError('Välj vilket lag som går vidare.')
      setShake(true)
      setTimeout(() => setShake(false), 400)
      return
    }
    // An empty score box counts as 0 (matching the "0" placeholder shown), so a
    // 0–1 guess saves exactly as written even if a box was left untouched.
    const values = {
      winner_pick: winnerPick,
      home_score: homeScore === '' ? 0 : parseInt(homeScore),
      away_score: awayScore === '' ? 0 : parseInt(awayScore),
    }

    // The result must not contradict who you picked to advance. A draw is fine
    // (penalties decide, and your winner pick says who goes through), but you
    // can't pick home to advance and then enter a result the away team wins.
    const contradicts =
      (winnerPick === 'home' && values.home_score < values.away_score) ||
      (winnerPick === 'away' && values.away_score < values.home_score)
    if (contradicts) {
      const adv = winnerPick === 'home' ? home : away
      setError(`Resultatet ger motståndaren fler mål än ${adv.name}. Ändra resultatet eller vinnarvalet (oavgjort = straffar är ok).`)
      setShake(true)
      setTimeout(() => setShake(false), 400)
      return
    }

    setError(null)
    setSaving(true)
    setSaved(false)
    const fail = () => { setShake(true); setTimeout(() => setShake(false), 400) }

    if (preview) {
      setSaved(true); setSaving(false)
      onPickChange?.(match.id, true, values)
      return
    }
    try {
      const res = await fetch('/api/predictions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_id: match.id, ...values }),
      })
      if (res.ok) { setSaved(true); onPickChange?.(match.id, true, values) }
      else fail()
    } catch { fail() } finally { setSaving(false) }
  }

  function setScore(setter: (v: string) => void, raw: string) {
    if (locked) return
    setSaved(false); setError(null)
    const v = parseInt(raw)
    setter(isNaN(v) ? '' : String(Math.max(0, Math.min(20, v))))
  }

  function pickWinner(side: WinnerPick) {
    if (locked) return
    setSaved(false); setError(null)
    setWinnerPick(side)
  }

  // ── Locked / finished: read-only summary ──────────────────────────────────
  if (locked) {
    const yourWin = prediction?.winner_pick ?? null
    const realWin = finished ? actualWinner(match) : null
    return (
      <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a]">
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-display tracking-widest text-wc-blue uppercase">{stageFull}</span>
          <span className="text-xs text-white/50">{finished ? 'Slutresultat' : `🔒 ${kickoffStr}`}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex flex-col items-center gap-1.5 w-24">
            <Flag url={home.flagUrl} dim={finished && realWin === 'away'} />
            <span className={`font-display text-sm text-center leading-tight ${finished && realWin === 'away' ? 'text-white/40 line-through' : 'text-wc-light-gray'}`}>{home.name}</span>
          </div>
          <div className="text-center">
            <div className="font-display text-3xl text-wc-light-gray">
              {finished ? `${match.home_score}–${match.away_score}` : '–'}
            </div>
            {finished && <div className="text-[10px] text-white/40 uppercase tracking-widest">Facit</div>}
          </div>
          <div className="flex flex-col items-center gap-1.5 w-24">
            <Flag url={away.flagUrl} dim={finished && realWin === 'home'} />
            <span className={`font-display text-sm text-center leading-tight ${finished && realWin === 'home' ? 'text-white/40 line-through' : 'text-wc-light-gray'}`}>{away.name}</span>
          </div>
        </div>

        {prediction ? (
          <div className="mt-4 pt-3 border-t border-[#2a2a2a] flex items-center justify-between text-sm">
            <span className="text-white/50">
              Ditt tips: <span className="text-wc-light-gray font-display">{prediction.home_score}–{prediction.away_score}</span>
              {yourWin && <span className="text-white/40"> · {yourWin === 'home' ? home.abbr : away.abbr} vidare</span>}
            </span>
            {finished && (
              <span className={`font-display ${(prediction.points_awarded ?? 0) > 0 ? 'text-wc-green' : 'text-white/30'}`}>
                {(prediction.points_awarded ?? 0) > 0 ? `+${prediction.points_awarded}p` : '0p'}
              </span>
            )}
          </div>
        ) : (
          <p className="mt-4 pt-3 border-t border-[#2a2a2a] text-sm text-white/40 text-center">Du tippade inte den här matchen.</p>
        )}
      </div>
    )
  }

  // ── Open: clear 2-step tipping ────────────────────────────────────────────
  const TeamPick = ({ side, t }: { side: WinnerPick; t: typeof home }) => {
    const sel = winnerPick === side
    const selClasses = side === 'home' ? 'border-wc-blue bg-wc-blue/10' : 'border-wc-red bg-wc-red/10'
    return (
      <button
        onClick={() => pickWinner(side)}
        aria-pressed={sel}
        aria-label={`Välj ${t.name} som vinnare`}
        className={`flex-1 min-h-[64px] rounded-xl border-2 px-2 py-3 flex flex-col items-center gap-1.5 transition-all active:scale-[0.97]
          ${sel ? selClasses : 'border-[#2a2a2a] hover:border-wc-dark-gray'}`}
      >
        <Flag url={t.flagUrl} size={34} />
        <span className="font-display text-sm text-wc-light-gray text-center leading-tight">{t.name}</span>
        <span className={`text-[10px] font-display tracking-widest uppercase ${sel ? (side === 'home' ? 'text-wc-blue' : 'text-wc-red') : 'text-white/30'}`}>
          {sel ? '✓ Vidare' : 'Välj'}
        </span>
      </button>
    )
  }

  return (
    <div className={`bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a] ${shake ? 'animate-shake' : ''}`}>
      <div className="flex justify-between items-center mb-4">
        <span className="text-xs font-display tracking-widest text-wc-blue uppercase">{stageFull}</span>
        <span className="text-xs text-white/50">{kickoffStr}</span>
      </div>

      {/* Step 1 — winner */}
      <p className="font-display text-xs tracking-widest text-white/60 uppercase mb-2">
        <span className="text-wc-red">1.</span> Vem går vidare?
      </p>
      <div className="flex gap-2.5 mb-5">
        <TeamPick side="home" t={home} />
        <TeamPick side="away" t={away} />
      </div>

      {/* Step 2 — score */}
      <p className="font-display text-xs tracking-widest text-white/60 uppercase mb-2">
        <span className="text-wc-red">2.</span> Resultat efter full tid
      </p>
      <div className="flex items-center justify-center gap-3 mb-1.5">
        <Flag url={home.flagUrl} size={24} />
        <input
          type="number" inputMode="numeric" min={0} max={20} value={homeScore}
          onChange={e => setScore(setHomeScore, e.target.value)} placeholder="0" aria-label={`Mål ${home.name}`}
          className="w-14 text-center font-display text-2xl bg-[#111] border border-wc-dark-gray rounded-lg py-3 min-h-[48px] text-wc-light-gray focus:outline-none focus:border-wc-blue"
        />
        <span className="font-display text-2xl text-white/40">–</span>
        <input
          type="number" inputMode="numeric" min={0} max={20} value={awayScore}
          onChange={e => setScore(setAwayScore, e.target.value)} placeholder="0" aria-label={`Mål ${away.name}`}
          className="w-14 text-center font-display text-2xl bg-[#111] border border-wc-dark-gray rounded-lg py-3 min-h-[48px] text-wc-light-gray focus:outline-none focus:border-wc-red"
        />
        <Flag url={away.flagUrl} size={24} />
      </div>
      <p className="text-[11px] text-white/35 text-center mb-4">Efter 90 min + ev. förlängning (straffar räknas inte i resultatet). Går matchen till straffar avgör ditt val i steg 1 vem som gått vidare.</p>

      {/* Points rule */}
      <div className="mb-4 text-center">
        <div className="flex items-center justify-center gap-2 text-[11px] font-display tracking-wide">
          <span className="bg-[#222] text-wc-light-gray px-2.5 py-1 rounded-md">✓ Rätt vinnare = 2p + pott</span>
          <span className="bg-wc-green/10 text-wc-green px-2.5 py-1 rounded-md">🎯 Exakt = +5p</span>
        </div>
        <p className="text-[11px] text-white/35 mt-1.5">Ju färre som tippar samma vinnare som du, desto större pott — upp till ~10p.</p>
      </div>

      {error && <p className="text-xs text-wc-red text-center mb-2">{error}</p>}

      <button
        onClick={handleSave} disabled={saving}
        className={`w-full font-display tracking-widest py-3 min-h-[48px] rounded-lg transition-colors text-sm uppercase disabled:opacity-50
          ${saved ? 'bg-wc-green/20 text-wc-green border border-wc-green/40' : 'bg-wc-green hover:bg-green-700 text-white'}`}
      >
        {saving ? 'Sparar...' : saved ? '✓ Tips sparat' : 'Spara tips'}
      </button>
    </div>
  )
}
