import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminPanel from './admin-panel'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) redirect('/dashboard')

  const [{ data: profiles }, { data: matches }, { data: bonusTypes }] = await Promise.all([
    supabase.from('profiles').select('id, display_name, paid').order('display_name'),
    supabase.from('matches').select('id, home_team, away_team, kickoff_at, home_score, away_score, status')
      .order('kickoff_at'),
    supabase.from('bonus_types').select('*'),
  ])

  return (
    <div>
      <h1 className="font-display text-4xl text-wc-red mb-6 uppercase tracking-wide">
        Admin
      </h1>
      <AdminPanel
        profiles={profiles ?? []}
        matches={matches ?? []}
        bonusTypes={bonusTypes ?? []}
      />
    </div>
  )
}
