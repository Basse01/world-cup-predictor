import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/server'

export default async function SlutspelPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-4">
      <h1 className="font-display text-4xl text-wc-light-gray uppercase tracking-wide">
        Slutspel
      </h1>
      <div className="inline-flex items-center gap-2 bg-wc-blue/10 border border-wc-blue/30 text-wc-blue text-sm font-medium px-5 py-2.5 rounded-full">
        <span className="inline-block w-2 h-2 rounded-full bg-wc-blue animate-pulse" />
        Kommer snart
      </div>
      <p className="text-sm text-white/50 max-w-xs">
        Slutspelets bracket öppnar när gruppspelet är klart.
      </p>
    </div>
  )
}
