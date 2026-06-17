import { AuthBackground } from './auth-background'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-wc-black flex items-center justify-center p-4 relative overflow-hidden">
      <AuthBackground />

      <div className="relative z-10 w-full max-w-[360px]">
        {/* Title */}
        <div className="text-center mb-8">
          <h1
            className="font-display text-[5.5rem] leading-none text-wc-red"
            style={{ animation: 'stamp-in 0.65s cubic-bezier(0.22, 1, 0.36, 1) both' }}
          >
            VM 2026
          </h1>

          {/* Subtitle with flanking lines */}
          <div
            className="flex items-center gap-3 mt-3"
            style={{ animation: 'fade-up 0.5s ease-out 0.45s both' }}
          >
            <div
              className="h-px flex-1 bg-gradient-to-r from-transparent to-wc-red/50 origin-left"
              style={{ animation: 'line-grow 0.6s ease-out 0.55s both' }}
            />
            <p className="text-[#555] text-[10px] uppercase tracking-[0.35em] font-body shrink-0">
              Prediction League
            </p>
            <div
              className="h-px flex-1 bg-gradient-to-l from-transparent to-wc-red/50 origin-right"
              style={{ animation: 'line-grow 0.6s ease-out 0.55s both' }}
            />
          </div>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-7"
          style={{
            background: 'rgba(15, 15, 15, 0.85)',
            border: '1px solid rgba(230, 29, 37, 0.12)',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.03), 0 30px 60px rgba(0,0,0,0.6), 0 0 80px rgba(230,29,37,0.06)',
            animation: 'fade-up 0.5s ease-out 0.5s both',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
