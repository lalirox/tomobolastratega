import { createServer } from 'http'
import { Server } from 'socket.io'

// ─────────────────────────────────────────────────────────────
// Tómbola del Viejo Oeste — servicio de juego (socket.io)
// Estado global compartido entre pantalla grande y controles remotos
// ─────────────────────────────────────────────────────────────

const TOTAL_NUMBERS = 100
const COUNTDOWN_FROM = 5
const SPIN_MS = 1900
// Duración de la sirena visual/sonora cuando el anfitrión manda la alerta
const ALERT_MS = 3500

type Phase = 'idle' | 'alert' | 'countdown' | 'spinning' | 'revealed'

interface GameState {
  phase: Phase
  countdown: number
  drawn: number[]
  lastNumber: number | null
  remaining: number
  total: number
  // Contador de alertas enviadas: los clientes lo vigilan para repetir la sirena
  alertSeq: number
  // Contador de bloqueos de pantalla: al cambiar, la pantalla grande pasa
  // a reposo (logo + LA GRAN NOCHE + POSADA STRATEGA CONSULTORES 2026)
  lockSeq: number
  // Lista secreta del jefe: próximos números que saldrán, en orden
  fixedQueue: number[]
}

const state: GameState = {
  phase: 'idle',
  countdown: 0,
  drawn: [],
  lastNumber: null,
  remaining: TOTAL_NUMBERS,
  total: TOTAL_NUMBERS,
  alertSeq: 0,
  lockSeq: 0,
  fixedQueue: [],
}

let countdownTimer: ReturnType<typeof setInterval> | null = null
let spinTimer: ReturnType<typeof setTimeout> | null = null
let alertTimer: ReturnType<typeof setTimeout> | null = null

function snapshot(): GameState {
  return {
    phase: state.phase,
    countdown: state.countdown,
    drawn: [...state.drawn],
    lastNumber: state.lastNumber,
    remaining: state.remaining,
    total: state.total,
    alertSeq: state.alertSeq,
    lockSeq: state.lockSeq,
    fixedQueue: [...state.fixedQueue],
  }
}

function broadcast() {
  io.emit('state', snapshot())
}

function clearTimers() {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
  if (spinTimer) {
    clearTimeout(spinTimer)
    spinTimer = null
  }
  if (alertTimer) {
    clearTimeout(alertTimer)
    alertTimer = null
  }
}

/**
 * ALERTA manual: el anfitrión la manda desde su celular con el botón
 * "MANDAR ALERTA". Suena la sirena en todas las pantallas y, al acabar,
 * el juego regresa SIEMPRE a 'idle': la pantalla grande muestra su vista
 * original de reposo (el tambor listo) con el historial intacto, nunca la
 * pantalla del último número cantado.
 */
function startAlert(): 'ok' | 'busy' {
  if (state.phase === 'countdown' || state.phase === 'spinning') return 'busy'
  state.phase = 'alert'
  state.alertSeq += 1
  if (alertTimer) clearTimeout(alertTimer)
  broadcast()
  console.log('ALERTA enviada: la nueva rifa está por comenzar')

  alertTimer = setTimeout(() => {
    alertTimer = null
    state.phase = 'idle'
    broadcast()
    console.log('Alerta terminada: regreso a la pantalla original (idle)')
  }, ALERT_MS)

  return 'ok'
}

function startDraw(): 'ok' | 'busy' | 'empty' {
  // Se permite lanzar cuando está listo o cuando ya se reveló el número anterior
  if (state.phase === 'countdown' || state.phase === 'spinning') {
    return 'busy'
  }
  if (state.remaining <= 0) return 'empty'

  // Si hay una alerta sonando, se corta y el conteo arranca de inmediato
  if (alertTimer) {
    clearTimeout(alertTimer)
    alertTimer = null
  }

  // ── Cuenta atrás 5 → 0 ──
  state.phase = 'countdown'
  state.countdown = COUNTDOWN_FROM
  broadcast()

  countdownTimer = setInterval(() => {
    state.countdown -= 1
    if (state.countdown >= 0) {
      // Muestra 5, 4, 3, 2, 1, 0 — el 0 permanece un segundo
      broadcast()
    } else {
      // Llegó a 0 → el tambor gira
      if (countdownTimer) {
        clearInterval(countdownTimer)
        countdownTimer = null
      }
      state.phase = 'spinning'
      state.countdown = 0
      broadcast()

      spinTimer = setTimeout(() => {
        // Si el jefe programó su lista secreta, sale el siguiente número de
        // ella; si no, la bola es al azar entre las que quedan en el tambor
        const fixed = state.fixedQueue.find((n) => !state.drawn.includes(n))
        let picked: number
        if (fixed !== undefined) {
          picked = fixed
          state.fixedQueue = state.fixedQueue.filter((n) => n !== fixed)
        } else {
          const pool: number[] = []
          for (let n = 1; n <= TOTAL_NUMBERS; n++) {
            if (!state.drawn.includes(n)) pool.push(n)
          }
          picked = pool[Math.floor(Math.random() * pool.length)]
        }
        state.drawn.push(picked)
        state.lastNumber = picked
        state.remaining = TOTAL_NUMBERS - state.drawn.length
        state.phase = 'revealed'
        broadcast()
        console.log(`Número cantado: ${picked} | quedan ${state.remaining}`)
      }, SPIN_MS)
    }
  }, 1000)

  return 'ok'
}

