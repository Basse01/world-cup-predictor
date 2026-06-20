'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  options: string[]
  value: string
  onChange: (val: string) => void
  placeholder?: string
}

export default function SearchSelect({ options, value, onChange, placeholder }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLUListElement>(null)

  useEffect(() => { setQuery(value) }, [value])

  const filtered = query.trim().length === 0
    ? options
    : options.filter(o => o.toLowerCase().includes(query.toLowerCase()))

  const updateRect = useCallback(() => {
    if (inputRef.current) setRect(inputRef.current.getBoundingClientRect())
  }, [])

  const handleSelect = useCallback((opt: string) => {
    onChange(opt)
    setQuery(opt)
    setOpen(false)
  }, [onChange])

  // Close on outside click
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      const t = e.target as Node
      if (!inputRef.current?.contains(t) && !dropdownRef.current?.contains(t)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  // Update position on scroll/resize while open
  useEffect(() => {
    if (!open) return
    window.addEventListener('scroll', updateRect, true)
    window.addEventListener('resize', updateRect)
    return () => {
      window.removeEventListener('scroll', updateRect, true)
      window.removeEventListener('resize', updateRect)
    }
  }, [open, updateRect])

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true) }}
          onFocus={() => { updateRect(); setOpen(true) }}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full bg-[#111] border border-[#3a3a3a] rounded-lg px-4 py-3.5 pr-10
                     text-base text-wc-light-gray placeholder-[#555] focus:outline-none
                     focus:border-wc-blue transition-colors"
        />
        <svg
          width="16" height="16" viewBox="0 0 16 16" fill="none"
          className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#555]"
        >
          <path d="M3 6L8 11L13 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {open && filtered.length > 0 && rect && createPortal(
        <ul
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: rect.bottom + 4,
            left: rect.left,
            width: rect.width,
            zIndex: 9999,
          }}
          className="bg-[#1e1e1e] border border-[#3a3a3a] rounded-xl
                     max-h-56 overflow-y-auto shadow-2xl"
        >
          {filtered.slice(0, 60).map(opt => (
            <li
              key={opt}
              onPointerDown={e => { e.preventDefault(); handleSelect(opt) }}
              className={`px-4 py-3.5 text-sm cursor-pointer transition-colors duration-100
                ${opt === value
                  ? 'text-wc-light-gray bg-wc-blue/10'
                  : 'text-[#ccc] hover:bg-[#252525] hover:text-wc-light-gray active:bg-[#2a2a2a]'}`}
            >
              {opt}
            </li>
          ))}
        </ul>,
        document.body
      )}
    </div>
  )
}
