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
}

export const INITIAL_STATE: GameState = {
  phase: 'idle',
  countdown: 0,
  drawn: [],
  lastNumber: null,
  remaining: 100,
  total: 100,
  alertSeq: 0,
}

export type Role = 'screen' | 'controller'
