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
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(230,29,37,0.35) 0%, rgba(230,29,37,0.12) 40%, transparent 70%)',
          filter: 'blur(40px)',
          animation: 'spotlight-pulse 4s ease-in-out infinite',
        }}
      />

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

      {/* Green accent — bottom-right, very subtle */}
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
    </div>
  )
}
