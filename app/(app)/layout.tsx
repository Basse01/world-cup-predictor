import { redirect } from 'next/navigation'
import { createClient, getUser } from '@/lib/supabase/server'
import Nav from '@/components/nav'
import PushInit from '@/components/push-init'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser()
  if (!user) redirect('/login')

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, onboarding_completed, display_name')
    .eq('id', user.id)
    .single()

  if (profile && !profile.onboarding_completed) redirect('/onboarding')

  return (
    <div className="min-h-screen">
      <Nav isAdmin={profile?.is_admin ?? false} userId={user.id} displayName={profile?.display_name ?? ''} />
      <PushInit />
      <main className="max-w-5xl mx-auto px-4 py-6 pb-24 sm:pb-6">
        {children}
      </main>
    </div>
  )
}
