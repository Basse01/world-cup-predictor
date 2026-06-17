'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface AdminProps {
  profiles: { id: string; display_name: string; paid: boolean }[]
  matches: { id: string; home_team: string; away_team: string; kickoff_at: string; home_score: number | null; away_score: number | null; status: string }[]
  bonusTypes: { type: string; label: string; answer: string | null }[]
}

export default function AdminPanel({ profiles, matches, bonusTypes }: AdminProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'users' | 'matches' | 'bonus'>('users')

  const tabs = [
    { key: 'users' as const, label: 'Betalstatus' },
    { key: 'matches' as const, label: 'Resultat' },
    { key: 'bonus' as const, label: 'Bonus' },
  ]

  return (
    <div>
      <div className="flex gap-2 mb-6">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 rounded-lg font-display tracking-widest text-sm uppercase transition-colors
              ${activeTab === t.key ? 'bg-wc-red text-white' : 'bg-[#1a1a1a] text-wc-dark-gray hover:text-wc-light-gray'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'users' && (
        <div className="space-y-2">
          {profiles.map(p => (
            <div key={p.id} className="bg-[#1a1a1a] rounded-lg px-4 py-3 flex justify-between items-center">
              <span className="text-wc-light-gray">{p.display_name}</span>
              <button
                onClick={async () => {
                  await fetch('/api/admin/paid', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: p.id, paid: !p.paid }),
                  })
                  router.refresh()
                }}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors
                  ${p.paid
                    ? 'bg-wc-green/20 text-wc-green hover:bg-wc-green/30'
                    : 'bg-wc-red/20 text-wc-red hover:bg-wc-red/30'
                  }`}
              >
                {p.paid ? 'Betalt ✓' : 'Ej betalt'}
              </button>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'matches' && (
        <div className="space-y-2">
          {matches.map(m => (
            <MatchOverride key={m.id} match={m} />
          ))}
        </div>
      )}

      {activeTab === 'bonus' && (
        <div className="space-y-4">
          {bonusTypes.map(bt => (
            <BonusAward key={bt.type} bonusType={bt} />
          ))}
        </div>
      )}
    </div>
  )
}

function MatchOverride({ match }: { match: AdminProps['matches'][0] }) {
  const [home, setHome] = useState(match.home_score?.toString() ?? '')
  const [away, setAway] = useState(match.away_score?.toString() ?? '')
  const [saving, setSaving] = useState(false)

  async function save() {
    const h = parseInt(home)
    const a = parseInt(away)
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) return
    setSaving(true)
    await fetch('/api/admin/override', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ match_id: match.id, home_score: h, away_score: a }),
    })
    setSaving(false)
  }

  return (
    <div className="bg-[#1a1a1a] rounded-lg px-4 py-3 flex items-center gap-3">
      <span className="text-wc-light-gray text-sm flex-1">
        {match.home_team} vs {match.away_team}
        <span className="ml-2 text-xs text-wc-dark-gray">
          {new Date(match.kickoff_at).toLocaleDateString('sv-SE')}
        </span>
      </span>
      <input type="number" min={0} max={20} value={home} onChange={e => setHome(e.target.value)}
        className="w-10 text-center bg-[#111] border border-wc-dark-gray rounded px-1 py-1 text-sm text-wc-light-gray" />
      <span className="text-wc-dark-gray">–</span>
      <input type="number" min={0} max={20} value={away} onChange={e => setAway(e.target.value)}
        className="w-10 text-center bg-[#111] border border-wc-dark-gray rounded px-1 py-1 text-sm text-wc-light-gray" />
      <button onClick={save} disabled={saving}
        className="bg-wc-blue text-white text-xs px-3 py-1.5 rounded transition-colors hover:bg-blue-800 disabled:opacity-50">
        {saving ? '...' : 'Spara'}
      </button>
    </div>
  )
}

function BonusAward({ bonusType }: { bonusType: AdminProps['bonusTypes'][0] }) {
  const [answer, setAnswer] = useState(bonusType.answer ?? '')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  async function award() {
    if (!answer.trim()) return
    setSaving(true)
    await fetch('/api/admin/bonus-award', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: bonusType.type, answer }),
    })
    setSaving(false)
    setDone(true)
  }

  return (
    <div className="bg-[#1a1a1a] rounded-lg p-4">
      <p className="text-wc-light-gray text-sm font-medium mb-2">{bonusType.label}</p>
      <div className="flex gap-2">
        <input
          value={answer}
          onChange={e => { setAnswer(e.target.value); setDone(false) }}
          placeholder="Rätt svar..."
          className="flex-1 bg-[#111] border border-wc-dark-gray rounded px-3 py-2 text-sm text-wc-light-gray
                     focus:outline-none focus:border-wc-blue"
        />
        <button onClick={award} disabled={saving}
          className="bg-wc-green text-white text-xs px-4 py-2 rounded transition-colors hover:bg-green-700 disabled:opacity-50">
          {done ? '✓ Tilldelat' : saving ? '...' : 'Tilldela poäng'}
        </button>
      </div>
    </div>
  )
}
