'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

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
    <form onSubmit={handleLogin} className="space-y-4">
      <div>
        <input
          type="email"
          placeholder="E-post"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="w-full bg-[#1a1a1a] border border-wc-dark-gray rounded-lg px-4 py-3
                     text-wc-light-gray placeholder-wc-dark-gray focus:outline-none
                     focus:border-wc-blue transition-colors"
        />
      </div>
      <div>
        <input
          type="password"
          placeholder="Lösenord"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          className="w-full bg-[#1a1a1a] border border-wc-dark-gray rounded-lg px-4 py-3
                     text-wc-light-gray placeholder-wc-dark-gray focus:outline-none
                     focus:border-wc-blue transition-colors"
        />
      </div>
      {error && <p className="text-wc-red text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-wc-red hover:bg-red-700 text-white font-display tracking-widest
                   py-3 rounded-lg transition-colors disabled:opacity-50 text-lg uppercase"
      >
        {loading ? 'Loggar in...' : 'Logga in'}
      </button>
      <p className="text-center text-wc-dark-gray text-sm">
        Inget konto?{' '}
        <Link href="/register" className="text-wc-blue hover:underline">Registrera dig</Link>
      </p>
    </form>
  )
}
