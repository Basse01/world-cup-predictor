'use client'
import { useEffect, useState } from 'react'

const LABELS: Record<string, string> = {
  round_of_16: 'Åttondelsfinal',
  quarter_final: 'Kvartsfinaler',
  semi_final: 'Semifinaler',
  final: 'Final',
}

export default function StageTabs({ stages }: { stages: string[] }) {
  const [active, setActive] = useState(stages[0] ?? '')

  useEffect(() => {
    if (!stages.length) return
    const observers: IntersectionObserver[] = []
    stages.forEach(s => {
      const el = document.getElementById(`stage-${s}`)
      if (!el) return
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActive(s) },
        { rootMargin: '-20% 0px -75% 0px' }
      )
      obs.observe(el)
      observers.push(obs)
    })
    return () => observers.forEach(obs => obs.disconnect())
  }, [stages])

  if (!stages.length) return null

  return (
    <div className="sticky top-12 sm:top-14 z-40 bg-[#111] border-b border-[#1a1a1a] -mx-4 px-4 mb-6">
      <div className="flex gap-1 py-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {stages.map(s => (
          <a
            key={s}
            href={`#stage-${s}`}
            onClick={() => setActive(s)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-display tracking-widest uppercase transition-colors ${
              active === s
                ? 'bg-wc-red text-white'
                : 'text-wc-dark-gray hover:text-wc-light-gray hover:bg-[#1a1a1a]'
            }`}
          >
            {LABELS[s] ?? s}
          </a>
        ))}
      </div>
    </div>
  )
}
