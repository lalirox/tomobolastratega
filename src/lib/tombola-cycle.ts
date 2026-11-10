// ─────────────────────────────────────────────────────────────
// Ciclo de estado del servidor (lectura → avanzar → actuar → CAS).
//
// Vive aparte de la API route para poder probarlo sin levantar Next.js:
// la lógica de "nunca perder un número cantado" es la más delicada del
// proyecto y debe estar cubierta por tests.
//
// REGLA ANTI-NÚMEROS PERDIDOS: el reloj avanza primero (es el que
// materializa la bola al terminar el giro) y la acción se aplica sobre ese
// estado ya avanzado. Si al avanzar se cantó un número y la acción iba a
// cambiar la fase (otra tirada o la sirena), la acción se rechaza como
// 'busy' y gana el reloj: el número recién cantado siempre llega a la
// pantalla, nunca se traga y se ve otro en su lugar.
// ─────────────────────────────────────────────────────────────
import { INITIAL_STATE, type GameState } from './tombola'
import {
  advance,
  applyAction,
  type ActionName,
  type ActionResult,
} from './tombola-engine'

/** Almacén mínimo: leer el estado crudo y escribirlo con compare-and-set */
export interface StateStore {
  readRaw(): Promise<string | null>
  casWrite(expected: string, next: string): Promise<boolean>
}

/**
 * Acciones que arrancan una fase nueva (cuenta atrás o sirena). Si llega
 * una de estas en el instante en que el tambor suelta la bola, se rechaza:
 * el número recién cantado debe presentarse primero.
 */
export const STARTS_NEW_PHASE: ActionName[] = ['press', 'alert']

/** Normaliza el estado guardado (incluye estados viejos o corruptos) */
export function parseState(raw: string | null): GameState {
  if (!raw) return INITIAL_STATE
  try {
    const parsed = JSON.parse(raw) as GameState
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof parsed.phase === 'string' &&
      Array.isArray(parsed.drawn) &&
      Array.isArray(parsed.fixedQueue) &&
      typeof parsed.alertSeq === 'number' &&
      typeof parsed.lockSeq === 'number'
    ) {
      // Los contadores se fuerzan a número porque de ellos dependen los
      // overlays (alerta, bloqueo y número cantado).
      return {
        ...INITIAL_STATE,
        ...parsed,
        alertSeq: typeof parsed.alertSeq === 'number' ? parsed.alertSeq : 0,
        lockSeq: typeof parsed.lockSeq === 'number' ? parsed.lockSeq : 0,
        // Estado viejo sin `locked`: la pantalla arranca despierta.
        locked: parsed.locked === true,
        revealSeq: typeof parsed.revealSeq === 'number' ? parsed.revealSeq : 0,
        phaseStart: typeof parsed.phaseStart === 'number' ? parsed.phaseStart : 0,
      }
    }
  } catch {
    // JSON corrupto: se arranca de cero
  }
  return INITIAL_STATE
}

/**
 * Ciclo lectura → avanzar → actuar → escritura CAS. Si otra petición ganó
 * la carrera, reintenta con el valor fresco (hasta 6 veces).
 *
 * @param store  almacén (Upstash Redis en Vercel, memoria en local)
 * @param action  acción pedida, o null si solo es una consulta (GET)
 * @param mutate  cómo se aplica la acción al estado ya avanzado
 * @param now     reloj (inyectable para las pruebas)
 */
export async function withState(
  store: StateStore,
  action: ActionName | null,
  mutate?: (state: GameState) => { state: GameState; result: ActionResult },
  now: () => number = Date.now,
): Promise<{ result: ActionResult; state: GameState }> {
  let last: { result: ActionResult; state: GameState } | null = null
  for (let attempt = 0; attempt < 6; attempt++) {
    const raw = await store.readRaw()
    const current = parseState(raw)
    // 1) El reloj avanza: puede terminar el giro y materializar la bola.
    const advanced = advance(current, now())
    // 2) La acción se aplica sobre el estado ya avanzado.
    const applied = mutate ? mutate(advanced) : null
    let result: ActionResult = applied ? applied.result : 'ok'
    let next = applied ? applied.state : advanced
    if (
      applied &&
      result === 'ok' &&
      action !== null &&
      STARTS_NEW_PHASE.includes(action) &&
      applied.state.phase !== advanced.phase &&
      advanced.revealSeq !== current.revealSeq
    ) {
      // Se acaba de cantar una bola y la acción iba a cambiar la fase:
      // primero se presenta el número, la acción espera.
      result = 'busy'
      next = advanced
    }
    last = { result, state: next }
    const ok = await store.casWrite(raw ?? '', JSON.stringify(next))
    if (ok) return last
  }
  // No se pudo escribir tras los reintentos: se devuelve el estado YA
  // GUARDADO, nunca uno calculado en local. Si no, el cliente vería un
  // número que no es el que quedó en el almacén y en la siguiente
  // consulta aparecería otro distinto.
  const committed = parseState(await store.readRaw())
  return { result: last?.result ?? 'ok', state: committed }
}

/** Atajo: aplica una acción del juego (usado por la API) */
export async function applyGameAction(
  store: StateStore,
  action: ActionName,
  payload: { numbers?: unknown } = {},
  now: () => number = Date.now,
): Promise<{ result: ActionResult; state: GameState }> {
  return withState(
    store,
    action,
    (state) => applyAction(state, action, payload, now()),
    now,
  )
}
