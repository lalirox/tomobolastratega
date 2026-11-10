// Tipos compartidos del juego de la tómbola

export type Phase = 'idle' | 'alert' | 'countdown' | 'spinning' | 'revealed'

export interface GameState {
  phase: Phase
  countdown: number
  drawn: number[]
  lastNumber: number | null
  remaining: number
  total: number
  /** Contador de alertas enviadas: al cambiar, suena la sirena de nuevo */
  alertSeq: number
  /** Contador de bloqueos remotos: al cambiar, la pantalla grande pasa a reposo */
  lockSeq: number
  /** Contador de números cantados: al cambiar, la pantalla abre el overlay del ganador */
  revealSeq: number
  /** Lista programada por el jefe: próximos números que saldrán, en orden */
  fixedQueue: number[]
  /** Momento (epoch ms) en que arrancó la fase actual: countdown, spinning o alert */
  phaseStart: number
}

export const INITIAL_STATE: GameState = {
  phase: 'idle',
  countdown: 0,
  drawn: [],
  lastNumber: null,
  remaining: 100,
  total: 100,
  alertSeq: 0,
  lockSeq: 0,
  revealSeq: 0,
  fixedQueue: [],
  phaseStart: 0,
}

export type Role = 'screen' | 'controller'

/**
 * Estado del almacén compartido que reporta el servidor. Si el modo es
 * 'memoria', la pantalla grande y el celular NO se sincronizan (cada
 * instancia de Vercel tiene su propia copia) y hay que avisarlo.
 */
export interface StoreStatus {
  /** 'redis' = estado compartido (todo bien) · 'memoria' = sin sincronizar */
  modo: 'redis' | 'memoria'
  /** Qué está mal en la configuración (null si todo está bien) */
  problema: string | null
}
