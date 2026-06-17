'use client'

const BALLS = [
  { left: 6,  size: 16, duration: 14, delay: 0   },
  { left: 16, size: 22, duration: 11, delay: 3.5 },
  { left: 27, size: 14, duration: 16, delay: 1   },
  { left: 37, size: 20, duration: 13, delay: 5.5 },
  { left: 47, size: 17, duration: 15, delay: 2   },
  { left: 58, size: 23, duration: 12, delay: 7   },
  { left: 68, size: 15, duration: 17, delay: 0.5 },
  { left: 76, size: 19, duration: 11, delay: 4   },
  { left: 85, size: 14, duration: 14, delay: 6.5 },
  { left: 93, size: 21, duration: 13, delay: 2.5 },
]

const FLAGS = [
  { emoji: '🇸🇪', left: 9,  size: 22, duration: 13, delay: 2.5  },
  { emoji: '🇧🇷', left: 20, size: 20, duration: 15, delay: 6.5  },
  { emoji: '🇦🇷', left: 31, size: 24, duration: 11, delay: 0.8  },
  { emoji: '🇫🇷', left: 41, size: 20, duration: 14, delay: 4.5  },
  { emoji: '🇩🇪', left: 52, size: 22, duration: 16, delay: 8.5  },
  { emoji: '🇵🇹', left: 62, size: 18, duration: 12, delay: 1.8  },
  { emoji: '🇪🇸', left: 71, size: 22, duration: 15, delay: 5.5  },
  { emoji: '🇳🇱', left: 80, size: 20, duration: 13, delay: 3.5  },
  { emoji: '🇺🇸', left: 89, size: 24, duration: 11, delay: 7.5  },
  { emoji: '🇲🇽', left: 3,  size: 20, duration: 14, delay: 9.5  },
  { emoji: '🇯🇵', left: 96, size: 18, duration: 16, delay: 2.8  },
  { emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', left: 50, size: 22, duration: 12, delay: 11.5 },
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
          width: '700px',
          height: '520px',
          borderRadius: '50%',
          background:
            'radial-gradient(ellipse, rgba(230,29,37,0.38) 0%, rgba(230,29,37,0.14) 40%, transparent 70%)',
          filter: 'blur(40px)',
          animation: 'spotlight-pulse 4s ease-in-out infinite',
        }}
      />

      {/* World Cup Trophy — centered in the spotlight */}
      <div
        style={{
          position: 'absolute',
          top: '2%',
          left: '50%',
          opacity: 0.22,
          filter:
            'drop-shadow(0 0 16px rgba(255,210,0,0.8)) drop-shadow(0 0 50px rgba(230,29,37,0.6))',
          animation: 'trophy-sway 6s ease-in-out infinite',
        }}
      >
        <svg
          width="108"
          height="180"
          viewBox="0 0 120 200"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
        >
          <defs>
            <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%"   stopColor="#FFF5A0" />
              <stop offset="20%"  stopColor="#FFD700" />
              <stop offset="50%"  stopColor="#C8860A" />
              <stop offset="78%"  stopColor="#FFD700" />
              <stop offset="100%" stopColor="#8B6914" />
            </linearGradient>
          </defs>

          {/* Globe */}
          <circle cx="60" cy="32" r="28" fill="url(#gold)" />
          {/* Globe highlight */}
          <ellipse cx="52" cy="23" rx="10" ry="7" fill="rgba(255,255,255,0.18)" />

          {/* Left figure — curves outward from stem up to globe */}
          <path
            d="M 52 130 C 42 120 16 100 18 74 C 20 58 36 50 50 50"
            stroke="url(#gold)"
            strokeWidth="10"
            strokeLinecap="round"
          />
          {/* Right figure */}
          <path
            d="M 68 130 C 78 120 104 100 102 74 C 100 58 84 50 70 50"
            stroke="url(#gold)"
            strokeWidth="10"
            strokeLinecap="round"
          />

          {/* Stem */}
          <rect x="49" y="128" width="22" height="36" rx="6" fill="url(#gold)" />

          {/* Upper base tier */}
          <rect x="31" y="162" width="58" height="20" rx="5" fill="url(#gold)" />
          {/* Lower base tier */}
          <rect x="20" y="180" width="80" height="10" rx="4" fill="url(#gold)" />

          {/* Green malachite ring */}
          <rect x="14" y="188" width="92" height="12" rx="6" fill="#2d7a30" />
        </svg>
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
          }}
        >
          {flag.emoji}
        </div>
      ))}
    </div>
  )
}
