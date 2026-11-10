// ─────────────────────────────────────────────────────────────
// Pruebas del motor de la tómbola y del ciclo del servidor.
//
// Se ejecutan con:  bun test
//
// Congelan las invariantes que sostienen el juego en vivo:
//  · el motor es puro (el mismo estado → el mismo número)
//  · un número cantado NUNCA se traga (ni en el servidor ni en el
//    cliente de la pantalla grande)
//  · una ronda canta los 100 números sin repetir
//  · la lista del jefe sale en el orden programado
// ─────────────────────────────────────────────────────────────
/// <reference types="bun-types" />
import { describe, expect, test } from 'bun:test'
import {
  advance,
  applyAction,
  freshState,
  ALERT_MS,
  COUNTDOWN_MS,
  SPIN_MS,
} from '../src/lib/tombola-engine'
import { applyGameAction, withState, type StateStore } from '../src/lib/tombola-cycle'
import { decidePresentation } from '../src/lib/tombola-present'
import { diagnoseStore } from '../src/lib/tombola-store'
import type { GameState } from '../src/lib/tombola'

const T = 1_700_000_000_000

/** Almacén en memoria con compare-and-set (como el de Upstash) */
function memoryStore() {
  let raw: string | null = null
  const store: StateStore = {
    readRaw: async () => raw,
    casWrite: async (expected: string, next: string) => {
      if ((raw ?? '') !== expected) return false
      raw = next
      return true
    },
  }
  return { store, read: () => raw }
}

/** Simula el reloj: ahora es una variable que el test mueve */
function clock(start = T) {
  let now = start
  return {
    now: () => now,
    advance: (ms: number) => {
      now += ms
      return now
    },
    set: (ms: number) => {
      now = ms
      return now
    },
  }
}

// ───────────────────────── motor ─────────────────────────
describe('motor del juego', () => {
  test('el motor es puro: el mismo estado y el mismo reloj eligen la misma bola', () => {
    const state: GameState = {
      ...freshState(),
      phase: 'spinning',
      phaseStart: T,
    }
    const a = advance(state, T + SPIN_MS + 1)
    const b = advance(state, T + SPIN_MS + 1)
    expect(a.lastNumber).not.toBeNull()
    expect(a.lastNumber).toBe(b.lastNumber)
    expect(a.revealSeq).toBe(b.revealSeq)
  })

  test('el giro no suelta la bola antes de tiempo', () => {
    const state: GameState = { ...freshState(), phase: 'spinning', phaseStart: T }
    const antes = advance(state, T + SPIN_MS - 1)
    expect(antes.phase).toBe('spinning')
    expect(antes.revealSeq).toBe(0)
  })

  test('la cuenta atrás dura 6 s y luego el tambor gira', () => {
    let state: GameState = { ...freshState(), phase: 'countdown', phaseStart: T }
    state = advance(state, T + 1000)
    expect(state.countdown).toBe(4)
    state = advance(state, T + COUNTDOWN_MS)
    expect(state.phase).toBe('spinning')
  })

  test('una ronda completa canta los 100 números sin repetir', () => {
    const drawn: number[] = []
    let state = freshState()
    for (let i = 0; i < 100; i++) {
      const phaseStart = T + i * 100_000
      state = { ...state, phase: 'countdown', phaseStart }
      state = advance(state, phaseStart + COUNTDOWN_MS)
      state = advance(state, phaseStart + COUNTDOWN_MS + SPIN_MS)
      expect(state.phase).toBe('revealed')
      drawn.push(state.lastNumber as number)
    }
    expect(drawn.length).toBe(100)
    expect(new Set(drawn).size).toBe(100)
    expect(state.remaining).toBe(0)
  })

  test('la lista del jefe sale primero y en el orden programado', () => {
    const cola = [7, 42, 13]
    let state = freshState()
    state = applyAction(state, 'setQueue', { numbers: cola }, T).state
    const salida: number[] = []
    for (let i = 0; i < cola.length; i++) {
      const phaseStart = T + i * 100_000
      state = { ...state, phase: 'countdown', phaseStart }
      state = advance(state, phaseStart + COUNTDOWN_MS)
      state = advance(state, phaseStart + COUNTDOWN_MS + SPIN_MS)
      salida.push(state.lastNumber as number)
    }
    expect(salida).toEqual(cola)
    expect(state.fixedQueue).toEqual([])
  })

  test('la lista del jefe ignora duplicados, inválidos y números ya cantados', () => {
    let state = freshState()
    state = { ...state, drawn: [5] }
    state = applyAction(state, 'setQueue', { numbers: [5, 5, 0, 101, -3, 'x', 9] }, T).state
    expect(state.fixedQueue).toEqual([9])
  })

  test('la sirena dura 3.5 s y luego la pantalla vuelve al reposo', () => {
    const state = applyAction(freshState(), 'alert', {}, T).state
    expect(state.phase).toBe('alert')
    const despues = advance(state, T + ALERT_MS)
    expect(despues.phase).toBe('idle')
  })

  test('el bloqueo remoto no cambia la fase ni los números cantados', () => {
    const state = applyAction(freshState(), 'lock', {}, T).state
    expect(state.lockSeq).toBe(1)
    expect(state.phase).toBe('idle')
    expect(state.drawn).toEqual([])
  })

  test('la nueva ronda limpia historial y lista del jefe', () => {
    let state = freshState()
    state = applyAction(state, 'setQueue', { numbers: [1, 2] }, T).state
    state = { ...state, drawn: [1, 2, 3], lastNumber: 3, phase: 'revealed' }
    const limpio = applyAction(state, 'reset', {}, T).state
    expect(limpio.drawn).toEqual([])
    expect(limpio.lastNumber).toBeNull()
    expect(limpio.fixedQueue).toEqual([])
    expect(limpio.remaining).toBe(100)
    expect(limpio.phase).toBe('idle')
  })

  test('sin bolas en el tambor el motor no inventa un número', () => {
    const todos = Array.from({ length: 100 }, (_, i) => i + 1)
    const state: GameState = {
      ...freshState(),
      phase: 'spinning',
      phaseStart: T,
      drawn: todos,
      remaining: 0,
    }
    const despues = advance(state, T + SPIN_MS + 1)
    expect(despues.lastNumber).toBeNull()
    expect(despues.revealSeq).toBe(0)
    expect(despues.phase).toBe('idle')
  })
})

