'use client'

import { useEffect, useRef, useState } from 'react'
import { Volume2, VolumeX, RotateCcw, Sparkles } from 'lucide-react'
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
import { Drum } from '@/components/tombola/drum'
import { QrPanel, Studs } from '@/components/tombola/qr-panel'
import { HistoryGrid } from '@/components/tombola/history-grid'
import { isMuted, loadMutePreference, playFanfare, playRoll, playTick, primeAudio, setMuted } from '@/lib/sounds'

export function ScreenView() {
  const { state, connected, notice, reset } = useTombola('screen')
  const [muted, setMutedState] = useState(true)
  const [flicker, setFlicker] = useState<number | null>(null)
  const prevPhase = useRef(state.phase)
  const prevCountdown = useRef(state.countdown)

  // Audio: se activa tras el primer toque en la pantalla (política del navegador)
  useEffect(() => {
    queueMicrotask(() => setMutedState(loadMutePreference()))
    const unlock = () => primeAudio()
    window.addEventListener('pointerdown', unlock, { once: true })
    return () => window.removeEventListener('pointerdown', unlock)
  }, [])

  // Sonidos de la cuenta atrás 5 → 0
  useEffect(() => {
    if (state.phase === 'countdown' && state.countdown !== prevCountdown.current) {
      playTick(state.countdown)
    }
    prevCountdown.current = state.countdown
  }, [state.phase, state.countdown])

  // Redoble al girar y fanfarria al revelar
  useEffect(() => {
    if (state.phase !== prevPhase.current) {
      if (state.phase === 'spinning') playRoll()
      if (state.phase === 'revealed') playFanfare()
      prevPhase.current = state.phase
    }
  }, [state.phase])

  // Números que parpadean mientras gira el tambor
  useEffect(() => {
    if (state.phase !== 'spinning') return
    const drawnSet = new Set(state.drawn)
    const id = setInterval(() => {
      let n = 0
      do {
        n = 1 + Math.floor(Math.random() * 100)
      } while (drawnSet.has(n))
      setFlicker(n)
    }, 90)
    return () => clearInterval(id)
  }, [state.phase, state.drawn])

  const toggleSound = () => {
    primeAudio()
    const next = !isMuted()
    setMuted(next)
    setMutedState(next)
  }

  const recent = [...state.drawn].reverse().slice(0, 12)

  return (
    <div className="wood-bg flex min-h-dvh flex-col text-[#f3e6c3]">
      {/* Aviso temporal (busy / empty) */}
      {notice && (
        <div
          role="status"
          className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-md border-2 border-[#c9a227] bg-[#2b1a0c]/95 px-4 py-2 font-elite text-sm text-[#f3d27a] shadow-xl"
        >
          {notice}
        </div>
      )}

      {/* Letrero del saloon */}
      <header className="border-b-4 border-[#5a3a1c] bg-[#1c1208]/80 px-4 py-4 text-center shadow-inner">
        <h1 className="font-rye text-2xl tracking-wide text-[#f3d27a] drop-shadow-[0_3px_0_rgba(0,0,0,.8)] sm:text-4xl">
          ★ TÓMBOLA DEL VIEJO OESTE ★
        </h1>
        <p className="mt-1 font-elite text-xs tracking-[0.25em] text-[#c9a97a] sm:text-sm">
          — SALOON · RIFAS JUSTAS DESDE 1885 —
        </p>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-3 py-5 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
          {/* Columna izquierda: tambor + resultado */}
          <div className="space-y-4">
            <Drum phase={state.phase} countdown={state.countdown} flicker={flicker} />

            {/* Cartel del resultado */}
            <section
              className="parchment relative rounded-md border-2 border-[#6b4423] p-4 text-center shadow-[0_10px_24px_rgba(0,0,0,.45)]"
              aria-live="polite"
            >
              <Studs />
              {state.phase === 'revealed' && state.lastNumber !== null ? (
                <>
                  <p className="font-elite text-sm uppercase tracking-[0.3em] text-[#8b1a1a]">
                    ¡Se cantó el número!
                  </p>
                  <p
                    key={state.lastNumber}
                    className="animate-pop font-rye text-6xl leading-tight text-[#8b1a1a] drop-shadow-[0_3px_0_rgba(0,0,0,.15)] sm:text-7xl"
                  >
                    {state.lastNumber}
                  </p>
                  <p className="font-elite text-sm text-[#5a3a1c]">
                    Fue el número <strong>#{state.drawn.length}</strong> de la ronda
                  </p>
                </>
              ) : state.phase === 'spinning' ? (
                <>
                  <p className="font-rye text-3xl text-[#8b1a1a] sm:text-4xl">¡Girando el tambor!</p>
                  <p className="mt-1 font-elite text-sm text-[#5a3a1c]">
                    La bola está por caer...
                  </p>
                </>
              ) : state.phase === 'countdown' ? (
                <>
                  <p className="font-rye text-3xl text-[#8b1a1a] sm:text-4xl">
                    Cantando en {state.countdown}...
                  </p>
                  <p className="mt-1 font-elite text-sm text-[#5a3a1c]">
                    Agárrense sus cartones, va a salir la bola
                  </p>
                </>
              ) : (
                <>
                  <p className="font-rye text-2xl text-[#3b2314] sm:text-3xl">
                    {state.remaining === 0 ? 'Se cantaron los 100 números' : 'El tambor está listo'}
                  </p>
                  <p className="mt-1 font-elite text-sm text-[#5a3a1c]">
                    {state.remaining === 0
                      ? 'Presionen «Nueva Ronda» para barajar de nuevo'
                      : 'Presiona el botón rojo desde el celular para cantar un número'}
                  </p>
                </>
              )}
            </section>

            {/* Controles de la pantalla */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={toggleSound}
                className="inline-flex items-center gap-2 rounded-md border-2 border-[#6b4423] bg-[#3b2314] px-4 py-2 font-elite text-sm text-[#f3e6c3] shadow transition hover:bg-[#4a2d18] active:scale-95"
                aria-pressed={!muted}
              >
                {muted ? (
                  <>
                    <VolumeX className="h-4 w-4" aria-hidden="true" /> Sonido apagado
                  </>
                ) : (
                  <>
                    <Volume2 className="h-4 w-4" aria-hidden="true" /> Sonido encendido
                  </>
                )}
              </button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-md border-2 border-[#7a2a1a] bg-gradient-to-b from-[#a3271c] to-[#7f1010] px-4 py-2 font-elite text-sm font-bold text-[#f3e6c3] shadow transition hover:from-[#b53427] active:scale-95"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" /> Nueva Ronda
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent className="border-2 border-[#6b4423] bg-[#f3e6c3] text-[#2b1a0c]">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-rye text-xl">¿Barajar de nuevo?</AlertDialogTitle>
                    <AlertDialogDescription className="font-elite text-[#5a3a1c]">
                      Se borrará el historial y los 100 números volverán al tambor. Esta acción no se
                      puede deshacer.
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

              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-elite text-xs ${
                  connected
                    ? 'border-[#4a6b2a] bg-[#243610] text-[#b8d98a]'
                    : 'border-[#7a2a1a] bg-[#361210] text-[#e8a094]'
                }`}
                role="status"
              >
                <span
                  className={`inline-block h-2 w-2 rounded-full ${connected ? 'bg-[#8fce5a]' : 'animate-pulse bg-[#e05a4a]'}`}
                  aria-hidden="true"
                />
                {connected ? 'Tómbola conectada' : 'Reconectando...'}
              </span>
            </div>
          </div>

          {/* Columna derecha: estadísticas + QR + últimos cantados */}
          <div className="space-y-4">
            <section className="rounded-md border-2 border-[#6b4423] bg-[#1c1208]/85 p-4 shadow-[0_10px_24px_rgba(0,0,0,.45)]">
              <h2 className="mb-3 flex items-center gap-2 font-rye text-lg text-[#f3d27a]">
                <Sparkles className="h-5 w-5 text-[#c9a227]" aria-hidden="true" />
                Marcador del saloon
              </h2>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-md border border-[#5a3a1c] bg-[#241608] p-3">
                  <p className="font-rye text-3xl text-[#f3d27a]">{state.drawn.length}</p>
                  <p className="font-elite text-xs text-[#c9a97a]">cantados</p>
                </div>
                <div className="rounded-md border border-[#5a3a1c] bg-[#241608] p-3">
                  <p className="font-rye text-3xl text-[#f3d27a]">{state.remaining}</p>
                  <p className="font-elite text-xs text-[#c9a97a]">quedan</p>
                </div>
                <div className="rounded-md border border-[#5a3a1c] bg-[#241608] p-3">
                  <p className="font-rye text-3xl text-[#f3d27a]">{state.total}</p>
                  <p className="font-elite text-xs text-[#c9a97a]">total</p>
                </div>
              </div>
            </section>

            <QrPanel />

            <section
              className="rounded-md border-2 border-[#6b4423] bg-[#1c1208]/85 p-4 shadow-[0_10px_24px_rgba(0,0,0,.45)]"
              aria-label="Últimos números cantados"
            >
              <h2 className="mb-3 font-rye text-lg text-[#f3d27a]">Últimos cantados</h2>
              {recent.length === 0 ? (
                <p className="font-elite text-sm text-[#c9a97a]">
                  Aún no ha caído ninguna bola. ¡Presiona el botón rojo!
                </p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {recent.map((n, i) => (
                    <li
                      key={`${n}-${i}`}
                      className={`flex h-11 w-11 flex-col items-center justify-center rounded-full border-2 font-elite font-bold shadow ${
                        i === 0
                          ? 'animate-pop border-[#c9a227] bg-gradient-to-b from-[#e0bd6a] to-[#c9a227] text-[#2b1a0c]'
                          : 'border-[#9c8a66] bg-[#f3e6c3] text-[#3b2314]'
                      }`}
                      title={i === 0 ? 'Último número cantado' : `Anterior: hace ${i}`}
                    >
                      <span className="text-[8px] leading-none opacity-70">#{state.drawn.length - i}</span>
                      <span className="text-sm leading-tight">{n}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>

        {/* Historial completo */}
        <div className="mt-6">
          <HistoryGrid drawn={state.drawn} lastNumber={state.lastNumber} />
        </div>
      </main>

      <footer className="mt-auto border-t-4 border-[#5a3a1c] bg-[#1c1208]/80 py-3 text-center">
        <p className="font-elite text-xs tracking-widest text-[#c9a97a]">
          ★ TÓMBOLA DEL VIEJO OESTE · JUEGO LIMPIO · SIN TRAMPA ★
        </p>
      </footer>
    </div>
  )
}
