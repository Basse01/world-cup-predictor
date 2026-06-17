'use client'

const BALLS = [
  { left: 6,  size: 22, duration: 14, delay: 0   },
  { left: 16, size: 28, duration: 11, delay: 3.5 },
  { left: 27, size: 18, duration: 16, delay: 1   },
  { left: 37, size: 26, duration: 13, delay: 5.5 },
  { left: 58, size: 30, duration: 12, delay: 7   },
  { left: 68, size: 20, duration: 17, delay: 0.5 },
  { left: 76, size: 24, duration: 11, delay: 4   },
  { left: 85, size: 18, duration: 14, delay: 6.5 },
  { left: 93, size: 26, duration: 13, delay: 2.5 },
]

const FLAGS = [
  { emoji: '🇸🇪', left: 9,  size: 34, duration: 13, delay: 2.5  },
  { emoji: '🇧🇷', left: 20, size: 30, duration: 15, delay: 6.5  },
  { emoji: '🇦🇷', left: 31, size: 36, duration: 11, delay: 0.8  },
  { emoji: '🇫🇷', left: 41, size: 32, duration: 14, delay: 4.5  },
  { emoji: '🇩🇪', left: 52, size: 30, duration: 16, delay: 8.5  },
  { emoji: '🇵🇹', left: 62, size: 28, duration: 12, delay: 1.8  },
  { emoji: '🇪🇸', left: 71, size: 34, duration: 15, delay: 5.5  },
  { emoji: '🇳🇱', left: 80, size: 30, duration: 13, delay: 3.5  },
  { emoji: '🇺🇸', left: 89, size: 36, duration: 11, delay: 7.5  },
  { emoji: '🇲🇽', left: 4,  size: 32, duration: 14, delay: 9.5  },
  { emoji: '🇯🇵', left: 96, size: 28, duration: 16, delay: 2.8  },
  { emoji: '🇲🇦', left: 50, size: 30, duration: 12, delay: 11.5 },
]

export function AuthBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Red spotlight from top-center */}
      <div
        style={{
          position: 'absolute',
          top: '-80px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '720px',
          height: '540px',
          borderRadius: '50%',
          background:
            'radial-gradient(ellipse, rgba(230,29,37,0.4) 0%, rgba(230,29,37,0.15) 40%, transparent 70%)',
          filter: 'blur(40px)',
          animation: 'spotlight-pulse 4s ease-in-out infinite',
        }}
      />

      {/* World Cup Trophy — hidden on mobile, visible sm+ */}
      <div
        className="hidden sm:block"
        style={{
          position: 'absolute',
          top: '1.5%',
          left: '50%',
          transform: 'translateX(-50%)',
          opacity: 0.3,
          filter:
            'drop-shadow(0 0 18px rgba(255,215,0,0.9)) drop-shadow(0 0 55px rgba(230,29,37,0.65))',
        }}
      >
        <div style={{ animation: 'trophy-sway 6s ease-in-out infinite' }}>
          <svg
            width="136"
            height="204"
            viewBox="0 0 140 210"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
          >
            <defs>
              <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%"   stopColor="#FFF8B0" />
                <stop offset="18%"  stopColor="#FFD700" />
                <stop offset="45%"  stopColor="#B8860B" />
                <stop offset="72%"  stopColor="#FFD700" />
                <stop offset="100%" stopColor="#8B6914" />
              </linearGradient>
              <linearGradient id="goldH" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#FFF5A0" />
                <stop offset="50%"  stopColor="#D4A017" />
                <stop offset="100%" stopColor="#8B6914" />
              </linearGradient>
            </defs>

            {/* Globe */}
            <circle cx="70" cy="26" r="26" fill="url(#gold)" />
            {/* Globe: equator arc hint */}
            <path
              d="M 44 26 Q 70 19 96 26"
              stroke="rgba(0,0,0,0.12)"
              strokeWidth="1.5"
              fill="none"
            />
            <path
              d="M 44 26 Q 70 33 96 26"
              stroke="rgba(0,0,0,0.12)"
              strokeWidth="1.5"
              fill="none"
            />
            {/* Globe highlight */}
            <ellipse cx="60" cy="17" rx="9" ry="6" fill="rgba(255,255,255,0.22)" />

            {/* Left Atlas figure — sweeps dramatically outward then curves up to globe */}
            <path
              d="M 65 150 C 46 138 2 108 2 78 C 2 60 26 50 46 52"
              stroke="url(#gold)"
              strokeWidth="12"
              strokeLinecap="round"
              fill="none"
            />
            {/* Right Atlas figure — mirror */}
            <path
              d="M 75 150 C 94 138 138 108 138 78 C 138 60 114 50 94 52"
              stroke="url(#gold)"
              strokeWidth="12"
              strokeLinecap="round"
              fill="none"
            />

            {/* Stem */}
            <rect x="62" y="148" width="16" height="20" rx="5" fill="url(#goldH)" />

            {/* Upper base tier */}
            <rect x="44" y="166" width="52" height="16" rx="4" fill="url(#goldH)" />

            {/* Lower base tier */}
            <rect x="26" y="180" width="88" height="14" rx="4" fill="url(#goldH)" />

            {/* Green malachite band */}
            <rect x="16" y="192" width="108" height="11" rx="5" fill="#2d7a30" />

            {/* Bottom gold base */}
            <rect x="20" y="201" width="100" height="9" rx="4" fill="url(#goldH)" />
          </svg>
        </div>
      </div>

      {/* Blue accent — bottom-left */}
      <div
        style={{
          position: 'absolute',
          bottom: '-60px',
          left: '-60px',
          width: '420px',
          height: '320px',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(42,57,141,0.3) 0%, transparent 70%)',
          filter: 'blur(50px)',
        }}
      />

      {/* Green accent — bottom-right */}
      <div
        style={{
          position: 'absolute',
          bottom: '-40px',
          right: '-40px',
          width: '300px',
          height: '250px',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(60,172,59,0.12) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      {/* Subtle grid */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.025,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }}
      />

      {/* Floating footballs */}
      {BALLS.map((ball, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${ball.left}%`,
            bottom: '-40px',
            fontSize: `${ball.size}px`,
            animation: `float-ball ${ball.duration}s linear ${ball.delay}s infinite`,
            userSelect: 'none',
          }}
        >
          ⚽
        </div>
      ))}

      {/* Floating flags */}
      {FLAGS.map((flag, i) => (
        <div
          key={`flag-${i}`}
          style={{
            position: 'absolute',
            left: `${flag.left}%`,
            bottom: '-40px',
            fontSize: `${flag.size}px`,
            animation: `float-flag ${flag.duration}s linear ${flag.delay}s infinite`,
            userSelect: 'none',
            lineHeight: 1,
          }}
        >
          {flag.emoji}
        </div>
      ))}
    </div>
  )
}
