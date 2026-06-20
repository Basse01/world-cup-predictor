import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import BonusForm from '@/components/bonus-form'
import type { BonusType, BonusPrediction, BonusOption } from '@/lib/types'

function fmtShort(iso: string) {
  return new Date(iso).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })
}

const STAGE_LABELS: Record<string, string> = {
  round_of_32: 'Omgång 32',
  round_of_16: 'Åttondelsfinaler',
  quarter_final: 'Kvartsfinaler',
  semi_final: 'Semifinaler',
  third_place: 'Bronsmatch',
  final: 'Final',
}

interface PredWithMatch {
  id: string
  match_id: string
  pick: string | null
  home_score: number | null
  away_score: number | null
  winner_pick: string | null
  points_awarded: number
  matches: {
    home_team: string
    away_team: string
    home_score: number | null
    away_score: number | null
    status: string
    stage: string
    kickoff_at: string
    group_name: string | null
  } | null
}

export default async function ProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { userId } = await params

  const [
    { data: profile },
    { data: standing },
    { data: bonusPreds },
    { data: preds },
    { data: bonusTypes },
    { data: bonusOptions },
  ] = await Promise.all([
    supabase.from('profiles').select('display_name').eq('id', userId).single(),
    supabase.from('standings').select('total_points, rank').eq('user_id', userId).single(),
    supabase.from('bonus_predictions').select('*').eq('user_id', userId),
    supabase.from('predictions')
      .select('id, match_id, pick, home_score, away_score, winner_pick, points_awarded, matches(home_team, away_team, home_score, away_score, status, stage, kickoff_at, group_name)')
      .eq('user_id', userId),
    supabase.from('bonus_types').select('*').order('type'),
    supabase.from('bonus_options').select('*').order('sort_order'),
  ])

  if (!profile) notFound()

  const isMe = user.id === userId
  const allPreds = (preds ?? []) as unknown as PredWithMatch[]
  const totalPreds = allPreds.length
  const correctPreds = allPreds.filter(p => (p.points_awarded ?? 0) > 0).length
  const bonusPointsTotal = bonusPreds?.reduce((sum, b) => sum + (b.points_awarded ?? 0), 0) ?? 0

  const historyPreds = allPreds
    .filter(p => p.matches && p.matches.status === 'finished')
    .sort((a, b) => new Date(b.matches!.kickoff_at).getTime() - new Date(a.matches!.kickoff_at).getTime())

  const medalMap: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }
  const rank = standing?.rank ?? null
  const medal = rank && rank <= 3 ? medalMap[rank] : null

  const predMap = new Map((bonusPreds ?? []).map(p => [p.type, p]))
  const optionsByType = new Map<string, BonusOption[]>()
  for (const opt of (bonusOptions ?? []) as BonusOption[]) {
    if (!optionsByType.has(opt.type)) optionsByType.set(opt.type, [])
    optionsByType.get(opt.type)!.push(opt)
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* Header */}
      <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-[#2a2a2a]">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="font-display text-3xl text-wc-light-gray uppercase tracking-wide">
                {profile.display_name}
              </h1>
              {medal && <span className="text-2xl">{medal}</span>}
            </div>
            {isMe && (
              <span className="text-xs text-wc-blue font-display tracking-wider uppercase">
                Din profil
              </span>
            )}
          </div>
          {rank && (
            <div className="text-right">
              <div className="text-3xl font-display text-wc-light-gray">
                #{rank}
              </div>
              <div className="text-xs text-wc-dark-gray">placering</div>
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="mt-4 pt-4 border-t border-[#2a2a2a] flex flex-wrap gap-4 sm:gap-6">
          <div>
            <div className="text-2xl font-display text-wc-green">
              {standing?.total_points ?? 0}
            </div>
            <div className="text-xs text-wc-dark-gray">totala poäng</div>
          </div>
          <div>
            <div className="text-2xl font-display text-wc-light-gray">
              {correctPreds}/{totalPreds}
            </div>
            <div className="text-xs text-wc-dark-gray">rätta tips</div>
          </div>
          {bonusPointsTotal > 0 && (
            <div>
              <div className="text-2xl font-display text-wc-blue">
                +{bonusPointsTotal}
              </div>
              <div className="text-xs text-wc-dark-gray">bonuspoäng</div>
            </div>
          )}
        </div>
      </div>

      {/* Bonus section — editable if own profile, read-only otherwise */}
      {isMe ? (
        <div className="space-y-3">
          <h2 className="font-display text-sm uppercase tracking-widest text-wc-dark-gray px-1">
            Bonusgissningar
          </h2>
          {(bonusTypes ?? []).length === 0 ? (
            <div className="bg-[#1a1a1a] rounded-xl p-5 border border-[#2a2a2a] text-center">
              <p className="text-wc-dark-gray text-sm">Inga bonusfrågor har lagts till än.</p>
            </div>
          ) : (
            (bonusTypes ?? []).map((bt: BonusType) => (
              <BonusForm
                key={bt.type}
                bonusType={bt}
                existing={predMap.get(bt.type) as BonusPrediction | undefined}
                options={optionsByType.get(bt.type)}
              />
            ))
          )}
        </div>
      ) : (
        bonusPreds && bonusPreds.length > 0 && (
          <div className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] overflow-hidden">
            <div className="px-5 py-3 border-b border-[#2a2a2a]">
              <h2 className="font-display text-sm uppercase tracking-widest text-wc-dark-gray">
                Bonusgissningar
              </h2>
            </div>
            <div className="divide-y divide-[#252525]">
              {bonusPreds.map(b => {
                const label = (bonusTypes ?? []).find(bt => bt.type === b.type)?.label ?? b.type
                const earnedPoints = b.points_awarded ?? 0
                const expectedPoints = (bonusTypes ?? []).find(bt => bt.type === b.type)?.points ?? null

                return (
                  <div key={b.type} className="px-5 py-3.5 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-wc-dark-gray mb-0.5">{label}</div>
                      <div className="text-wc-light-gray font-medium">{b.value || '—'}</div>
                    </div>
                    <div className="text-right">
                      {earnedPoints > 0 ? (
                        <span className="text-wc-green font-display text-sm">+{earnedPoints}p ✓</span>
                      ) : expectedPoints ? (
                        <span className="text-wc-dark-gray font-display text-sm">+{expectedPoints}p</span>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      )}

      {/* Prediction history */}
      <div className="space-y-3">
        <h2 className="font-display text-sm uppercase tracking-widest text-wc-dark-gray px-1">
          Tippningshistorik {historyPreds.length > 0 && <span className="text-[#484848]">({historyPreds.length})</span>}
        </h2>
        {historyPreds.length === 0 ? (
          <div className="bg-[#1a1a1a] rounded-xl p-5 border border-[#2a2a2a] text-center">
            <p className="text-wc-dark-gray text-sm">Inga tips lämnade än.</p>
          </div>
        ) : (
          <div className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] overflow-hidden">
            <div className="divide-y divide-[#252525]">
              {historyPreds.map(pred => {
                const m = pred.matches!
                const isGroup = m.stage === 'group'
                const isFinished = m.status === 'finished'
                const isLive = m.status === 'live'
                const pts = pred.points_awarded ?? 0
                const correct = isFinished && pts > 0

                const pickBadge = isGroup
                  ? pred.pick
                  : pred.home_score != null && pred.away_score != null
                    ? `${pred.home_score}–${pred.away_score}`
                    : '—'

                const pickColor = isFinished
                  ? correct
                    ? 'bg-wc-green/15 text-wc-green'
                    : 'bg-wc-red/10 text-[#484848]'
                  : pred.pick === '1'
                    ? 'bg-wc-blue/15 text-wc-blue'
                    : pred.pick === 'X'
                      ? 'bg-wc-green/15 text-wc-green'
                      : pred.pick === '2'
                        ? 'bg-wc-red/15 text-wc-red'
                        : 'bg-[#252525] text-wc-dark-gray'

                const contextLabel = isGroup
                  ? `Grupp ${m.group_name}`
                  : STAGE_LABELS[m.stage] ?? m.stage

                return (
                  <div key={pred.id} className="px-4 py-3 flex items-center gap-2.5">
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] text-wc-dark-gray mb-0.5">
                        {fmtShort(m.kickoff_at)} · {contextLabel}
                      </div>
                      <div className="text-sm text-wc-light-gray truncate">
                        {m.home_team} <span className="text-wc-dark-gray">–</span> {m.away_team}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Pick badge */}
                      <span className={`text-xs font-display px-2 py-0.5 rounded-lg ${pickColor}`}>
                        {pickBadge}
                      </span>
                      {/* Actual result */}
                      {isFinished && m.home_score != null && (
                        <span className="text-xs text-wc-dark-gray font-display w-8 text-center">
                          {m.home_score}–{m.away_score}
                        </span>
                      )}
                      {isLive && (
                        <span className="text-[10px] text-wc-green animate-pulse">LIVE</span>
                      )}
                      {/* Points */}
                      {isFinished && (
                        <span className={`text-xs font-display font-bold w-7 text-right ${correct ? 'text-wc-green' : 'text-[#3a3a3a]'}`}>
                          {correct ? `+${pts}` : '0'}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Back link */}
      <div className="text-center pb-4">
        <Link
          href="/leaderboard"
          className="text-xs text-wc-dark-gray hover:text-wc-light-gray transition-colors"
        >
          ← Visa hela tabellen
        </Link>
      </div>
    </div>
  )
}
