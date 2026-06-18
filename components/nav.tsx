'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function GridIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}

function TrophyIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" />
    </svg>
  )
}

function StarIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

function ListIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  )
}

function ChatIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

const navLinks = [
  { href: '/dashboard', label: 'Hem', Icon: HomeIcon },
  { href: '/tips/gruppspel', label: 'Grupp', Icon: GridIcon },
  { href: '/tips/slutspel', label: 'Slutspel', Icon: TrophyIcon },
  { href: '/bonus', label: 'Bonus', Icon: StarIcon },
  { href: '/leaderboard', label: 'Tabell', Icon: ListIcon },
  { href: '/chat', label: 'Chatt', Icon: ChatIcon },
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

  const allLinks = isAdmin
    ? [...navLinks, { href: '/admin', label: 'Admin', Icon: SettingsIcon }]
    : navLinks

  return (
    <>
      {/* ── Desktop: sticky top nav ─────────────────────────────── */}
      <nav className="hidden sm:block bg-[#0a0a0a] border-b border-wc-dark-gray sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
          <Link href="/dashboard" className="font-display text-2xl text-wc-red tracking-wider">
            VM 2026
          </Link>
          <div className="flex items-center gap-1 overflow-x-auto">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 rounded text-sm font-medium whitespace-nowrap transition-colors ${
                  pathname === href
                    ? 'bg-wc-blue text-white'
                    : 'text-wc-dark-gray hover:text-wc-light-gray'
                }`}
              >
                {label}
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

      {/* ── Mobile: slim top bar with logo + sign-out ───────────── */}
      <div className="sm:hidden sticky top-0 z-50 flex items-center justify-between px-4 h-12 bg-[#0a0a0a] border-b border-[#1a1a1a]">
        <Link href="/dashboard" className="font-display text-xl text-wc-red tracking-wider">
          VM 2026
        </Link>
        <button
          onClick={signOut}
          aria-label="Logga ut"
          className="flex items-center justify-center w-11 h-11 text-[#555] active:text-wc-red transition-colors"
        >
          <LogoutIcon />
        </button>
      </div>

      {/* ── Mobile: fixed bottom tab bar ────────────────────────── */}
      <nav
        className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a0a] border-t border-[#1a1a1a]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="grid h-14" style={{ gridTemplateColumns: `repeat(${allLinks.length}, 1fr)` }}>
          {allLinks.map(({ href, label, Icon }) => {
            const isActive = pathname === href
            const isAdminLink = href === '/admin'
            const activeColor = isAdminLink ? 'text-wc-red' : 'text-wc-blue'
            const activeBar = isAdminLink ? 'bg-wc-red' : 'bg-wc-blue'
            return (
              <Link
                key={href}
                href={href}
                className={`relative flex flex-col items-center justify-center gap-[3px] transition-all active:opacity-60 ${
                  isActive ? activeColor : 'text-[#484848]'
                }`}
              >
                {isActive && (
                  <span className={`absolute top-0 left-1/2 -translate-x-1/2 w-7 h-[3px] rounded-b-full ${activeBar}`} />
                )}
                <Icon />
                <span className="text-[10px] font-medium leading-none tracking-wide">{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
