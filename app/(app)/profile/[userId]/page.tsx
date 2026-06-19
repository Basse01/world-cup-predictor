import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'

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
  ] = await Promise.all([
    supabase.from('profiles').select('display_name').eq('id', userId).single(),
    supabase.from('standings').select('total_points, rank').eq('user_id', userId).single(),
    supabase
      .from('bonus_predictions')
      .select('type, value, points_awarded, locked_points, bonus_types(label)')
      .eq('user_id', userId),
    supabase
      .from('predictions')
      .select('id, points_awarded')
      .eq('user_id', userId),
  ])

  if (!profile) notFound()

  const isMe = user.id === userId
  const totalPreds = preds?.length ?? 0
  const correctPreds = preds?.filter(p => (p.points_awarded ?? 0) > 0).length ?? 0
  const bonusPointsTotal = bonusPreds?.reduce((sum, b) => sum + (b.points_awarded ?? 0), 0) ?? 0

  const medalMap: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }
  const rank = standing?.rank ?? null
  const medal = rank && rank <= 3 ? medalMap[rank] : null

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
                Det här är du
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

        {/* Points row */}
        <div className="mt-4 pt-4 border-t border-[#2a2a2a] flex gap-6">
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

      {/* Bonus predictions */}
      {bonusPreds && bonusPreds.length > 0 && (
        <div className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] overflow-hidden">
          <div className="px-5 py-3 border-b border-[#2a2a2a]">
            <h2 className="font-display text-sm uppercase tracking-widest text-wc-dark-gray">
              Bonusgissningar
            </h2>
          </div>
          <div className="divide-y divide-[#252525]">
            {bonusPreds.map(b => {
              const bt = b.bonus_types as { label: string } | { label: string }[] | null
              const label = (Array.isArray(bt) ? bt[0]?.label : bt?.label) ?? b.type
              const earnedPoints = b.points_awarded ?? 0
              const expectedPoints = b.locked_points ?? null

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
      )}

      {/* Empty bonus state */}
      {(!bonusPreds || bonusPreds.length === 0) && (
        <div className="bg-[#1a1a1a] rounded-2xl p-5 border border-[#2a2a2a] text-center">
          <p className="text-wc-dark-gray text-sm">Inga bonusgissningar än.</p>
        </div>
      )}

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
