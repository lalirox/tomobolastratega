'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { INITIAL_STATE, type GameState, type Role } from '@/lib/tombola'

/**
 * Conecta con el servicio de la tómbola (socket.io, puerto 3003 a través
 * del gateway) y sincroniza el estado del juego en tiempo real.
 */
export function useTombola(role: Role) {
  const socketRef = useRef<Socket | null>(null)
  const [state, setState] = useState<GameState>(INITIAL_STATE)
  const [connected, setConnected] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    // Nunca usar el puerto en la URL: siempre XTransformPort
    // NO cambiar el path, lo usa Caddy para reenviar al puerto correcto
    const s = io('/?XTransformPort=3003', {
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 12,
      reconnectionDelay: 1200,
      timeout: 10000,
    })
    socketRef.current = s

    s.on('connect', () => {
      setConnected(true)
      s.emit('join', { role })
    })
    s.on('disconnect', () => setConnected(false))
    s.on('state', (next: GameState) => setState(next))
    s.on('busy', () => setNotice('La tómbola ya está en marcha...'))
    s.on('empty', () => setNotice('Ya se cantaron los 100 números'))
    s.on('connect_error', () => setConnected(false))

    return () => {
      s.disconnect()
      socketRef.current = null
    }
  }, [role])

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 2600)
    return () => clearTimeout(t)
  }, [notice])

  const press = useCallback(() => {
    socketRef.current?.emit('press')
  }, [])

  const reset = useCallback(() => {
    socketRef.current?.emit('reset')
  }, [])

  return { state, connected, notice, press, reset }
}
