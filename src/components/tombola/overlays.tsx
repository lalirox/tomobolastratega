'use client'

import { useEffect, useRef } from 'react'
import { BrandY, StrategaLogo } from '@/components/tombola/brand'

// ─────────────────────────────────────────────────────────────
// Overlays de pantalla completa:
//  · AlertOverlay     → sirena visual del rancho (botón del celular)
//  · WinnerOverlay    → número ganador ocupando toda la pantalla (20 s)
//  · BrandingOverlay  → portada del cartel (resting screen tras el ganador)
//  · LockOverlay      → la MISMA portada del cartel (bloqueo/reposo)
//
// Hay una sola portada (PosterCover): el póster oficial de la Posada.
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
  /** Avisa a la pantalla que se cerró (toque o auto) para desmontarlo */
  onClose: () => void
}

/**
 * Número ganador a pantalla completa con el logo de Stratega y el
 * saludo de la Posada. Se queda 20 s y luego pasa a la pantalla de
 * marca (BrandingOverlay); también se puede adelantar con un toque.
 * Solo se monta cuando la tómbola canta un número nuevo: si el
 * anfitrión manda una alerta durante 'revealed', al terminar NO
 * vuelve a aparecer.
 */
export function WinnerOverlay({ number, round, remaining, onClose }: WinnerOverlayProps) {
  // Ref siempre fresco para usarlo en el timer sin re-crear el efecto
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  })

  // Cierre automático a los 20 s (closure solo dentro del callback del timer)
  useEffect(() => {
    const t = setTimeout(() => closeRef.current(), 20000)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      className="animate-fade-in fixed inset-0 z-[70] flex items-center justify-center overflow-hidden bg-[#070402]/[.97]"
      role="dialog"
      aria-label={`Número ganador: ${number}`}
      onClick={() => closeRef.current()}
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

/** Fondo común de la portada: rayos dorados girando + viñeta oscura */
function PosterBackdrop() {
  return (
    <>
      {/* Rayos dorados girando de fondo */}
      <div className="rays-spin absolute left-1/2 top-1/2 h-[250vmax] w-[250vmax]" aria-hidden="true" />
      {/* Viñeta oscura para dar profundidad */}
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,.8)_82%)]"
        aria-hidden="true"
      />
    </>
  )
}

/**
 * Portada única del evento (el póster oficial de la Posada): rayos
 * dorados girando de fondo, logo 3D de Stratega, letrero LA GRAN NOCHE
 * YELLOWSTONE, título POSADA STRATEGA CONSULTORES 2026 y la marca de
 * hierro Y. Se usa tanto como pantalla de marca tras el número ganador
 * como pantalla de bloqueo/reposo.
 */
function PosterCover() {
  return (
    <div className="relative z-10 flex flex-col items-center gap-1 text-center sm:gap-2">
      <StrategaLogo className="h-28 w-28 animate-winner-pop object-contain drop-shadow-[0_0_44px_rgba(232,200,119,.55)] sm:h-44 sm:w-44" />
      <p className="mt-2 font-elite text-[clamp(12px,2vw,24px)] font-bold uppercase tracking-[0.5em] text-[#d8b45a] drop-shadow-[0_0_18px_rgba(201,162,39,.5)]">
        ★ La gran noche yellowstone ★
      </p>
      <p className="animate-winner-pop font-rye text-[clamp(52px,11vw,170px)] leading-[0.95] text-[#f3d27a] drop-shadow-[0_0_60px_rgba(201,162,39,.5)]">
        POSADA
      </p>
      <p className="animate-pop font-rye text-[clamp(24px,5.2vw,84px)] leading-tight text-[#e8c877] drop-shadow-[0_0_30px_rgba(201,162,39,.4)]">
        STRATEGA CONSULTORES
      </p>
      <p className="animate-winner-pop font-rye text-[clamp(52px,11vw,170px)] leading-[0.95] text-[#f3d27a] drop-shadow-[0_0_60px_rgba(201,162,39,.5)]">
        2026
      </p>
      <BrandY className="mt-3 h-10 w-10 opacity-90 sm:h-14 sm:w-14" />
    </div>
  )
}

/**
 * Pantalla de marca: tras los 20 s del número ganador, la pantalla grande
 * se convierte en el póster de la Posada. No se quita con toques: solo la
 * sustituyen una alerta (sirena) o un nuevo número cantado.
 */
export function BrandingOverlay() {
  return (
    <div
      className="animate-fade-in fixed inset-0 z-[60] flex items-center justify-center overflow-hidden bg-[#070402]"
      role="status"
      aria-label="Posada Stratega Consultores 2026"
    >
      <PosterBackdrop />
      <PosterCover />
    </div>
  )
}

/**
 * Pantalla de bloqueo (reposo): la MISMA portada del póster de la Posada
 * (único diseño de portada en todo el sistema).
 * Se activa con el botón BLOQUEAR PANTALLA del celular del anfitrión o
 * sola después de 3 minutos sin tocar nada. Cualquier toque o tecla en
 * la pantalla grande la despierta y regresa a la tómbola.
 */
export function LockOverlay() {
  return (
    <div
      className="animate-fade-in fixed inset-0 z-[90] flex items-center justify-center overflow-hidden bg-[#070402]"
      role="status"
      aria-label="Pantalla en reposo: La Gran Noche Yellowstone · Posada Stratega Consultores 2026"
    >
      <PosterBackdrop />
      <PosterCover />
    </div>
  )
}
