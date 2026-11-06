'use client'

import { useEffect, useState } from 'react'
import { BrandY, StrategaLogo } from '@/components/tombola/brand'

// ─────────────────────────────────────────────────────────────
// Overlays de pantalla completa:
//  · AlertOverlay  → sirena visual del rancho (botón del celular)
//  · WinnerOverlay → número ganador ocupando toda la pantalla
// ─────────────────────────────────────────────────────────────

/** Alerta a pantalla completa con parpadeo rojo/dorado del rancho (fase 'alert') */
export function AlertOverlay() {
  return (
    <div
      className="alert-flash fixed inset-0 z-[70] flex flex-col items-center justify-center gap-5 overflow-hidden text-center sm:gap-7"
      role="alert"
      aria-live="assertive"
    >
      {/* Identidad del rancho: logo Stratega + marca de hierro Y */}
      <div className="flex items-center gap-5 sm:gap-8" aria-hidden="true">
        <StrategaLogo className="h-20 w-20 object-contain drop-shadow-[0_0_28px_rgba(232,200,119,.55)] sm:h-28 sm:w-28" />
        <BrandY className="h-14 w-14 drop-shadow-[0_0_18px_rgba(232,200,119,.5)] sm:h-20 sm:w-20" />
      </div>
      <p className="animate-pulse-fast font-rye text-[clamp(46px,11vw,130px)] leading-none text-white drop-shadow-[0_0_34px_rgba(232,200,119,.85)]">
        ⚠ ALERTA ⚠
      </p>
      <p className="font-elite text-[clamp(15px,2.6vw,32px)] font-bold tracking-[0.35em] text-[#f3d27a]">
        LA NUEVA RIFA ESTÁ POR COMENZAR
      </p>
      <p className="font-elite text-[clamp(11px,1.7vw,19px)] tracking-[0.22em] text-white/85">
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
 * Número ganador a pantalla completa con el logo de Stratega y el
 * saludo de la Posada. Se cierra solo a los ~7 s o al tocar la pantalla.
 */
export function WinnerOverlay({ number, round, remaining }: WinnerOverlayProps) {
  const [visible, setVisible] = useState(true)

  // Cierre automático (setState solo dentro del callback del timer)
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 7000)
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

      <div className="relative z-10 flex flex-col items-center gap-1 text-center sm:gap-2">
        <StrategaLogo className="h-16 w-16 animate-winner-pop object-contain drop-shadow-[0_0_30px_rgba(232,200,119,.6)] sm:h-24 sm:w-24" />
        <p className="mt-1 font-elite text-[clamp(12px,2.2vw,26px)] font-bold uppercase tracking-[0.5em] text-[#d8b45a] drop-shadow-[0_0_18px_rgba(201,162,39,.5)]">
          ★ Número ganador ★
        </p>
        <p
          key={number}
          className="animate-winner-pop font-rye text-[clamp(130px,30vw,480px)] leading-[0.9] text-[#f3d27a] drop-shadow-[0_0_70px_rgba(201,162,39,.55)]"
        >
          {number}
        </p>
        <p className="animate-pop font-rye text-[clamp(30px,6.5vw,88px)] leading-tight text-[#e8c877] drop-shadow-[0_0_28px_rgba(201,162,39,.45)]">
          POSADA 2026
        </p>
        <p className="animate-pop font-elite text-[clamp(14px,2.6vw,30px)] font-bold tracking-[0.3em] text-[#f3e6c3]">
          ¡MUCHAS FELICIDADES!
        </p>
        <p className="mt-1 font-elite text-[clamp(11px,1.8vw,20px)] tracking-[0.28em] text-[#c9a97a]">
          RONDA #{round} · QUEDAN {remaining} BOLAS
        </p>
        <p className="mt-2 font-elite text-[10px] tracking-[0.3em] text-white/45 sm:text-xs">
          TOCA LA PANTALLA PARA CONTINUAR
        </p>
      </div>
    </div>
  )
}
