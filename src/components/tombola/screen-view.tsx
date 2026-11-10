'use client'

import { useEffect, useRef, useState } from 'react'
import { ListOrdered, RotateCcw, Sparkles, Volume2, VolumeX } from 'lucide-react'
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
import type { Phase } from '@/lib/tombola'
import { decidePresentation } from '@/lib/tombola-present'
import { Drum } from '@/components/tombola/drum'
import { HistoryGrid } from '@/components/tombola/history-grid'
import { AlertOverlay, BrandingOverlay, LockOverlay, WinnerOverlay } from '@/components/tombola/overlays'
import { StoreWarning } from '@/components/tombola/store-warning'
import { MountainRidge, StrategaLogo, Studs } from '@/components/tombola/brand'
import { isMuted, loadMutePreference, playFanfare, playRoll, playSiren, playTick, primeAudio, setMuted } from '@/lib/sounds'

// Tiempo de inactividad antes de bloquear la pantalla grande (3 minutos)
const IDLE_LOCK_MS = 3 * 60 * 1000

export function ScreenView() {
  const { state, connected, notice, reset, store } = useTombola('screen')
  const [muted, setMutedState] = useState(true)
  const [flicker, setFlicker] = useState<number | null>(null)
  // Número cuyo overlay fullscreen se está mostrando (null = no mostrar)
  const [winnerNumber, setWinnerNumber] = useState<number | null>(null)
  // Pantalla de marca POSADA STRATEGA CONSULTORES 2026 (tras los 20 s del ganador)
  const [branding, setBranding] = useState(false)
  // Presentación del número ya terminada (overlay cerrado o alerta mandada):
  // el cuerpo de la pantalla vuelve a verse como la vista original de reposo
  const [presented, setPresented] = useState(false)
  // Portada de bloqueo (protector): el póster de la Posada — LA GRAN
  // NOCHE YELLOWSTONE · POSADA STRATEGA CONSULTORES 2026 (mismo diseño
  // que la pantalla de marca). Se activa con BLOQUEAR PANTALLA desde el
  // celular del anfitrión o sola tras 3 minutos sin tocar nada; cualquier
  // toque/tecla o evento del juego la despierta.
  const [locked, setLocked] = useState(false)
  const lastActivity = useRef(Date.now())
  // null = aún no llega la primera sincronización del servicio
  const prevPhase = useRef<Phase | null>(null)
  const prevCountdown = useRef(state.countdown)
  const prevAlertSeq = useRef<number | null>(null)
  const prevRevealSeq = useRef<number | null>(null)

  // Audio: se activa tras el primer toque en la pantalla (política del navegador)
  useEffect(() => {
    queueMicrotask(() => setMutedState(loadMutePreference()))
    const unlock = () => primeAudio()
    window.addEventListener('pointerdown', unlock, { once: true })
    return () => window.removeEventListener('pointerdown', unlock)
  }, [])

  // Sonidos de la cuenta atrás 5 → 0. Hasta que llega la primera
  // sincronización real del servidor, solo se toma el valor base.
  useEffect(() => {
    if (!connected) {
      prevCountdown.current = state.countdown
      return
    }
    if (state.phase === 'countdown' && state.countdown !== prevCountdown.current) {
      playTick(state.countdown)
    }
    prevCountdown.current = state.countdown
  }, [state.phase, state.countdown, connected])

  // Sirena cada vez que el anfitrión manda una alerta (alertSeq cambia).
  // La referencia base se toma en la PRIMERA SINCRONIZACIÓN REAL (connected),
  // nunca con el estado inicial del montaje: así si la página se (re)carga
  // después de haber mandado alertas, NO vuelve a sonar la sirena.
  useEffect(() => {
    if (!connected) return
    if (prevAlertSeq.current === null) {
      prevAlertSeq.current = state.alertSeq
      return
    }
    if (state.alertSeq !== prevAlertSeq.current) {
      if (state.alertSeq > 0) playSiren()
      prevAlertSeq.current = state.alertSeq
    }
  }, [state.alertSeq, connected])

  // BLOQUEAR/DESBLOQUEAR remoto: el anfitrión lo manda desde su celular y
  // el estado compartido (`locked`) manda. Así el mismo botón bloquea y
  // vuelve a despertar la pantalla, y el celular siempre muestra lo que
  // de verdad está pasando.
  useEffect(() => {
    if (!connected) return
    setLocked(state.locked)
    if (state.locked) lastActivity.current = Date.now()
  }, [state.locked, connected])

  // Redoble al girar y fanfarria al revelar. La decisión de qué se
  // presenta la toma decidePresentation(): el número ganador se abre con
  // el CONTADOR de revelaciones (revealSeq), así funciona aunque el
  // cliente se pierda fases intermedias (pestaña ralentizada por el
  // navegador, reconexiones, saltos de countdown/spinning a revealed).
  // Un número cantado SE PRESENTA SIEMPRE, aunque la fase ya haya
  // avanzado: si el anfitrión pidió la siguiente tirada antes de que la
  // pantalla lo notara, el número se ve igual (antes se perdía y al
  // volver a la tómbola parecía que salía otro).
  // Si la página se recarga a mitad de la presentación, NO se reabre el
  // ganador (la primera sincronización solo toma el contador base).
  // Al cerrarse el ganador (20 s o toque) entra la pantalla de marca, que se
  // quita cuando se manda una alerta o un número nuevo.
  useEffect(() => {
    // Espera a la PRIMERA SINCRONIZACIÓN REAL del servidor (connected):
    // el estado inicial del montaje no cuenta como sincronización
    if (!connected) return

    const p = decidePresentation(prevPhase.current, prevRevealSeq.current, state)
    prevPhase.current = state.phase
    prevRevealSeq.current = state.revealSeq

    if (p.alreadyPresented) {
      // La pantalla se cargó cuando el juego ya estaba en 'revealed':
      // esa presentación se da por terminada (vista original con el
      // historial), nunca se reabre el overlay.
      queueMicrotask(() => setPresented(true))
      return
    }

    if (p.winner !== null) {
      const numero = p.winner
      queueMicrotask(() => {
        setWinnerNumber(numero)
        setPresented(false)
      })
      playFanfare()
    }

    if (p.close) {
      queueMicrotask(() => {
        setWinnerNumber(null)
        setBranding(false)
        // La alerta corta la presentación: al apagarse la sirena la
        // pantalla grande muestra su vista original, no el último número
        if (state.phase === 'alert') setPresented(true)
      })
    }

    if (p.roll) playRoll()
  }, [state.phase, state.lastNumber, state.revealSeq, connected])

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

  // ── Bloqueo automático de la pantalla (3 minutos sin movimiento) ──
  // Registrar TODA interacción: toque, movimiento del mouse, tecla o rueda
  useEffect(() => {
    const mark = () => {
      lastActivity.current = Date.now()
    }
    window.addEventListener('pointerdown', mark, { passive: true })
    window.addEventListener('pointermove', mark, { passive: true })
    window.addEventListener('keydown', mark, { passive: true })
    window.addEventListener('wheel', mark, { passive: true })
    return () => {
      window.removeEventListener('pointerdown', mark)
      window.removeEventListener('pointermove', mark)
      window.removeEventListener('keydown', mark)
      window.removeEventListener('wheel', mark)
    }
  }, [])

  // Si pasan 3 minutos sin tocar nada, la pantalla se bloquea sola
  useEffect(() => {
    const id = setInterval(() => {
      if (Date.now() - lastActivity.current >= IDLE_LOCK_MS) {
        setLocked(true)
      }
    }, 1000)
    return () => clearInterval(id)
  }, [])

  // Despertar: cualquier toque o tecla cuando está bloqueada
  useEffect(() => {
    if (!locked) return
    const wake = () => {
      setLocked(false)
      lastActivity.current = Date.now()
    }
    window.addEventListener('pointerdown', wake)
    window.addEventListener('keydown', wake)
    return () => {
      window.removeEventListener('pointerdown', wake)
      window.removeEventListener('keydown', wake)
    }
  }, [locked])

  // La tómbola despierta la pantalla: sirena, conteo, giro o número nuevo
  useEffect(() => {
    lastActivity.current = Date.now()
    setLocked((was) => (was ? false : was))
  }, [state.phase])

  const toggleSound = () => {
    primeAudio()
    const next = !isMuted()
    setMuted(next)
    setMutedState(next)
  }

  const recent = [...state.drawn].reverse().slice(0, 12)
  const pct = Math.round((state.drawn.length / state.total) * 100)

  // Fase que pinta el cuerpo de la pantalla: cuando el número ya se presentó
  // (overlay cerrado, alerta mandada o recarga de la página), la vista es la
  // original de reposo aunque la fase real siga siendo 'revealed' para
  // permitir la siguiente tirada
  const displayPhase =
    state.phase === 'revealed' && presented ? 'idle' : state.phase

  return (
    <div className="wood-bg flex min-h-dvh flex-col text-[#f3e6c3]">
      {/* Aviso grande si el estado no se está compartiendo (pantalla y
          celular no se sincronizarían) */}
      <StoreWarning store={store} />

      {/* Aviso temporal (busy / empty) */}
      {notice && (
        <div
          role="status"
          className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-md border-2 border-[#c9a227] bg-[#2b1a0c]/95 px-4 py-2 font-elite text-sm text-[#f3d27a] shadow-xl"
        >
          {notice}
        </div>
      )}

      {/* Sirena de alerta del rancho (la manda el anfitrión desde el celular) */}
      {state.phase === 'alert' && <AlertOverlay />}

      {/* Número ganador a pantalla completa (se abre al cantarse un número
          nuevo). No depende de la fase: si el anfitrión ya pidió la
          siguiente tirada, el número se presenta igual y la cuenta atrás
          sigue corriendo detrás del overlay. */}
      {winnerNumber !== null && (
        <WinnerOverlay
          number={winnerNumber}
          round={state.drawn.length}
          remaining={state.remaining}
          onClose={() => {
            setWinnerNumber(null)
            setBranding(true)
            setPresented(true)
          }}
        />
      )}

      {/* Pantalla de marca: permanece hasta la próxima alerta o número */}
      {branding && state.phase === 'revealed' && <BrandingOverlay />}

      {/* Portada de bloqueo: el póster de la Posada (única portada).
          Cualquier toque, tecla o evento de la tómbola la despierta. */}
      {locked && <LockOverlay />}

      {/* Cabecera compacta: logo + letrero + controles */}
      <header className="relative z-20 overflow-hidden border-b-4 border-[#6e1a14] bg-[#0d0a06]/90 shadow-inner">
        <div className="mx-auto flex w-full max-w-[1700px] flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2.5 sm:px-5">
          <StrategaLogo className="h-12 w-12 shrink-0 object-contain sm:h-14 sm:w-14" />
          <div className="min-w-0">
            <h1 className="font-rye text-lg leading-tight tracking-wide text-[#e6d9b8] drop-shadow-[0_3px_0_rgba(0,0,0,.8)] sm:text-2xl">
              TÓMBOLA DEL RANCHO
            </h1>
            <p className="font-elite text-[10px] font-bold tracking-[0.3em] text-[#d43a2a] sm:text-xs">
              YELLOWSTONE · ESTANCIA STRATEGA
            </p>
          </div>

          {/* Controles de la pantalla */}
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            {/* Insignia de la lista programada (solo visible si el jefe activó su lista) */}
            {state.fixedQueue.length > 0 && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full border border-[#8a6a1c] bg-[#2b2210] px-3 py-1 font-elite text-xs font-bold text-[#e8c877]"
                role="status"
              >
                <ListOrdered className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden md:inline">Lista del jefe:</span> {state.fixedQueue.length}
              </span>
            )}
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
              <span className="hidden md:inline">{connected ? 'Tómbola conectada' : 'Reconectando...'}</span>
            </span>

            <button
              type="button"
              onClick={toggleSound}
              className="inline-flex items-center gap-2 rounded-md border-2 border-[#6b4423] bg-[#3b2314] px-3 py-1.5 font-elite text-sm text-[#f3e6c3] shadow transition hover:bg-[#4a2d18] active:scale-95"
              aria-pressed={!muted}
            >
              {muted ? (
                <>
                  <VolumeX className="h-4 w-4" aria-hidden="true" /> <span className="hidden sm:inline">Sonido apagado</span>
                </>
              ) : (
                <>
                  <Volume2 className="h-4 w-4" aria-hidden="true" /> <span className="hidden sm:inline">Sonido encendido</span>
                </>
              )}
            </button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-md border-2 border-[#7a2a1a] bg-gradient-to-b from-[#a3271c] to-[#7f1010] px-3 py-1.5 font-elite text-sm font-bold text-[#f3e6c3] shadow transition hover:from-[#b53427] active:scale-95"
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
          </div>
        </div>
        <MountainRidge className="pointer-events-none absolute bottom-0 left-0 h-7 w-full opacity-70" />
      </header>

      {/* Cuerpo: panel lateral izquierdo + zona central con la tómbola */}
      <main className="mx-auto grid w-full max-w-[1700px] flex-1 gap-4 px-3 py-4 sm:px-5 lg:grid-cols-[minmax(300px,360px)_minmax(0,1fr)] lg:items-start xl:grid-cols-[380px_minmax(0,1fr)] 2xl:grid-cols-[380px_minmax(0,1fr)_360px]">
        {/* ── Panel lateral izquierdo: marcador + historial completo ── */}
        <aside className="order-2 flex flex-col gap-4 lg:order-1 lg:sticky lg:top-3 lg:max-h-[calc(100dvh-9.5rem)]">
          <section
            className="rounded-md border-2 border-[#6b4423] bg-[#1c1208]/90 p-3 shadow-[0_10px_24px_rgba(0,0,0,.45)]"
            aria-label="Marcador del rancho"
          >
            <h2 className="mb-2 flex items-center gap-2 font-rye text-base text-[#f3d27a]">
              <Sparkles className="h-5 w-5 text-[#c9a227]" aria-hidden="true" />
              Marcador del rancho
            </h2>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md border border-[#5a3a1c] bg-[#241608] px-1 py-2 shadow-inner">
                <p className="font-rye text-2xl leading-none text-[#f3d27a] sm:text-3xl">
                  {state.drawn.length}
                </p>
                <p className="mt-1 font-elite text-[10px] uppercase tracking-[0.2em] text-[#c9a97a]">
                  cantados
                </p>
              </div>
              <div className="rounded-md border border-[#5a3a1c] bg-[#241608] px-1 py-2 shadow-inner">
                <p className="font-rye text-2xl leading-none text-[#f3d27a] sm:text-3xl">
                  {state.remaining}
                </p>
                <p className="mt-1 font-elite text-[10px] uppercase tracking-[0.2em] text-[#c9a97a]">
                  quedan
                </p>
              </div>
              <div className="rounded-md border border-[#5a3a1c] bg-[#241608] px-1 py-2 shadow-inner">
                <p className="font-rye text-2xl leading-none text-[#f3d27a] sm:text-3xl">
                  {state.total}
                </p>
                <p className="mt-1 font-elite text-[10px] uppercase tracking-[0.2em] text-[#c9a97a]">
                  total
                </p>
              </div>
            </div>

            {/* Progreso de la ronda */}
            <div className="mt-3">
              <div
                className="h-2.5 overflow-hidden rounded-full border border-[#5a3a1c] bg-[#120b04]"
                role="progressbar"
                aria-label="Progreso de la ronda"
                aria-valuemin={0}
                aria-valuemax={state.total}
                aria-valuenow={state.drawn.length}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#8b1a1a] via-[#c9a227] to-[#e8c877] transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1 text-center font-elite text-[10px] tracking-[0.25em] text-[#a8987a]">
                PROGRESO DE LA RONDA · {pct}%
              </p>
            </div>
          </section>

          <HistoryGrid
            drawn={state.drawn}
            lastNumber={state.lastNumber}
            className="lg:min-h-0 lg:flex-1"
          />
        </aside>

        {/* ── Zona central: tambor protagonista ocupando el centro + cartel ── */}
        <div className="order-1 flex min-w-0 flex-col items-center gap-4 lg:order-2">
          <Drum
            phase={displayPhase}
            countdown={state.countdown}
            flicker={flicker}
            lastNumber={state.lastNumber}
          />

          {/* Cartel del resultado */}
          <section
            className="parchment relative w-full max-w-3xl rounded-md border-2 border-[#6b4423] p-4 text-center shadow-[0_10px_24px_rgba(0,0,0,.45)]"
            aria-live="polite"
          >
            <Studs />
            {displayPhase === 'revealed' && state.lastNumber !== null ? (
              <>
                <p className="font-elite text-sm uppercase tracking-[0.3em] text-[#8b1a1a]">
                  ¡Se cantó el número!
                </p>
                <p
                  key={state.lastNumber}
                  className="animate-pop font-rye text-7xl leading-tight text-[#8b1a1a] drop-shadow-[0_3px_0_rgba(0,0,0,.15)] sm:text-8xl"
                >
                  {state.lastNumber}
                </p>
                <p className="font-elite text-sm text-[#5a3a1c]">
                  Fue el número <strong>#{state.drawn.length}</strong> de la ronda
                </p>
              </>
            ) : displayPhase === 'alert' ? (
              <>
                <p className="font-rye text-3xl text-[#8b1a1a] sm:text-4xl">⚠ ¡Alerta! ⚠</p>
                <p className="mt-1 font-elite text-sm text-[#5a3a1c]">
                  La nueva rifa está por comenzar...
                </p>
              </>
            ) : displayPhase === 'spinning' ? (
              <>
                <p className="font-rye text-3xl text-[#8b1a1a] sm:text-4xl">¡Girando el tambor!</p>
                <p className="mt-1 font-elite text-sm text-[#5a3a1c]">
                  La bola está por caer...
                </p>
              </>
            ) : displayPhase === 'countdown' ? (
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
        </div>

        {/* ── Últimos cantados: bajo el cartel en pantallas medianas y como
            columna derecha en pantallas grandes (2xl), para que el tambor
            domine el centro de la proyección ── */}
        <div className="order-3 w-full lg:col-span-2 2xl:col-span-1">
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
      </main>

      <footer className="mt-auto border-t-4 border-[#5a3a1c] bg-[#1c1208]/80 py-2.5 text-center">
        <p className="font-elite text-[11px] tracking-widest text-[#a8987a]">
          ★ RANCHO YELLOWSTONE · TÓMBOLA STRATEGA · JUEGO LIMPIO · SIN TRAMPA ★
        </p>
      </footer>
    </div>
  )
}
