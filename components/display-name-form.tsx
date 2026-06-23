'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DisplayNameForm({ current }: { current: string }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(current)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Ange ett smeknamn')
      return
    }
    if (trimmed === current) {
      setEditing(false)
      return
    }
    setSaving(true)
    setError(null)
    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: trimmed }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Något gick fel. Försök igen.')
      setSaving(false)
      return
    }
    setSaving(false)
    setEditing(false)
    router.refresh()
  }

  function handleCancel() {
    setName(current)
    setError(null)
    setEditing(false)
  }

  if (!editing) {
    return (
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm text-wc-light-gray font-medium truncate">{current}</div>
          <div className="text-xs text-white/50 mt-0.5">Ditt smeknamn i appen</div>
        </div>
        <button
          onClick={() => { setName(current); setEditing(true) }}
          className="flex-shrink-0 px-4 min-h-[44px] rounded-lg bg-wc-blue/10 border border-wc-blue/30
                     text-wc-blue text-sm font-display uppercase tracking-wide
                     hover:bg-wc-blue/20 transition-colors active:scale-95"
        >
          Ändra
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        maxLength={20}
        autoFocus
        placeholder="Smeknamn"
        className="w-full bg-[#111] border border-[#3a3a3a] rounded-lg px-4 py-3.5
                   text-base text-wc-light-gray placeholder-white/30
                   focus:outline-none focus:border-wc-blue"
      />
      {error && <p className="text-wc-red text-xs">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 min-h-[44px] rounded-lg py-2.5 text-white font-display uppercase tracking-wide text-sm
                     transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'linear-gradient(135deg, #E61D25 0%, #c4151c 100%)' }}
        >
          {saving ? 'Sparar...' : 'Spara'}
        </button>
        <button
          onClick={handleCancel}
          disabled={saving}
          className="px-5 min-h-[44px] rounded-lg bg-[#252525] text-white/70 font-display uppercase tracking-wide text-sm
                     transition-colors hover:bg-[#2f2f2f] active:scale-95 disabled:opacity-40"
        >
          Avbryt
        </button>
      </div>
    </div>
  )
}
