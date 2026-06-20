'use client'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  options: string[]
  value: string
  onChange: (val: string) => void
  placeholder?: string
}

export default function SearchSelect({ options, value, onChange, placeholder }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  const filtered = query.trim().length === 0
    ? options
    : options.filter(o => o.toLowerCase().includes(query.toLowerCase()))

  function handleSelect(opt: string) {
    onChange(opt)
    setOpen(false)
    setQuery('')
  }

  function handleOpen() {
    setOpen(true)
    setQuery('')
  }

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => searchRef.current?.focus(), 100)
      return () => clearTimeout(t)
    }
  }, [open])

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [open])

  const sheet = open ? createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onPointerDown={() => { setOpen(false); setQuery('') }}
      />

      {/* Sheet */}
      <div
        className="relative bg-[#1a1a1a] rounded-t-2xl flex flex-col"
        style={{ maxHeight: '80vh', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 flex-shrink-0">
          <span className="font-display text-base text-wc-light-gray uppercase tracking-wide">
            {placeholder ?? 'Välj'}
          </span>
          <button
            type="button"
            onPointerDown={() => { setOpen(false); setQuery('') }}
            className="w-9 h-9 flex items-center justify-center text-white/50 hover:text-white rounded-full"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Search input */}
        <div className="px-4 pb-3 flex-shrink-0">
          <div className="relative">
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
            >
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Sök..."
              autoComplete="off"
              className="w-full bg-[#111] border border-[#333] rounded-xl pl-10 pr-4 py-3
                         text-base text-wc-light-gray placeholder-white/30
                         focus:outline-none focus:border-wc-blue"
            />
          </div>
        </div>

        {/* List */}
        <ul className="flex-1 overflow-y-auto overscroll-contain divide-y divide-white/5 min-h-0">
          {filtered.length === 0 ? (
            <li className="px-4 py-6 text-center text-white/40 text-sm">Inga träffar</li>
          ) : (
            filtered.map(opt => (
              <li key={opt}>
                <button
                  type="button"
                  onPointerDown={e => { e.preventDefault(); handleSelect(opt) }}
                  className={`w-full text-left px-4 py-4 text-base transition-colors active:bg-white/10
                    ${opt === value ? 'text-wc-blue font-medium bg-wc-blue/10' : 'text-wc-light-gray'}`}
                >
                  {opt}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>,
    document.body
  ) : null

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="w-full bg-[#111] border border-[#3a3a3a] rounded-xl px-4 py-3.5
                   flex items-center justify-between gap-2 text-base min-h-[52px]
                   focus:outline-none focus:border-wc-blue transition-colors hover:border-[#4a4a4a]
                   active:border-wc-blue"
      >
        <span className={value ? 'text-wc-light-gray' : 'text-white/30'}>
          {value || (placeholder ?? 'Välj...')}
        </span>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-white/40 flex-shrink-0">
          <path d="M3 6L8 11L13 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {sheet}
    </>
  )
}
