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

  function handleOpen() { setOpen(true); setQuery('') }
  function handleClose() { setOpen(false); setQuery('') }
  function handleSelect(opt: string) { onChange(opt); handleClose() }

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => searchRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [open])

  const overlay = open ? createPortal(
    <div className="fixed inset-0 z-[9999] bg-[#0d0d0d] flex flex-col">
      {/* Header — always visible above keyboard */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-[#2a2a2a] flex-shrink-0"
           style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
        <button
          type="button"
          onPointerDown={handleClose}
          className="flex items-center justify-center w-10 h-10 -ml-1 text-white/60 hover:text-white"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span className="font-display text-base text-wc-light-gray uppercase tracking-wide flex-1">
          {placeholder ?? 'Välj'}
        </span>
      </div>

      {/* Search — stays visible, keyboard opens below */}
      <div className="px-4 py-3 flex-shrink-0">
        <div className="relative">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
               className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Sök..."
            autoComplete="off"
            className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl pl-10 pr-4 py-3.5
                       text-base text-wc-light-gray placeholder-white/30
                       focus:outline-none focus:border-wc-blue"
          />
          {query.length > 0 && (
            <button type="button" onPointerDown={() => setQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* List — shrinks when keyboard opens, scrollable */}
      <ul className="flex-1 overflow-y-auto overscroll-contain divide-y divide-white/5"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {filtered.length === 0 ? (
          <li className="px-4 py-8 text-center text-white/40 text-sm">Inga träffar för "{query}"</li>
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
                   focus:outline-none focus:border-wc-blue transition-colors
                   hover:border-[#4a4a4a] active:border-wc-blue"
      >
        <span className={value ? 'text-wc-light-gray' : 'text-white/30'}>
          {value || (placeholder ?? 'Välj...')}
        </span>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-white/40 flex-shrink-0">
          <path d="M3 6L8 11L13 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {overlay}
    </>
  )
}
