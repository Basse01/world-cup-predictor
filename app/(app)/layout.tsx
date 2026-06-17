import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Nav from '@/components/nav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen">
      <Nav isAdmin={profile?.is_admin ?? false} />
      <main className="max-w-5xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
