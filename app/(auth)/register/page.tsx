'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const INPUT_CLASS =
  'w-full bg-[#0d0d0d] border border-[#252525] rounded-xl px-4 py-3.5 ' +
  'text-base font-body text-wc-light-gray placeholder-[#3d3d3d] ' +
  'focus:outline-none transition-all duration-200 ' +
  'hover:border-[#333] ' +
  'focus:border-wc-red/50 focus:shadow-[0_0_0_1px_rgba(230,29,37,0.2),0_0_20px_rgba(230,29,37,0.08)]'

export default function RegisterPage() {
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    const trimmedName = displayName.trim()
    if (!trimmedName) {
      setError('Ange ett smeknamn')
      return
    }
    if (password.length < 6) {
      setError('Lösenordet måste vara minst 6 tecken')
      return
    }
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: trimmedName } },
    })
    if (error) {
      setError('Något gick fel. Försök igen.')
      setLoading(false)
      return
    }
    if (!data.session) {
      setError('Kolla din e-post för att bekräfta ditt konto.')
      setLoading(false)
      return
    }
    router.push('/onboarding')
    router.refresh()
  }

  return (
    <form onSubmit={handleRegister} className="space-y-3">
      <div style={{ animation: 'fade-up 0.4s ease-out 0.65s both' }}>
        <input
          type="text"
          placeholder="Smeknamn"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          required
          maxLength={20}
          className={INPUT_CLASS}
        />
      </div>

      <div style={{ animation: 'fade-up 0.4s ease-out 0.73s both' }}>
        <input
          type="email"
          placeholder="E-post"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className={INPUT_CLASS}
        />
      </div>

      <div style={{ animation: 'fade-up 0.4s ease-out 0.81s both' }} className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          placeholder="Lösenord (min 6 tecken)"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          className={INPUT_CLASS + ' pr-12'}
        />
        <button
          type="button"
          onClick={() => setShowPassword(v => !v)}
          aria-label={showPassword ? 'Dölj lösenord' : 'Visa lösenord'}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
        >
          {showPassword ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>

      {error && (
        <p
          className="text-wc-red text-xs text-center pt-1"
          style={{ animation: 'shake 0.3s ease-in-out' }}
        >
          {error}
        </p>
      )}

      <div style={{ animation: 'fade-up 0.4s ease-out 0.9s both' }} className="pt-1">
        <button
          type="submit"
          disabled={loading}
          className="relative w-full overflow-hidden rounded-xl py-4 text-white font-display
                     tracking-[0.18em] text-base uppercase
                     transition-all duration-150
                     hover:scale-[1.02] hover:shadow-[0_8px_32px_rgba(230,29,37,0.45)]
                     active:scale-[0.98]
                     disabled:opacity-50 disabled:cursor-not-allowed
                     disabled:hover:scale-100 disabled:hover:shadow-none
                     group"
          style={{ background: 'linear-gradient(135deg, #E61D25 0%, #c4151c 100%)' }}
        >
          {/* Shine sweep */}
          <span
            className="-left-full absolute inset-y-0 w-[60%]
                       bg-gradient-to-r from-transparent via-white/20 to-transparent
                       -skew-x-12
                       group-hover:translate-x-[350%]
                       transition-transform duration-500 ease-out
                       pointer-events-none"
          />
          <span className="relative flex items-center justify-center gap-2">
            {loading ? (
              <>
                <span className="inline-block h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Skapar konto...
              </>
            ) : (
              'Skapa konto'
            )}
          </span>
        </button>
      </div>

      <p
        className="text-center text-[#444] text-xs pt-2"
        style={{ animation: 'fade-up 0.4s ease-out 1s both' }}
      >
        Har du ett konto?{' '}
        <Link
          href="/login"
          className="text-wc-red/60 hover:text-wc-red transition-colors duration-150"
        >
          Logga in
        </Link>
      </p>
    </form>
  )
}
