'use client'

import { useEffect, useRef } from 'react'
import { Hand, ListOrdered, RotateCcw, Siren, Smartphone, Wifi, WifiOff } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useTombola } from '@/hooks/use-tombola'
import { Studs } from '@/components/tombola/qr-panel'
import { BrandY, StrategaLogo } from '@/components/tombola/brand'
import { playClick, playFanfare, playRoll, playSiren, playTick, primeAudio } from '@/lib/sounds'

export function ControllerView() {
  const { state, connected, notice, press, sendAlert, reset } = useTombola('controller')
  const prevPhase = useRef(state.phase)
  const prevCountdown = useRef(state.countdown)
  const prevAlertSeq = useRef(state.alertSeq)

  // Desbloquear audio en el primer toque
  useEffect(() => {
    const unlock = () => primeAudio()
    window.addEventListener('pointerdown', unlock, { once: true })
    return () => window.removeEventListener('pointerdown', unlock)
  }, [])

  // Vibración + sonido de la cuenta atrás
  useEffect(() => {
    if (state.phase === 'countdown' && state.countdown !== prevCountdown.current) {
      playTick(state.countdown)
      try {
        navigator.vibrate?.(state.countdown === 0 ? 180 : 70)
      } catch {
        // sin vibración
      }
    }
    prevCountdown.current = state.countdown
  }, [state.phase, state.countdown])

  // Sirena + vibración cada vez que se manda una alerta (alertSeq cambia)
  useEffect(() => {
    if (state.alertSeq !== prevAlertSeq.current) {
      if (state.alertSeq > 0) {
        playSiren()
        try {
          navigator.vibrate?.([250, 120, 250, 120, 250])
        } catch {
          // sin vibración
        }
      }
      prevAlertSeq.current = state.alertSeq
    }
  }, [state.alertSeq])

  useEffect(() => {
    if (state.phase !== prevPhase.current) {
      if (state.phase === 'spinning') {
        playRoll()
        try {
          navigator.vibrate?.([90, 60, 90])
        } catch {
          // sin vibración
        }
      }
      if (state.phase === 'revealed') {
        playFanfare()
        try {
          navigator.vibrate?.([220, 80, 220])
        } catch {
          // sin vibración
        }
      }
      prevPhase.current = state.phase
    }
  }, [state.phase])

  const busy = state.phase === 'countdown' || state.phase === 'spinning'
  const empty = state.remaining <= 0
  const disabled = !connected || busy || empty
  // La alerta solo se bloquea mientras la tómbola está trabajando
  const alertDisabled = !connected || busy

  const handlePress = () => {
    if (disabled) return
    playClick()
    try {
      navigator.vibrate?.(60)
    } catch {
      // sin vibración
    }
    press()
  }

  const handleAlert = () => {
    if (alertDisabled) return
    try {
      navigator.vibrate?.(60)
    } catch {
      // sin vibración
    }
    sendAlert()
  }

  return (
    <div className="wood-bg flex min-h-dvh flex-col items-center px-4 pb-8 pt-6 text-[#f3e6c3]">
      {/* Aviso temporal */}
      {notice && (
        <div
          role="status"
          className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-md border-2 border-[#c9a227] bg-[#2b1a0c]/95 px-4 py-2 font-elite text-sm text-[#f3d27a] shadow-xl"
        >
          {notice}
        </div>
      )}

      <header className="mb-5 text-center">
        <div className="flex items-center justify-center gap-3">
          <StrategaLogo className="h-12 w-12 object-contain sm:h-14 sm:w-14" />
          <BrandY className="h-9 w-9 drop-shadow-[0_2px_6px_rgba(0,0,0,.8)] sm:h-11 sm:w-11" />
        </div>
        <p className="mt-1.5 flex items-center justify-center gap-2 font-elite text-xs tracking-[0.3em] text-[#a8987a]">
          <Smartphone className="h-4 w-4" aria-hidden="true" /> CONTROL REMOTO
        </p>
        <h1 className="font-rye text-2xl text-[#e6d9b8] drop-shadow-[0_3px_0_rgba(0,0,0,.8)] sm:text-3xl">
          RANCHO YELLOWSTONE
        </h1>
        <p className="font-elite text-[10px] font-bold tracking-[0.3em] text-[#d43a2a] sm:text-xs">
          ESTANCIA STRATEGA · TÓMBOLA DEL RANCHO
        </p>
      </header>

      {/* Estado de conexión */}
      <span
        className={`mb-5 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-elite text-xs ${
          connected
            ? 'border-[#4a6b2a] bg-[#243610] text-[#b8d98a]'
            : 'border-[#7a2a1a] bg-[#361210] text-[#e8a094]'
        }`}
        role="status"
      >
        {connected ? (
          <>
            <Wifi className="h-3.5 w-3.5" aria-hidden="true" /> Conectado a la tómbola
          </>
        ) : (
          <>
            <WifiOff className="h-3.5 w-3.5 animate-pulse" aria-hidden="true" /> Reconectando...
          </>
        )}
      </span>

      {/* Espejo del estado del juego */}
      <div
        className="parchment relative mb-6 w-full max-w-sm rounded-md border-2 border-[#6b4423] p-4 text-center text-[#3b2314] shadow-[0_10px_24px_rgba(0,0,0,.45)]"
        aria-live="polite"
      >
        <Studs />
        {state.phase === 'alert' ? (
          <>
            <p className="font-elite text-xs uppercase tracking-[0.25em] text-[#8b1a1a]">
              Sirena activada
            </p>
            <p className="animate-pulse-fast font-rye text-4xl leading-tight text-[#8b1a1a]">
              ⚠ ¡Alerta! ⚠
            </p>
            <p className="mt-1 font-elite text-sm text-[#5a3a1c]">
              La rifa va a comenzar, agarra tu cartón
            </p>
          </>
        ) : state.phase === 'countdown' ? (
          <>
            <p className="font-elite text-xs uppercase tracking-[0.25em] text-[#8b1a1a]">Cantando en</p>
            <p key={state.countdown} className="animate-pop font-rye text-7xl leading-tight text-[#8b1a1a]">
              {state.countdown}
            </p>
          </>
        ) : state.phase === 'spinning' ? (
          <>
            <p className="font-rye text-2xl text-[#8b1a1a]">¡Girando el tambor!</p>
            <p className="mt-1 font-elite text-sm text-[#5a3a1c]">La bola está por caer...</p>
          </>
        ) : state.phase === 'revealed' && state.lastNumber !== null ? (
          <>
            <p className="font-elite text-xs uppercase tracking-[0.25em] text-[#8b1a1a]">Salió el número</p>
            <p key={state.lastNumber} className="animate-pop font-rye text-7xl leading-tight text-[#8b1a1a]">
              {state.lastNumber}
            </p>
            <p className="font-elite text-sm text-[#5a3a1c]">
              Quedan {state.remaining} bolas en el tambor
            </p>
          </>
        ) : empty ? (
          <>
            <p className="font-rye text-2xl text-[#3b2314]">¡Se acabaron las bolas!</p>
            <p className="mt-1 font-elite text-sm text-[#5a3a1c]">
              Reinicia para una nueva ronda desde la pantalla principal o aquí abajo
            </p>
          </>
        ) : (
          <>
            <p className="font-rye text-2xl text-[#3b2314]">El tambor está listo</p>
            <p className="mt-1 font-elite text-sm text-[#5a3a1c]">
              Quedan {state.remaining} de {state.total} bolas · se han cantado {state.drawn.length}
            </p>
          </>
        )}
      </div>

      {/* Botón rojo gigante */}
      <div className="flex flex-col items-center">
        <div className="relative">
          {/* Base de madera */}
          <div className="absolute -bottom-3 left-1/2 h-8 w-[115%] -translate-x-1/2 rounded-[50%] bg-gradient-to-b from-[#6b4423] to-[#3b2314] shadow-[0_8px_18px_rgba(0,0,0,.6)]" />
          <button
            type="button"
            onClick={handlePress}
            disabled={disabled}
            aria-label="Cantar un número de la tómbola"
            className={`relative flex h-44 w-44 items-center justify-center rounded-full border-[10px] font-rye text-xl leading-tight shadow-[0_14px_0_#4d0a0a,0_20px_36px_rgba(0,0,0,.55)] transition-all duration-100 sm:h-52 sm:w-52 sm:text-2xl ${
              disabled
                ? 'cursor-not-allowed border-[#5a1010] bg-gradient-to-b from-[#8a3a34] to-[#5a1512] text-[#d8b0a8]'
                : 'border-[#7f1010] bg-gradient-to-b from-[#e04b3a] via-[#c62828] to-[#8f1512] text-[#fff3e0] hover:brightness-110 active:translate-y-2 active:shadow-[0_4px_0_#4d0a0a,0_8px_18px_rgba(0,0,0,.5)]'
            }`}
          >
            <span className="pointer-events-none absolute left-[18%] top-[12%] h-6 w-10 rounded-full bg-white/25 blur-[6px]" aria-hidden="true" />
            {busy
              ? 'EN MARCHA'
              : empty
                ? 'VACÍO'
                : state.phase === 'revealed'
                  ? 'CANTAR OTRO'
                  : 'CANTAR NÚMERO'}
          </button>
        </div>
        <p className="mt-6 flex items-center gap-1.5 font-elite text-xs text-[#c9a97a]">
          <Hand className="h-3.5 w-3.5" aria-hidden="true" />
          {disabled
            ? busy
              ? 'La tómbola está trabajando...'
              : 'No hay números por cantar'
            : state.phase === 'revealed'
              ? 'Presiona para cantar otro número'
              : 'Presiona para iniciar la cuenta 5 → 0'}
        </p>
        {/* Aviso discreto para el anfitrión cuando su lista programada está activa */}
        {state.fixedQueue.length > 0 && (
          <p className="mt-1.5 flex items-center justify-center gap-1.5 font-elite text-xs font-bold text-[#e8c877]">
            <ListOrdered className="h-3.5 w-3.5" aria-hidden="true" />
            Lista del jefe: saldrá el {state.fixedQueue[0]} ({state.fixedQueue.length} programados)
          </p>
        )}
      </div>

      {/* Botón de ALERTA: solo manda la sirena a las pantallas */}
      <div className="mt-6 w-full max-w-sm">
        <button
          type="button"
          onClick={handleAlert}
          disabled={alertDisabled}
          aria-label="Mandar la sirena de alerta a todas las pantallas"
          className={`flex w-full items-center justify-center gap-3 rounded-md border-2 px-6 py-4 font-rye text-xl shadow-[0_8px_0_#4a3510,0_14px_26px_rgba(0,0,0,.5)] transition-all duration-100 ${
            alertDisabled
              ? 'cursor-not-allowed border-[#4a3a24] bg-gradient-to-b from-[#4a3a28] to-[#33271a] text-[#9a8a6a]'
              : state.phase === 'alert'
                ? 'animate-pulse-fast border-[#e8c877] bg-gradient-to-b from-[#f0d070] to-[#c9a227] text-[#2b1a0c]'
                : 'border-[#8a6a1c] bg-gradient-to-b from-[#e0bd6a] to-[#b8860b] text-[#2b1a0c] hover:brightness-110 active:translate-y-1.5 active:shadow-[0_3px_0_#4a3510,0_6px_14px_rgba(0,0,0,.45)]'
          }`}
        >
          <Siren className="h-6 w-6 shrink-0" aria-hidden="true" />
          {state.phase === 'alert' ? '¡SIRENA SONANDO!' : 'MANDAR ALERTA'}
        </button>
        <p className="mt-2 text-center font-elite text-xs text-[#c9a97a]">
          Toca para llamar la atención de todos: sonará la sirena en la pantalla
        </p>
      </div>

      {/* Últimos 5 números */}
      {state.drawn.length > 0 && (
        <section
          className="mt-7 w-full max-w-sm rounded-md border-2 border-[#6b4423] bg-[#1c1208]/85 p-4 shadow-[0_10px_24px_rgba(0,0,0,.45)]"
          aria-label="Últimos números cantados"
        >
          <h2 className="mb-2 font-rye text-base text-[#f3d27a]">Últimos cantados</h2>
          <ul className="flex flex-wrap gap-2">
            {[...state.drawn]
              .reverse()
              .slice(0, 5)
              .map((n, i) => (
                <li
                  key={`${n}-${i}`}
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 font-elite font-bold ${
                    i === 0
                      ? 'border-[#c9a227] bg-gradient-to-b from-[#e0bd6a] to-[#c9a227] text-[#2b1a0c]'
                      : 'border-[#9c8a66] bg-[#f3e6c3] text-[#3b2314]'
                  }`}
                >
                  {n}
                </li>
              ))}
          </ul>
        </section>
      )}

      {/* Reiniciar ronda */}
      <div className="mt-6">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md border-2 border-[#5a3a1c] bg-[#241608] px-4 py-2 font-elite text-sm text-[#f3e6c3] shadow transition hover:bg-[#33200f] active:scale-95"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Nueva Ronda
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent className="border-2 border-[#6b4423] bg-[#f3e6c3] text-[#2b1a0c]">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-rye text-xl">¿Barajar de nuevo?</AlertDialogTitle>
              <AlertDialogDescription className="font-elite text-[#5a3a1c]">
                Se borrará el historial y los 100 números volverán al tambor. Esta acción no se puede
                deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-[#6b4423] bg-transparent font-elite text-[#3b2314] hover:bg-[#e0c68f]">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={reset}
                className="bg-[#8b1a1a] font-elite text-[#f3e6c3] hover:bg-[#a3271c]"
              >
                Sí, nueva ronda
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <footer className="mt-auto pt-8 text-center">
        <p className="font-elite text-[11px] tracking-widest text-[#8a7a58]">
          ESTANCIA STRATEGA · MANTÉN ESTA PANTALLA ABIERTA PARA CONTROLAR LA TÓMBOLA
        </p>
      </footer>
    </div>
  )
}