// ───────────────────────── servidor ─────────────────────────
describe('ciclo del servidor', () => {
  test('un press durante la cuenta atrás se rechaza como ocupado', async () => {
    const { store } = memoryStore()
    const c = clock()
    await applyGameAction(store, 'press', {}, c.now)
    c.advance(2000)
    const res = await applyGameAction(store, 'press', {}, c.now)
    expect(res.result).toBe('busy')
    expect(res.state.phase).toBe('countdown')
  })

  test('un press durante el giro se rechaza como ocupado', async () => {
    const { store } = memoryStore()
    const c = clock()
    await applyGameAction(store, 'press', {}, c.now)
    c.advance(COUNTDOWN_MS + 100)
    const res = await applyGameAction(store, 'press', {}, c.now)
    expect(res.result).toBe('busy')
    expect(res.state.phase).toBe('spinning')
  })

  test('un press que llega JUSTO al terminar el giro no traga el número cantado', async () => {
    const { store } = memoryStore()
    const c = clock()
    await applyGameAction(store, 'press', {}, c.now)
    // el tambor ya soltó la bola pero la pantalla todavía no lo ha polled
    c.advance(COUNTDOWN_MS + SPIN_MS + 10)
    const res = await applyGameAction(store, 'press', {}, c.now)
    // la acción espera: primero se presenta el número
    expect(res.result).toBe('busy')
    expect(res.state.revealSeq).toBe(1)
    expect(res.state.lastNumber).not.toBeNull()
    expect(res.state.phase).toBe('revealed')
    // y el número queda guardado (la siguiente consulta lo ve igual)
    const guardado = await withState(store, null, undefined, c.now)
    expect(guardado.state.lastNumber).toBe(res.state.lastNumber)
    expect(guardado.state.revealSeq).toBe(1)
  })

  test('la alerta que llega al terminar el giro tampoco traga el número', async () => {
    const { store } = memoryStore()
    const c = clock()
    await applyGameAction(store, 'press', {}, c.now)
    c.advance(COUNTDOWN_MS + SPIN_MS + 10)
    const res = await applyGameAction(store, 'alert', {}, c.now)
    expect(res.result).toBe('busy')
    expect(res.state.revealSeq).toBe(1)
    expect(res.state.lastNumber).not.toBeNull()
  })

  test('la alerta sí se aplica si no hay ninguna bola en juego', async () => {
    const { store } = memoryStore()
    const c = clock()
    const res = await applyGameAction(store, 'alert', {}, c.now)
    expect(res.result).toBe('ok')
    expect(res.state.phase).toBe('alert')
    expect(res.state.alertSeq).toBe(1)
  })

  test('el bloqueo se aplica aunque el tambor esté girando (no cambia la fase)', async () => {
    const { store } = memoryStore()
    const c = clock()
    await applyGameAction(store, 'press', {}, c.now)
    c.advance(COUNTDOWN_MS + 100)
    const res = await applyGameAction(store, 'lock', {}, c.now)
    expect(res.result).toBe('ok')
    expect(res.state.lockSeq).toBe(1)
    expect(res.state.phase).toBe('spinning')
  })

  test('el número se canta y se ve: nunca se pierde entre la pantalla y el celular', async () => {
    const { store } = memoryStore()
    const c = clock()
    await applyGameAction(store, 'press', {}, c.now)
    c.advance(COUNTDOWN_MS + SPIN_MS + 10)
    // lo que ve la pantalla grande
    const pantalla = await withState(store, null, undefined, c.now)
    // lo que ve el celular (otra consulta)
    const celular = await withState(store, null, undefined, c.now)
    expect(pantalla.state.lastNumber).not.toBeNull()
    expect(celular.state.lastNumber).toBe(pantalla.state.lastNumber)
    expect(celular.state.revealSeq).toBe(pantalla.state.revealSeq)
  })

  test('si el CAS falla siempre, se devuelve el estado ya guardado', async () => {
    let raw: string | null = JSON.stringify({ ...freshState(), phase: 'idle' })
    const store: StateStore = {
      readRaw: async () => raw,
      casWrite: async () => false,
    }
    const res = await withState(store, null, undefined, () => T)
    // el estado devuelto es el guardado, no uno calculado en local
    expect(JSON.parse(res.state ? JSON.stringify(res.state) : '{}').phase).toBe('idle')
    expect(res.state.revealSeq).toBe(0)
  })
})

