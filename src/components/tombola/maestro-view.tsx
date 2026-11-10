'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Eraser, KeyRound, ListOrdered, Moon, Wifi, WifiOff } from 'lucide-react'
import { useTombola } from '@/hooks/use-tombola'
import { Studs } from '@/components/tombola/brand'
import { BrandY, StrategaLogo } from '@/components/tombola/brand'
import { playClick, primeAudio } from '@/lib/sounds'

// Misma contraseña privada del anfitrión que el panel QR de la pantalla
const JEFE_PASSWORD = 'Strategapool_2026'
const SESSION_KEY = 'stratega-jefe-ok'

/**
 * Página secreta "La lista del jefe" (se abre con el QR oculto de la
 * marca Y): permite al anfitrión decidir qué números del 1 al 100
 * saldrán del tambor y en qué orden. Mientras la lista tenga números,
 * cada "CANTAR NÚMERO" saca el siguiente de ella; al vaciarse, el
 * tambor vuelve a cantar al azar.
 */
export function MaestroView() {
  const { state, connected, sendQueue, lockScreen } = useTombola('controller')
  const [unlocked, setUnlocked] = useState(false)
  const [pw, setPw] = useState('')
  const [error, setError] = useState(false)
  // Confirmación breve al bloquear la pantalla grande desde aquí
  const [lockSent, setLockSent] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Si ya desbloqueó en esta sesión del celular, no volver a preguntar
  useEffect(() => {
    queueMicrotask(() => {
      try {
        if (sessionStorage.getItem(SESSION_KEY) === '1') setUnlocked(true)
      } catch {
        // almacenamiento no disponible
      }
    })
  }, [])

  const unlock = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (pw === JEFE_PASSWORD) {
      setUnlocked(true)
      setError(false)
      setPw('')
      try {
        sessionStorage.setItem(SESSION_KEY, '1')
      } catch {
        // sin almacenamiento
      }
    } else {
      setError(true)
      setPw('')
      inputRef.current?.focus()
    }
  }

  const queue = state.fixedQueue
  const drawnSet = new Set(state.drawn)

  const addNumber = (n: number) => {
    if (drawnSet.has(n) || queue.includes(n)) return
    primeAudio()
    playClick()
    try {
      navigator.vibrate?.(40)
    } catch {
      // sin vibración
    }
    sendQueue([...queue, n])
  }

  const removeNumber = (n: number) => {
    playClick()
    sendQueue(queue.filter((x) => x !== n))
  }

  const clearQueue = () => {
    if (queue.length === 0) return
    playClick()
    sendQueue([])
  }

  // BLOQUEAR PANTALLA desde el celular del jefe: la pantalla grande pasa
  // a reposo (logo + LA GRAN NOCHE + POSADA STRATEGA CONSULTORES 2026)
  const handleLock = () => {
    playClick()
    try {
      navigator.vibrate?.(60)
    } catch {
      // sin vibración
    }
    lockScreen()
    setLockSent(true)
    setTimeout(() => setLockSent(false), 2500)
  }

  if (!unlocked) {
    // ── Cerradura del jefe ──
    return (
      <div className="wood-bg flex min-h-dvh flex-col items-center px-4 pb-10 pt-14 text-[#f3e6c3]">
        <div className="mb-5 flex items-center justify-center gap-3">
          <StrategaLogo className="h-14 w-14 object-contain" />
          <BrandY className="h-10 w-10 drop-shadow-[0_2px_6px_rgba(0,0,0,.8)]" />
        </div>
        <div className="parchment relative w-full max-w-sm rounded-md border-2 border-[#6b4423] p-5 text-center text-[#3b2314] shadow-[0_10px_24px_rgba(0,0,0,.45)]">
          <Studs />
          <KeyRound className="mx-auto h-7 w-7 text-[#8b1a1a]" aria-hidden="true" />
          <h1 className="mt-1 font-rye text-2xl">LA LISTA DEL JEFE</h1>
          <p className="mt-1 font-elite text-sm leading-snug text-[#5a4626]">
            Página privada del anfitrión. Introduce la contraseña para programar los números que
            saldrán del tambor.
          </p>
          <form onSubmit={unlock} className={`mt-4 ${error ? 'animate-shake' : ''}`}>
            <input
              ref={inputRef}
              type="password"
              value={pw}
              onChange={(e) => {
                setPw(e.target.value)
                setError(false)
              }}
              placeholder="Contraseña del anfitrión"
              aria-label="Contraseña del anfitrión"
              autoComplete="off"
              className="w-full rounded-md border-2 border-[#4a3a24] bg-[#f5efdd] px-3 py-2.5 text-center font-elite text-sm text-[#33240f] shadow-inner outline-none placeholder:text-[#a08c60] focus:border-[#8b1a1a]"
            />
            <button
              type="submit"
              className="mt-2 w-full rounded-md border-2 border-[#5a1610] bg-gradient-to-b from-[#a3271c] to-[#7f1010] px-4 py-2.5 font-elite text-sm font-bold text-[#f5efdd] shadow transition hover:from-[#b53427] active:scale-95"
            >
              Entrar
            </button>
            {error && (
              <p role="alert" className="mt-2 font-elite text-sm font-bold text-[#8b1a1a]">
                ✗ Contraseña incorrecta
              </p>
            )}
          </form>
        </div>
        <p className="mt-5 font-elite text-[10px] tracking-[0.3em] text-[#8a7a58]">
          ESTANCIA STRATEGA · SOLO PARA EL ANFITRIÓN
        </p>
      </div>
    )
  }

  return (
    <div className="wood-bg flex min-h-dvh flex-col items-center px-4 pb-10 pt-6 text-[#f3e6c3]">
      <header className="mb-4 text-center">
        <div className="flex items-center justify-center gap-3">
          <StrategaLogo className="h-11 w-11 object-contain sm:h-12 sm:w-12" />
          <BrandY className="h-8 w-8 drop-shadow-[0_2px_6px_rgba(0,0,0,.8)] sm:h-9 sm:w-9" />
        </div>
        <h1 className="mt-1 font-rye text-2xl text-[#e6d9b8] drop-shadow-[0_3px_0_rgba(0,0,0,.8)] sm:text-3xl">
          LA LISTA DEL JEFE
        </h1>
        <p className="font-elite text-[10px] font-bold tracking-[0.3em] text-[#d43a2a] sm:text-xs">
          DECIDE QUÉ NÚMEROS SALDRÁN DEL TAMBOR
        </p>
      </header>

      {/* Estado de conexión */}
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-elite text-xs ${
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

      {/* Espejo rápido del juego */}
      <div
        className="parchment relative mb-4 mt-4 w-full max-w-md rounded-md border-2 border-[#6b4423] p-3 text-center text-[#3b2314] shadow-[0_10px_24px_rgba(0,0,0,.45)]"
        aria-live="polite"
      >
        <Studs />
        {state.phase === 'revealed' && state.lastNumber !== null ? (
          <p className="font-elite text-sm text-[#5a4626]">
            Último cantado:{' '}
            <strong className="font-rye text-2xl leading-none text-[#8b1a1a]">
              {state.lastNumber}
            </strong>{' '}
            · quedan {state.remaining} bolas
          </p>
        ) : state.phase === 'countdown' || state.phase === 'spinning' ? (
          <p className="font-elite text-sm font-bold text-[#8b1a1a]">
            ¡El tambor está trabajando! La bola está por caer...
          </p>
        ) : (
          <p className="font-elite text-sm text-[#5a4626]">
            Cantados {state.drawn.length} · quedan {state.remaining} de {state.total} bolas
          </p>
        )}
      </div>

      {/* Cola programada */}
      <section
        className="mb-4 w-full max-w-md rounded-md border-2 border-[#6b4423] bg-[#1c1208]/85 p-4 shadow-[0_10px_24px_rgba(0,0,0,.45)]"
        aria-label="Números programados por el jefe"
      >
        <div className="mb-2 flex items-center gap-2">
          <ListOrdered className="h-5 w-5 text-[#c9a227]" aria-hidden="true" />
          <h2 className="font-rye text-lg text-[#f3d27a]">Próximos a salir</h2>
          {queue.length > 0 && (
            <button
              type="button"
              onClick={clearQueue}
              className="ml-auto inline-flex items-center gap-1 rounded-md border border-[#7a2a1a] bg-[#361210] px-2.5 py-1 font-elite text-xs font-bold text-[#e8a094] shadow transition hover:bg-[#4a1a12] active:scale-95"
            >
              <Eraser className="h-3 w-3" aria-hidden="true" /> Limpiar lista
            </button>
          )}
        </div>
        {queue.length === 0 ? (
          <p className="font-elite text-sm leading-snug text-[#c9a97a]">
            Lista vacía: el tambor canta al azar. Toca números de la tabla para programarlos.
          </p>
        ) : (
          <ol className="flex flex-wrap gap-1.5" aria-label="Orden en que saldrán los números">
            {queue.map((n, i) => (
              <li
                key={n}
                className="flex h-10 w-11 flex-col items-center justify-center rounded-full border-2 border-[#e8c877] bg-gradient-to-b from-[#e0bd6a] to-[#c9a227] font-elite font-bold text-[#2b1a0c] shadow"
              >
                <span className="text-[8px] leading-none opacity-75">#{i + 1}</span>
                <span className="text-sm leading-tight">{n}</span>
              </li>
            ))}
          </ol>
        )}
        <p className="mt-2 font-elite text-[10px] leading-snug text-[#8a6a3f]">
          Saldrán en este orden al presionar CANTAR NÚMERO. Al acabarse la lista, el tambor vuelve
          a cantar al azar.
        </p>
      </section>

      {/* Tabla del 1 al 100 */}
      <section
        className="w-full max-w-md rounded-md border-2 border-[#6b4423] bg-[#1c1208]/85 p-3 shadow-[0_10px_24px_rgba(0,0,0,.45)]"
        aria-label="Elegir números del 1 al 100"
      >
        <h2 className="mb-2 px-1 font-rye text-lg text-[#f3d27a]">Números del 1 al 100</h2>
        <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-10">
          {Array.from({ length: 100 }, (_, idx) => idx + 1).map((n) => {
            const isDrawn = drawnSet.has(n)
            const order = queue.indexOf(n)
            const isQueued = order >= 0
            if (isDrawn) {
              return (
                <span
                  key={n}
                  aria-disabled="true"
                  title={`El ${n} ya salió del tambor`}
                  className="flex h-11 select-none items-center justify-center rounded-md border border-[#3b2314] bg-[#160d05] font-elite text-sm text-[#5a4626] line-through opacity-55 sm:h-10"
                >
                  {n}
                </span>
              )
            }
            return (
              <button
                key={n}
                type="button"
                onClick={() => (isQueued ? removeNumber(n) : addNumber(n))}
                aria-label={
                  isQueued
                    ? `Quitar el ${n} de la lista (saldrá de lugar ${order + 1})`
                    : `Programar el número ${n}`
                }
                className={`flex h-11 flex-col items-center justify-center rounded-md border-2 font-elite shadow transition active:scale-90 sm:h-10 ${
                  isQueued
                    ? 'border-[#e8c877] bg-gradient-to-b from-[#e0bd6a] to-[#c9a227] font-bold text-[#2b1a0c]'
                    : 'border-[#6b4423] bg-[#241608] text-[#f3e6c3] hover:bg-[#33200f]'
                }`}
              >
                {isQueued ? (
                  <>
                    <span className="text-[8px] leading-none opacity-75">#{order + 1}</span>
                    <span className="text-sm leading-tight">{n}</span>
                  </>
                ) : (
                  <span className="text-sm">{n}</span>
                )}
              </button>
            )
          })}
        </div>
        <p className="mt-2 px-1 font-elite text-[10px] leading-snug text-[#8a6a3f]">
          Toca un número para agregarlo a la lista · tócalo de nuevo para quitarlo · los tachados
          ya salieron y no pueden repetirse
        </p>
      </section>

      {/* Bloquear la pantalla grande a distancia */}
      <div className="mt-5 w-full max-w-md">
        <button
          type="button"
          onClick={handleLock}
          aria-label="Bloquear la pantalla grande: pasa al reposo con el logo y La Gran Noche"
          className={`flex w-full items-center justify-center gap-3 rounded-md border-2 px-6 py-3.5 font-rye text-lg shadow-[0_6px_0_#0d0803,0_12px_22px_rgba(0,0,0,.5)] transition-all duration-100 active:translate-y-1 active:shadow-[0_3px_0_#0d0803,0_5px_10px_rgba(0,0,0,.45)] ${
            lockSent
              ? 'border-[#4a6b2a] bg-gradient-to-b from-[#3d5522] to-[#243610] text-[#b8d98a]'
              : 'border-[#4a3a24] bg-gradient-to-b from-[#2b1d0e] to-[#1a1208] text-[#e8c877] hover:brightness-125'
          }`}
        >
          {lockSent ? (
            <>
              <Check className="h-5 w-5 shrink-0" aria-hidden="true" />
              ¡PANTALLA BLOQUEADA!
            </>
          ) : (
            <>
              <Moon className="h-5 w-5 shrink-0" aria-hidden="true" />
              BLOQUEAR PANTALLA
            </>
          )}
        </button>
        <p className="mt-2 text-center font-elite text-[11px] leading-snug text-[#c9a97a]">
          La pantalla grande pasa al reposo con el cartel de la Posada: LA GRAN NOCHE YELLOWSTONE
          · POSADA STRATEGA CONSULTORES 2026. Se despierta tocándola o al cantar un número.
        </p>
      </div>

      <footer className="pt-6 text-center">
        <p className="font-elite text-[11px] tracking-widest text-[#8a7a58]">
          ★ ESTANCIA STRATEGA · LA LISTA DEL JEFE · SECRETO DEL RANCHO ★
        </p>
      </footer>
    </div>
  )
}
