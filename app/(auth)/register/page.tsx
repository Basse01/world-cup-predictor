'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
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
      options: { data: { display_name: displayName } },
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
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={handleRegister} className="space-y-4">
      <div>
        <input
          type="text"
          placeholder="Smeknamn"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          required
          maxLength={20}
          className="w-full bg-[#1a1a1a] border border-wc-dark-gray rounded-lg px-4 py-3
                     text-wc-light-gray placeholder-wc-dark-gray focus:outline-none
                     focus:border-wc-blue transition-colors"
        />
      </div>
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
          placeholder="Lösenord (min 6 tecken)"
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
        className="w-full bg-wc-blue hover:bg-blue-800 text-white font-display tracking-widest
                   py-3 rounded-lg transition-colors disabled:opacity-50 text-lg uppercase"
      >
        {loading ? 'Skapar konto...' : 'Skapa konto'}
      </button>
      <p className="text-center text-wc-dark-gray text-sm">
        Har du ett konto?{' '}
        <Link href="/login" className="text-wc-blue hover:underline">Logga in</Link>
      </p>
    </form>
  )
}
