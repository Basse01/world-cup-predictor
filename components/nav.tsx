'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const links = [
  { href: '/dashboard', label: 'Hem' },
  { href: '/tips/gruppspel', label: 'Gruppspel' },
  { href: '/tips/slutspel', label: 'Slutspel' },
  { href: '/bonus', label: 'Bonus' },
  { href: '/leaderboard', label: 'Tabell' },
  { href: '/chat', label: 'Chatt' },
]

export default function Nav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname()
  const router = useRouter()

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="bg-[#0a0a0a] border-b border-wc-dark-gray sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
        <Link href="/dashboard" className="font-display text-2xl text-wc-red tracking-wider">
          VM 2026
        </Link>
        <div className="flex items-center gap-1 overflow-x-auto">
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 rounded text-sm font-medium whitespace-nowrap transition-colors ${
                pathname === link.href
                  ? 'bg-wc-blue text-white'
                  : 'text-wc-dark-gray hover:text-wc-light-gray'
              }`}
            >
              {link.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              href="/admin"
              className={`px-3 py-1.5 rounded text-sm font-medium whitespace-nowrap transition-colors ${
                pathname === '/admin' ? 'bg-wc-red text-white' : 'text-wc-red hover:text-red-400'
              }`}
            >
              Admin
            </Link>
          )}
          <button
            onClick={signOut}
            className="ml-2 px-3 py-1.5 text-sm text-wc-dark-gray hover:text-wc-red transition-colors"
          >
            Logga ut
          </button>
        </div>
      </div>
    </nav>
  )
}
