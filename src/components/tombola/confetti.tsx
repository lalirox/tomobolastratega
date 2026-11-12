'use client'

import { useMemo } from 'react'

/**
 * Confeti del anuncio de la bola ganadora.
 *
 * Sin librerías: un puñado de piezas con animación CSS que caen, giran y
 * se desvían. Los valores se generan una sola vez con una semilla (el
 * número ganador) para que no cambien entre renders y cada número tenga su
 * propio patrón. Con `prefers-reduced-motion` no se muestra (ver CSS).
 */

// Paleta del evento: dorados, crema, rojos del rancho y algo de blanco
const COLORS = [
  '#f3d27a',
  '#e8c877',
  '#c9a227',
  '#f3e6c3',
  '#d43a2a',
  '#8b1a1a',
  '#ffffff',
  '#b8860b',
]

interface Piece {
  left: number
  dx: number
  w: number
  h: number
  color: string
  rot: number
  dur: number
  delay: number
  round: boolean
  blur: boolean
}

/** Generador pseudoaleatorio determinista (mulberry32) para una semilla */
function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function Confetti({
  pieces = 110,
  seed = 1,
}: {
  pieces?: number
  /** Semilla: el número ganador, para variar el patrón en cada tirada */
  seed?: number
}) {
  const items = useMemo<Piece[]>(() => {
    const rnd = rng(Math.floor(seed) * 9301 + 49297)
    const out: Piece[] = []
    for (let i = 0; i < pieces; i++) {
      out.push({
        left: rnd() * 100,
        dx: (rnd() - 0.5) * 240,
        w: 5 + rnd() * 5,
        h: 8 + rnd() * 10,
        color: COLORS[Math.floor(rnd() * COLORS.length)],
        rot: 360 + rnd() * 1080,
        dur: 2.6 + rnd() * 2.2,
        delay: rnd() * 1.3,
        round: rnd() > 0.76,
        blur: rnd() > 0.72,
      })
    }
    return out
  }, [pieces, seed])

  return (
    <div
      className="confetti pointer-events-none absolute inset-0 z-20 overflow-hidden"
      aria-hidden="true"
    >
      {items.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={
            {
              left: `${p.left}%`,
              width: `${p.w}px`,
              height: `${p.h}px`,
              backgroundColor: p.color,
              borderRadius: p.round ? '9999px' : '1px',
              filter: p.blur ? 'blur(1px)' : undefined,
              '--dx': `${p.dx}px`,
              '--rot': `${p.rot}deg`,
              '--dur': `${p.dur}s`,
              '--delay': `${p.delay}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}
