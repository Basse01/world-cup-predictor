'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const INPUT_CLASS =
  'w-full bg-[#0d0d0d] border border-[#252525] rounded-xl px-4 py-3.5 ' +
  'text-wc-light-gray placeholder-[#3d3d3d] text-sm font-body ' +
  'focus:outline-none transition-all duration-200 ' +
  'hover:border-[#333] ' +
  'focus:border-wc-red/50 focus:shadow-[0_0_0_1px_rgba(230,29,37,0.2),0_0_20px_rgba(230,29,37,0.08)]'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Fel e-post eller lösenord')
      setLoading(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={handleLogin} className="space-y-3">
      <div style={{ animation: 'fade-up 0.4s ease-out 0.65s both' }}>
        <input
          type="email"
          placeholder="E-post"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className={INPUT_CLASS}
        />
      </div>

      <div style={{ animation: 'fade-up 0.4s ease-out 0.75s both' }}>
        <input
          type="password"
          placeholder="Lösenord"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          className={INPUT_CLASS}
        />
      </div>

      {error && (
        <p
          className="text-wc-red text-xs text-center pt-1"
          style={{ animation: 'shake 0.3s ease-in-out' }}
        >
          {error}
        </p>
      )}

      <div style={{ animation: 'fade-up 0.4s ease-out 0.85s both' }} className="pt-1">
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
                Loggar in...
              </>
            ) : (
              'Logga in'
            )}
          </span>
        </button>
      </div>

      <p
        className="text-center text-[#444] text-xs pt-2"
        style={{ animation: 'fade-up 0.4s ease-out 0.95s both' }}
      >
        Inget konto?{' '}
        <Link
          href="/register"
          className="text-wc-red/60 hover:text-wc-red transition-colors duration-150"
        >
          Registrera dig
        </Link>
      </p>
    </form>
  )
}