// ───────────────────────── diagnóstico ─────────────────────────
describe('diagnóstico del almacén', () => {
  test('con las dos variables bien puesta no hay problema', () => {
    expect(diagnoseStore('https://quiet-mouse-12345.upstash.io', 'AXxx...=')).toBeNull()
  })

  test('sin URL avisa que la pantalla y el celular no se sincronizan', () => {
    const p = diagnoseStore(undefined, 'AXxx...=')
    expect(p).toContain('UPSTASH_REDIS_REST_URL')
    expect(p).toContain('NO se sincronizan')
  })

  test('sin token avisa igual', () => {
    const p = diagnoseStore('https://quiet-mouse-12345.upstash.io', undefined)
    expect(p).toContain('UPSTASH_REDIS_REST_TOKEN')
  })

  test('detecta la URL de Upstash Vector (no habla la API de Redis)', () => {
    const p = diagnoseStore('https://quiet-mouse-12345.upstash.io/vector', 'AXxx...=')
    expect(p).toContain('Vector')
    expect(p).not.toContain('NO se sincronizan')
  })

  test('una URL normal de Redis no se confunde con Vector', () => {
    expect(diagnoseStore('https://quiet-mouse-12345.upstash.io', 'AXxx...=')).toBeNull()
  })
})

// ───────────────────────── cliente (pantalla) ─────────────────────────
describe('presentación en la pantalla grande', () => {
  test('la primera sincronización no abre nada', () => {
    const state = { ...freshState(), phase: 'revealed' as const, lastNumber: 12, revealSeq: 3 }
    const p = decidePresentation(null, null, state)
    expect(p.winner).toBeNull()
    expect(p.fanfare).toBe(false)
    expect(p.alreadyPresented).toBe(true)
  })

  test('un número cantado se presenta a pantalla completa', () => {
    const state = { ...freshState(), phase: 'revealed' as const, lastNumber: 12, revealSeq: 1 }
    const p = decidePresentation('spinning', 0, state)
    expect(p.winner).toBe(12)
    expect(p.fanfare).toBe(true)
    expect(p.close).toBe(false)
  })

  test('el número se presenta AUNQUE la fase ya haya avanzado (no se traga)', () => {
    // el anfitrión pidió la siguiente tirada antes de que la pantalla
    // notara la bola: la fase ya es 'countdown' pero el número se cantó
    const state = { ...freshState(), phase: 'countdown' as const, lastNumber: 12, revealSeq: 1 }
    const p = decidePresentation('spinning', 0, state)
    expect(p.winner).toBe(12)
    expect(p.fanfare).toBe(true)
    // y no se cierra la presentación: el número gana
    expect(p.close).toBe(false)
  })

  test('sin número nuevo, cambiar de fase cierra la presentación en curso', () => {
    const state = { ...freshState(), phase: 'countdown' as const, lastNumber: 12, revealSeq: 1 }
    const p = decidePresentation('revealed', 1, state)
    expect(p.winner).toBeNull()
    expect(p.close).toBe(true)
  })

  test('la sirena cierra la presentación y el redoble suena al girar', () => {
    const alerta = decidePresentation('revealed', 1, {
      ...freshState(),
      phase: 'alert',
      alertSeq: 1,
      revealSeq: 1,
    })
    expect(alerta.close).toBe(true)
    const giro = decidePresentation('countdown', 1, {
      ...freshState(),
      phase: 'spinning',
      revealSeq: 1,
    })
    expect(giro.roll).toBe(true)
  })
})
