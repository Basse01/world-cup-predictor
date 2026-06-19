'use client'
import { useState, useRef, useEffect, useCallback } from 'react'

interface Props {
  options: string[]
  value: string
  onChange: (val: string) => void
  placeholder?: string
}

export default function SearchSelect({ options, value, onChange, placeholder }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value)
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => { setQuery(value) }, [value])

  const filtered = query.trim().length === 0
    ? options
    : options.filter(o => o.toLowerCase().includes(query.toLowerCase()))

  const handleSelect = useCallback((opt: string) => {
    onChange(opt)
    setQuery(opt)
    setOpen(false)
  }, [onChange])

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full bg-[#111] border border-wc-dark-gray rounded-lg px-4 py-3
                   text-base text-wc-light-gray placeholder-wc-dark-gray focus:outline-none
                   focus:border-wc-blue"
      />
      {open && filtered.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 w-full mt-1 bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl
                     max-h-52 overflow-y-auto shadow-2xl"
        >
          {filtered.slice(0, 60).map(opt => (
            <li
              key={opt}
              onPointerDown={e => { e.preventDefault(); handleSelect(opt) }}
              className={`px-4 py-3 text-sm cursor-pointer transition-colors duration-100
                          ${opt === value
                            ? 'text-wc-light-gray bg-[#2a2a2a]'
                            : 'text-wc-dark-gray hover:bg-[#252525] hover:text-wc-light-gray'}`}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
