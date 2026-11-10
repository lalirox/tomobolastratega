'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { INITIAL_STATE, type GameState, type Role } from '@/lib/tombola'

/**
 * Sincroniza el estado del juego con la API /api/tombola.
 *
 * A diferencia del anterior servicio socket.io (imposible de desplegar
 * en Vercel), aquí cada cliente hace polling: rápido (450 ms) mientras
 * hay acción en curso (conteo, giro o alerta) y relajado (1.2 s) en
 * reposo. Las acciones viajan por POST y la respuesta trae el estado
 * fresco, así el botón responde al instante.
 */
export function useTombola(role: Role) {
  const [state, setState] = useState<GameState>(INITIAL_STATE)
  const [connected, setConnected] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  // Ref siempre fresco para decidir el ritmo de polling sin re-crear el efecto
  const phaseRef = useRef<GameState['phase']>('idle')
  phaseRef.current = state.phase
  const stopRef = useRef(false)

  useEffect(() => {
    stopRef.current = false
    let timer: ReturnType<typeof setTimeout> | null = null
    let inFlight = false

    const poll = async () => {
      if (stopRef.current || inFlight) return
      inFlight = true
      try {
        const res = await fetch('/api/tombola', { cache: 'no-store' })
        if (!res.ok) throw new Error(String(res.status))
        const data = (await res.json()) as { state: GameState }
        if (stopRef.current) return
        setState(data.state)
        setConnected(true)
      } catch {
        if (!stopRef.current) setConnected(false)
      } finally {
        inFlight = false
        if (!stopRef.current) {
          // Mientras hay algo en marcha en pantalla (cuenta, giro, sirena
          // o el número cantado en su presentación) se consulta rápido para
          // que la pantalla grande reaccione al instante.
          const live =
            phaseRef.current === 'countdown' ||
            phaseRef.current === 'spinning' ||
            phaseRef.current === 'revealed' ||
            phaseRef.current === 'alert'
          timer = setTimeout(poll, live ? 450 : 1200)
        }
      }
    }

    // Al regresar a la pestaña (los navegadores ralentizan los timers de
    // pestañas ocultas y pueden perderse el conteo o el número cantado),
    // se consulta de inmediato para ponerse al día
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !stopRef.current && !inFlight) {
        if (timer) clearTimeout(timer)
        void poll()
      }
    }
    document.addEventListener('visibilitychange', onVisible)

    poll()
    return () => {
      stopRef.current = true
      if (timer) clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 2600)
    return () => clearTimeout(t)
  }, [notice])

  // Acción genérica: POST a la API y el estado vuelve en la respuesta
  const send = useCallback(
    async (action: string, payload?: Record<string, unknown>) => {
      try {
        const res = await fetch('/api/tombola', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, ...payload }),
          cache: 'no-store',
        })
        if (!res.ok) throw new Error(String(res.status))
        const data = (await res.json()) as { result: string; state: GameState }
        setState(data.state)
        setConnected(true)
        if (data.result === 'busy')
          setNotice('La bola está por caer… espera un momento')
        if (data.result === 'empty') setNotice('Ya se cantaron los 100 números')
      } catch {
        setConnected(false)
      }
    },
    [],
  )

  const press = useCallback(() => void send('press'), [send])

  // Manda la sirena de alerta a todas las pantallas (botón del anfitrión)
  const sendAlert = useCallback(() => void send('alert'), [send])

  // BLOQUEAR PANTALLA desde el celular: la pantalla grande pasa a reposo
  // con la portada del cartel (LA GRAN NOCHE YELLOWSTONE · POSADA
  // STRATEGA CONSULTORES 2026)
  const lockScreen = useCallback(() => void send('lock'), [send])

  const reset = useCallback(() => void send('reset'), [send])

  // El jefe programa la lista de números que saldrán (modo dirigido)
  const sendQueue = useCallback(
    (numbers: number[]) => void send('setQueue', { numbers }),
    [send],
  )

  return { state, connected, notice, press, sendAlert, reset, sendQueue, lockScreen }
}
