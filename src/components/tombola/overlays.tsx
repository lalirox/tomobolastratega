'use client'

import { useEffect, useState } from 'react'

// ─────────────────────────────────────────────────────────────
// Overlays de pantalla completa:
//  · AlertOverlay  → sirena visual estilo Juego del Calamar
//  · WinnerOverlay → número ganador ocupando toda la pantalla
// ─────────────────────────────────────────────────────────────

/** Símbolos de los guardias del Juego del Calamar: ○ △ □ */
function GuardShapes() {
  return (
    <div className="flex items-center gap-4 sm:gap-7" aria-hidden="true">
      <svg viewBox="0 0 48 48" className="h-10 w-10 drop-shadow-[0_0_14px_rgba(255,45,120,.7)] sm:h-16 sm:w-16">
        <circle cx="24" cy="24" r="18" fill="none" stroke="#ff2d78" strokeWidth="4" />
      </svg>
      <svg viewBox="0 0 48 48" className="h-10 w-10 drop-shadow-[0_0_14px_rgba(255,45,120,.7)] sm:h-16 sm:w-16">
        <path d="M24 6 L44 42 L4 42 Z" fill="none" stroke="#ff2d78" strokeWidth="4" strokeLinejoin="round" />
      </svg>
      <svg viewBox="0 0 48 48" className="h-10 w-10 drop-shadow-[0_0_14px_rgba(255,45,120,.7)] sm:h-16 sm:w-16">
        <rect x="7" y="7" width="34" height="34" fill="none" stroke="#ff2d78" strokeWidth="4" />
      </svg>
    </div>
  )
}

/** Alerta a pantalla completa con parpadeo rojo/rosa (fase 'alert') */
export function AlertOverlay() {
  return (
    <div
      className="alert-flash fixed inset-0 z-[70] flex flex-col items-center justify-center gap-5 overflow-hidden text-center sm:gap-7"
      role="alert"
      aria-live="assertive"
    >
      <GuardShapes />
      <p className="animate-pulse-fast font-rye text-[clamp(46px,11vw,130px)] leading-none text-white drop-shadow-[0_0_34px_rgba(255,45,120,.85)]">
        ⚠ ALERTA ⚠
      </p>
      <p className="font-elite text-[clamp(15px,2.6vw,32px)] font-bold tracking-[0.35em] text-[#ffd6e8]">
        LA NUEVA RIFA ESTÁ POR COMENZAR
      </p>
      <p className="font-elite text-[clamp(11px,1.7vw,19px)] tracking-[0.22em] text-white/80">
        AGARREN SUS CARTONES · EL TAMBOR VA A GIRAR
      </p>
    </div>
  )
}

interface WinnerOverlayProps {
  number: number
  round: number
  remaining: number
}

/**
 * Número ganador a pantalla completa. Se cierra solo a los ~6.5 s
 * o al tocar la pantalla; mientras tanto el tablero queda cubierto.
 */
export function WinnerOverlay({ number, round, remaining }: WinnerOverlayProps) {
  const [visible, setVisible] = useState(true)

  // Cierre automático (setState solo dentro del callback del timer)
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 6500)
    return () => clearTimeout(t)
  }, [])

  if (!visible) return null

  return (
    <div
      className="animate-fade-in fixed inset-0 z-[70] flex items-center justify-center overflow-hidden bg-[#070402]/[.97]"
      role="dialog"
      aria-label={`Número ganador: ${number}`}
      onClick={() => setVisible(false)}
    >
      {/* Rayos dorados girando detrás del número */}
      <div className="rays-spin absolute left-1/2 top-1/2 h-[250vmax] w-[250vmax]" aria-hidden="true" />
      {/* Viñeta oscura para dar profundidad */}
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,.78)_80%)]"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col items-center gap-1 text-center sm:gap-3">
        <p className="font-elite text-[clamp(13px,2.4vw,28px)] font-bold uppercase tracking-[0.5em] text-[#d8b45a] drop-shadow-[0_0_18px_rgba(201,162,39,.5)]">
          ★ Número ganador ★
        </p>
        <p
          key={number}
          className="animate-winner-pop font-rye text-[clamp(150px,36vw,560px)] leading-[0.9] text-[#f3d27a] drop-shadow-[0_0_70px_rgba(201,162,39,.55)]"
        >
          {number}
        </p>
        <p className="font-elite text-[clamp(12px,2vw,22px)] tracking-[0.28em] text-[#c9a97a]">
          RONDA #{round} · QUEDAN {remaining} BOLAS
        </p>
        <p className="mt-2 font-elite text-[10px] tracking-[0.3em] text-white/45 sm:text-xs">
          TOCA LA PANTALLA PARA CONTINUAR
        </p>
      </div>
    </div>
  )
}
