import { useEffect, useRef } from 'react'

interface AbstractBackgroundProps {
  colors?: string[]
  animated?: boolean
  interactive?: boolean
  intensity?: number
  className?: string
}

export function AbstractBackground({
  colors,
  animated = true,
  interactive = true,
  intensity = 10,
  className = '',
}: AbstractBackgroundProps) {
  const c1 = colors?.[0] ?? 'var(--bg-abstract-1, #4F46E5)'
  const c2 = colors?.[1] ?? 'var(--bg-abstract-2, #06B6D4)'
  const c3 = colors?.[2] ?? 'var(--bg-abstract-3, #60A5FA)'

  const rootRef = useRef<HTMLDivElement | null>(null)
  const groupRef = useRef<SVGGElement | null>(null)

  useEffect(() => {
    if (!animated || !interactive) return
    if (typeof window === 'undefined') return
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let rafId: number | null = null
    let tx = 0
    let ty = 0
    let vx = 0
    let vy = 0

    function onPointerMove(e: PointerEvent) {
      const el = rootRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const px = (e.clientX - rect.left) / rect.width
      const py = (e.clientY - rect.top) / rect.height
      const targetX = (px - 0.5) * 2
      const targetY = (py - 0.5) * 2
      tx = targetX
      ty = targetY
    }

    function step() {
      // gentle lerp for parallax
      vx += (tx - vx) * 0.08
      vy += (ty - vy) * 0.08

      const g = groupRef.current
      if (g) {
        const moveX = vx * intensity
        const moveY = vy * intensity
        g.style.transform = `translate3d(${moveX}px, ${moveY}px, 0)`
      }
      rafId = window.requestAnimationFrame(step)
    }

    window.addEventListener('pointermove', onPointerMove)
    rafId = window.requestAnimationFrame(step)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [animated, interactive, intensity])

  return (
    <div ref={rootRef} aria-hidden className={className} style={{ pointerEvents: 'none' }}>
      <svg viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" role="presentation" focusable="false" className="w-full h-full">
        <defs>
          <linearGradient id="med-grad" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor={c1} stopOpacity="1" />
            <stop offset="60%" stopColor={c2} stopOpacity="0.95" />
            <stop offset="100%" stopColor={c3} stopOpacity="0.9" />
          </linearGradient>

          <filter id="blur-soft" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="36" />
          </filter>

          <filter id="grain" x="0" y="0" width="100%" height="100%">
            <feTurbulence baseFrequency="0.6" numOctaves="2" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
            <feBlend in="SourceGraphic" mode="overlay" />
          </filter>
        </defs>

        {/* main gradient background */}
        <rect x="0" y="0" width="1200" height="700" fill="url(#med-grad)" />

        {/* floating soft blobs group (parallax) */}
        <g ref={groupRef} style={{ transition: 'transform 120ms linear' }}>
          <g filter="url(#blur-soft)" opacity="0.95">
            <path d="M-200 120 C60 20 160 30 360 120 C540 200 700 150 980 200 C1180 240 1400 120 1600 100 L1600 800 L-200 800 Z" fill="rgba(255,255,255,0.06)" />
            <ellipse cx="920" cy="120" rx="260" ry="120" fill="rgba(255,255,255,0.06)" />
            <path d="M0 420 C160 360 280 420 480 460 C720 510 960 480 1200 520 L1600 800 L0 800 Z" fill="rgba(255,255,255,0.03)" />
          </g>

          {/* subtle molecular nodes */}
          <g opacity="0.85">
            <circle cx="180" cy="140" r="6" fill="white" opacity="0.9" />
            <circle cx="230" cy="190" r="4" fill="white" opacity="0.7" />
            <circle cx="300" cy="110" r="5" fill="white" opacity="0.6" />
            <path d="M186 144 L226 186" stroke="white" strokeOpacity="0.14" strokeWidth="1.5" />
            <path d="M234 194 L300 114" stroke="white" strokeOpacity="0.12" strokeWidth="1.2" />
          </g>

          {/* medical cross faint emblem */}
          <g transform="translate(540,220)" opacity="0.08">
            <rect x="-40" y="-90" width="80" height="180" rx="8" fill="white" />
            <rect x="-90" y="-40" width="180" height="80" rx="8" fill="white" />
          </g>

          {/* heartbeat line (center) */}
          <g transform="translate(120,360)">
            <rect x="0" y="-40" width="960" height="120" fill="transparent" />
            <polyline id="heartbeat" points="0,20 60,20 90,10 120,50 160,0 200,40 260,20 320,20 380,20 420,0 460,50 520,20 580,20 640,20 700,10 760,30 820,20 880,20 960,20"
              fill="none" stroke="white" strokeWidth="2.2" strokeOpacity="0.9" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </g>

        <style>{`
          /* heartbeat animation - subtle draw */
          #heartbeat { stroke-dasharray: 1400; stroke-dashoffset: 1400; animation: hb-draw 3.2s ease-in-out infinite; }

          @keyframes hb-draw {
            0% { stroke-dashoffset: 1400; opacity: 0.8 }
            35% { stroke-dashoffset: 0; opacity: 1 }
            70% { stroke-dashoffset: -140; opacity: 0.9 }
            100% { stroke-dashoffset: -1400; opacity: 0.8 }
          }

          /* prefer reduced motion: disable animations */
          @media (prefers-reduced-motion: reduce) {
            #heartbeat { animation: none; stroke-dashoffset: 0 }
          }

          svg { display: block }
        `}</style>
      </svg>
    </div>
  )
}

export default AbstractBackground
