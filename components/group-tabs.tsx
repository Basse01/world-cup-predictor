'use client'
import { useEffect, useState } from 'react'

export default function GroupTabs({ groups }: { groups: string[] }) {
  const [active, setActive] = useState(groups[0] ?? '')

  useEffect(() => {
    if (!groups.length) return
    const observers: IntersectionObserver[] = []
    groups.forEach(g => {
      const el = document.getElementById(`group-${g}`)
      if (!el) return
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActive(g) },
        { rootMargin: '-20% 0px -75% 0px' }
      )
      obs.observe(el)
      observers.push(obs)
    })
    return () => observers.forEach(obs => obs.disconnect())
  }, [groups])

  if (!groups.length) return null

  return (
    <div className="sticky top-12 sm:top-14 z-40 bg-[#111] border-b border-[#1a1a1a] -mx-4 px-4 mb-6">
      <div className="flex gap-1 py-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {groups.map(g => (
          <a
            key={g}
            href={`#group-${g}`}
            onClick={() => setActive(g)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-display tracking-widest uppercase transition-colors ${
              active === g
                ? 'bg-wc-blue text-white'
                : 'text-white/60 hover:text-white hover:bg-[#1a1a1a]'
            }`}
          >
            {g}
          </a>
        ))}
      </div>
    </div>
  )
}
