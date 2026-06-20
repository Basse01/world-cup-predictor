import { createClient, getUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LeaderboardTable from '@/components/leaderboard-table'
import type { Standing } from '@/lib/types'

export default async function LeaderboardPage() {
  const [supabase, user] = await Promise.all([createClient(), getUser()])
  if (!user) redirect('/login')

  const { data: standings } = await supabase
    .from('standings')
    .select('*')
    .order('rank')
    .limit(100)

  return (
    <div>
      <h1 className="font-display text-4xl text-wc-light-gray mb-6 uppercase tracking-wide">
        Tabell
      </h1>
      <LeaderboardTable initial={(standings ?? []) as Standing[]} userId={user.id} />
    </div>
  )
}
