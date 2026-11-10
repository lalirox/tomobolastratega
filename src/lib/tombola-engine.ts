// ─────────────────────────────────────────────────────────────
// Motor del juego de la tómbola — funciones puras basadas en TIEMPO.
// Portado del servicio socket.io (mini-services) para correr dentro
// de una API route de Vercel, donde no hay procesos persistentes ni
// timers entre peticiones: el estado avanza calculando el tiempo
// transcurrido de la fase actual en cada lectura/escritura.
// ─────────────────────────────────────────────────────────────
import type { GameState } from './tombola'

export const TOTAL_NUMBERS = 100
export const COUNTDOWN_FROM = 5
// La cuenta muestra 5, 4, 3, 2, 1, 0 — el 0 permanece un segundo completo
export const COUNTDOWN_MS = (COUNTDOWN_FROM + 1) * 1000
export const SPIN_MS = 1900
// Duración de la sirena visual/sonora cuando el anfitrión manda la alerta
export const ALERT_MS = 3500

export type ActionName = 'press' | 'alert' | 'lock' | 'toggleLock' | 'reset' | 'setQueue'
export type ActionResult = 'ok' | 'busy' | 'empty'

export interface ActionPayload {
  numbers?: unknown
}

/** Estado inicial de una ronda nueva */
export function freshState(): GameState {
  return {
    phase: 'idle',
    countdown: 0,
    drawn: [],
    lastNumber: null,
    remaining: TOTAL_NUMBERS,
    total: TOTAL_NUMBERS,
    alertSeq: 0,
    lockSeq: 0,
    locked: false,
    revealSeq: 0,
    fixedQueue: [],
    phaseStart: 0,
  }
}

/**
 * Elige la bola que sale del tambor de forma DETERMINISTA: la misma
 * semilla produce siempre el mismo número.
 *
 * Antes se usaba Math.random() y el motor NO era puro: si la pantalla
 * grande y el celular consultaban el estado en el mismo instante, cada
 * petición calculaba un número distinto y el cliente podía ver un número
 * que no era el que quedó guardado (la siguiente consulta mostraba otro).
 * Con la semilla derivada del propio estado, dos peticiones que leen lo
 * mismo eligen SIEMPRE la misma bola, y el CAS deja una sola versión
 * buena en el almacén.
 */
function pickFromPool(pool: number[], seed: number): number {
  if (pool.length === 0) return 0
  // Mezcla FNV-1a con finalizador tipo murmur3: reparto uniforme y
  // dependiente de todos los números que quedan en el tambor.
  let h = seed >>> 0
  for (let i = 0; i < pool.length; i++) {
    h = (h ^ pool[i]) >>> 0
    h = Math.imul(h, 0x01000193) >>> 0
  }
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0
  h = (h ^ (h >>> 13)) >>> 0
  h = Math.imul(h, 0xc2b2ae35) >>> 0
  h = (h ^ (h >>> 16)) >>> 0
  return pool[h % pool.length]
}

/**
 * Avanza el estado según el reloj (transiciones automáticas):
 *  · countdown 5→0 (6 s)  →  spinning (1.9 s)  →  revealed (bola cantada)
 *  · alert (3.5 s)        →  idle
 * Es una función pura: devuelve el MISMO objeto si no cambió nada, o uno
 * nuevo cuando la fase avanza (incluida la materialización del número).
 */
export function advance(state: GameState, now: number): GameState {
  if (state.phase === 'countdown') {
    const elapsed = now - state.phaseStart
    if (elapsed < COUNTDOWN_MS) {
      const countdown = Math.max(0, COUNTDOWN_FROM - Math.floor(elapsed / 1000))
      if (countdown === state.countdown) return state
      return { ...state, countdown }
    }
    // Cuenta terminada: el tambor gira
    return advance(
      { ...state, phase: 'spinning', countdown: 0, phaseStart: state.phaseStart + COUNTDOWN_MS },
      now,
    )
  }

  if (state.phase === 'spinning') {
    if (now - state.phaseStart < SPIN_MS) return state
    // La bola cae: sale el siguiente número de la lista del jefe si la
    // programó; si no, uno al azar entre los que quedan en el tambor
    const fixed = state.fixedQueue.find((n) => !state.drawn.includes(n))
    let picked: number
    if (fixed !== undefined) {
      picked = fixed
    } else {
      const pool: number[] = []
      for (let n = 1; n <= TOTAL_NUMBERS; n++) {
        if (!state.drawn.includes(n)) pool.push(n)
      }
      // Sin bolas en el tambor no hay nada que cantar: la ronda se cierra
      // sin materializar un número (ni rastro de un "undefined").
      if (pool.length === 0) {
        return { ...state, phase: 'idle', countdown: 0, phaseStart: 0 }
      }
      // Semilla derivada del propio estado (misma lectura → misma bola)
      const seed = (state.phaseStart ^ Math.imul(state.drawn.length + 1, 0x9e3779b1)) >>> 0
      picked = pickFromPool(pool, seed)
    }
    const drawn = [...state.drawn, picked]
    return {
      ...state,
      phase: 'revealed',
      drawn,
      lastNumber: picked,
      remaining: TOTAL_NUMBERS - drawn.length,
      fixedQueue: fixed !== undefined ? state.fixedQueue.filter((n) => n !== fixed) : state.fixedQueue,
      // Contador de revelaciones: la pantalla grande abre el overlay del
      // ganador cuando este número cambia, aunque se pierda por el camino
      // la secuencia countdown → spinning (pestaña ralentizada, etc.)
      revealSeq: state.revealSeq + 1,
      phaseStart: 0,
    }
  }

  if (state.phase === 'alert' && now - state.phaseStart >= ALERT_MS) {
    // Alerta terminada: regreso a la pantalla original de reposo (idle)
    return { ...state, phase: 'idle', phaseStart: 0 }
  }

  return state
}