function resetGame() {
  clearTimers()
  state.phase = 'idle'
  state.countdown = 0
  state.drawn = []
  state.lastNumber = null
  state.remaining = TOTAL_NUMBERS
  state.fixedQueue = []
  broadcast()
  console.log('Juego reiniciado')
}

const httpServer = createServer()
const io = new Server(httpServer, {
  // DO NOT change the path, it is used by Caddy to forward the request to the correct port
  path: '/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

io.on('connection', (socket) => {
  console.log(`Cliente conectado: ${socket.id}`)

  // Enviar estado actual inmediatamente al conectarse
  socket.emit('state', snapshot())

  socket.on('join', (data: { role?: string }) => {
    const role = data?.role === 'controller' ? 'controller' : 'screen'
    console.log(`Cliente ${socket.id} registrado como ${role}`)
    socket.emit('state', snapshot())
  })

  socket.on('press', () => {
    console.log(`PRESS recibido de ${socket.id} (fase actual: ${state.phase})`)
    const result = startDraw()
    if (result === 'busy') socket.emit('busy')
    if (result === 'empty') socket.emit('empty')
  })

  socket.on('alert', () => {
    console.log(`ALERT recibido de ${socket.id} (fase actual: ${state.phase})`)
    const result = startAlert()
    if (result === 'busy') socket.emit('busy')
  })

  // BLOQUEAR PANTALLA: el anfitrión lo manda desde su celular; la pantalla
  // grande pasa a reposo (solo logo + LA GRAN NOCHE + POSADA STRATEGA
  // CONSULTORES 2026). Se despierta tocándola o con el siguiente evento.
  socket.on('lock', () => {
    state.lockSeq += 1
    broadcast()
    console.log(`LOCK recibido de ${socket.id}: pantalla grande en reposo (bloqueo #${state.lockSeq})`)
  })

  // El jefe (página secreta "La lista del jefe") define qué números
  // saldrán del tambor y en qué orden. Se limpian duplicados, números
  // inválidos y números que ya se cantaron.
  socket.on('setQueue', (data: { numbers?: unknown }) => {
    const raw = Array.isArray(data?.numbers) ? data.numbers : []
    const seen = new Set<number>()
    const clean: number[] = []
    for (const item of raw) {
      const n = Number(item)
      if (!Number.isInteger(n) || n < 1 || n > TOTAL_NUMBERS) continue
      if (seen.has(n) || state.drawn.includes(n)) continue
      seen.add(n)
      clean.push(n)
    }
    state.fixedQueue = clean
    broadcast()
    console.log(`Lista del jefe actualizada: ${clean.length} números programados`)
  })

  socket.on('reset', () => {
    resetGame()
  })

  socket.on('disconnect', () => {
    console.log(`Cliente desconectado: ${socket.id}`)
  })

  socket.on('error', (error) => {
    console.error(`Error de socket (${socket.id}):`, error)
  })
})

const PORT = 3003
httpServer.listen(PORT, () => {
  console.log(`Servidor de la tómbola corriendo en el puerto ${PORT}`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM recibido, cerrando servidor...')
  clearTimers()
  httpServer.close(() => {
    console.log('Servidor de la tómbola cerrado')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('SIGINT recibido, cerrando servidor...')
  clearTimers()
  httpServer.close(() => {
    console.log('Servidor de la tómbola cerrado')
    process.exit(0)
  })
})
