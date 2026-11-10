// ─────────────────────────────────────────────────────────────
// Decisión de presentación de la pantalla grande.
//
// Traduce el estado del juego a lo que el público ve: si hay que abrir el
// número ganador a pantalla completa, si hay que cerrar la presentación en
// curso y si suenan los efectos.
//
// REGLA CENTRAL: un número cantado SE PRESENTA SIEMPRE. El contador
// revealSeq es la única señal fiable de "se cantó una bola": si el
// anfitrión pidió la siguiente tirada antes de que la pantalla notara el
// número, la fase ya no es 'revealed', pero el número se muestra igual.
// Antes, esa comprobación hacía que el número se perdiera: al volver a
// la tómbola el público veía otro número distinto al que había salido.
// ─────────────────────────────────────────────────────────────
import type { GameState, Phase } from './tombola'

export interface Presentation {
  /** Número a presentar a pantalla completa (null = no hay presentación) */
  winner: number | null
  /** Cerrar la presentación en curso (overlay del ganador y portada) */
  close: boolean
  /** La presentación ya se había visto: no se reabre al recargar la página */
  alreadyPresented: boolean
  /** Suena la fanfarria (se cantó un número) */
  fanfare: boolean
  /** Suena el redoble (el tambor está girando) */
  roll: boolean
}

const NOTHING: Presentation = {
  winner: null,
  close: false,
  alreadyPresented: false,
  fanfare: false,
  roll: false,
}

/**
 * Decide qué muestra la pantalla grande.
 *
 * @param prevPhase    fase en la última sincronización (null = primera vez)
 * @param prevRevealSeq  contador de revelaciones en la última sincronización
 * @param state        estado que acaba de llegar del servidor
 */
export function decidePresentation(
  prevPhase: Phase | null,
  prevRevealSeq: number | null,
  state: GameState,
): Presentation {
  // Primera sincronización real: solo se toma la referencia base. Si la
  // pantalla se carga con el juego ya en 'revealed', esa presentación se
  // considera terminada: nunca se reabre el ganador.
  if (prevPhase === null) {
    return { ...NOTHING, alreadyPresented: state.phase === 'revealed' }
  }

  const res: Presentation = { ...NOTHING }

  // ¿Se cantó un número nuevo? El contador revealSeq solo crece cuando
  // se materializa una bola, así que es la señal fiable aunque el cliente
  // se haya perdido fases intermedias. La comparación es estricta (>):
  // si el contador se reiniciara (estado nuevo), no hay nada que
  // presentar todavía.
  const seCantó = prevRevealSeq !== null && state.revealSeq > prevRevealSeq
  if (seCantó && state.lastNumber !== null) {
    res.winner = state.lastNumber
    res.fanfare = true
  }

  // ¿Cambió la fase? Si la fase sale de 'revealed' y no había un número
  // sin presentar, se cierra la presentación en curso. Si sí lo había,
  // gana la presentación: el número se ve primero y la fase nueva sigue
  // corriendo detrás del overlay.
  if (state.phase !== prevPhase) {
    if (state.phase !== 'revealed' && !seCantó) res.close = true
    if (state.phase === 'spinning') res.roll = true
  }

  return res
}