/**
 * Aplica una acción manual (botones del celular / del jefe).
 * Reglas idénticas al servicio original:
 *  · press    → arranca la cuenta 5→0 (prohibido durante countdown/spinning)
 *  · alert    → sirena 3.5 s (prohibida durante countdown/spinning)
 *  · lock     → contador de bloqueo remoto de la pantalla grande
 *  · reset    → ronda nueva: se borra el historial y la lista del jefe
 *  · setQueue → el jefe programa los números que saldrán, en orden
 */
export function applyAction(
  state: GameState,
  action: ActionName,
  payload: ActionPayload,
  now: number,
): { state: GameState; result: ActionResult } {
  switch (action) {
    case 'press': {
      if (state.phase === 'countdown' || state.phase === 'spinning') {
        return { state, result: 'busy' }
      }
      if (state.remaining <= 0) {
        return { state, result: 'empty' }
      }
      // Si hay una alerta sonando, se corta y el conteo arranca de inmediato.
      // Cantar despierta la pantalla: si estaba en reposo, el público tiene
      // que ver la tirada (y el cartel no debe tapar el número).
      return {
        state: {
          ...state,
          phase: 'countdown',
          countdown: COUNTDOWN_FROM,
          phaseStart: now,
          locked: false,
        },
        result: 'ok',
      }
    }

    case 'alert': {
      if (state.phase === 'countdown' || state.phase === 'spinning') {
        return { state, result: 'busy' }
      }
      // La sirena también despierta la pantalla: si estaba en reposo, la
      // portada taparía el aviso.
      return {
        state: {
          ...state,
          phase: 'alert',
          alertSeq: state.alertSeq + 1,
          phaseStart: now,
          locked: false,
        },
        result: 'ok',
      }
    }

    case 'lock': {
      // BLOQUEAR PANTALLA desde el celular: la pantalla grande pasa a reposo
      return {
        state: { ...state, lockSeq: state.lockSeq + 1, locked: true },
        result: 'ok',
      }
    }

    case 'toggleLock': {
      // El botón del anfitrión es un interruptor: si la pantalla está en
      // reposo la despierta, y si está despierta la manda a reposo.
      // `locked` vive en el estado compartido, así que pantalla y celular
      // siempre muestran lo mismo.
      return {
        state: { ...state, lockSeq: state.lockSeq + 1, locked: !state.locked },
        result: 'ok',
      }
    }

    case 'reset': {
      // Nueva ronda: se borra historial y lista del jefe, pero los
      // contadores (alertas, bloqueos, revelaciones) siguen creciendo.
      // La pantalla queda despierta: una ronda nueva se juega, no se mira
      // en reposo.
      return {
        state: {
          ...state,
          phase: 'idle',
          countdown: 0,
          drawn: [],
          lastNumber: null,
          remaining: TOTAL_NUMBERS,
          fixedQueue: [],
          phaseStart: 0,
          locked: false,
        },
        result: 'ok',
      }
    }

    case 'setQueue': {
      // Se limpian duplicados, números inválidos y números ya cantados
      const raw = Array.isArray(payload?.numbers) ? payload.numbers : []
      const seen = new Set<number>()
      const clean: number[] = []
      for (const item of raw) {
        const n = Number(item)
        if (!Number.isInteger(n) || n < 1 || n > TOTAL_NUMBERS) continue
        if (seen.has(n) || state.drawn.includes(n)) continue
        seen.add(n)
        clean.push(n)
      }
      return { state: { ...state, fixedQueue: clean }, result: 'ok' }
    }

    default:
      return { state, result: 'busy' }
  }
}
