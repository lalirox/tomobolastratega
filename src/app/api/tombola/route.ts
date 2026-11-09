// ─────────────────────────────────────────────────────────────
// API de la tómbola (reemplaza al servicio socket.io del puerto
// 3003 para poder desplegar en Vercel, que no permite procesos
// persistentes ni WebSockets propios).
//
//  GET  /api/tombola          → { state }  (avanza el reloj del juego)
//  POST /api/tombola          → { result, state }
//       body: { action: 'press' | 'alert' | 'lock' | 'reset' | 'setQueue',
//               numbers?: number[] }
//
// El estado vive en Upstash Redis (REST) cuando se definen
// UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN — imprescindible
// en Vercel — y en la memoria del proceso en local (sin configurar).
// ─────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server'
import { INITIAL_STATE, type GameState } from '@/lib/tombola'
import {
  advance,
  applyAction,
  type ActionName,
  type ActionResult,
} from '@/lib/tombola-engine'
import { casWrite, readRaw } from '@/lib/tombola-store'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' } as const

function parseState(raw: string | null): GameState {
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
      // Estado legado sin phaseStart (por si acaso): se normaliza
      return { ...INITIAL_STATE, ...parsed, phaseStart: parsed.phaseStart ?? 0 }
    }
  } catch {
    // JSON corrupto: se arranca de cero
  }
  return INITIAL_STATE
}

/**
 * Ciclo lectura → avanzar → mutar → escritura CAS. Si otra petición
 * ganó la carrera, reintenta con el valor fresco (hasta 6 veces).
 */
async function withState(
  mutate?: (state: GameState) => { state: GameState; result: ActionResult },
): Promise<{ result: ActionResult; state: GameState }> {
  let last: { result: ActionResult; state: GameState } | null = null
  for (let attempt = 0; attempt < 6; attempt++) {
    const raw = await readRaw()
    const current = parseState(raw)
    const advanced = advance(current, Date.now())
    const mutated = mutate ? mutate(advanced) : { state: advanced, result: 'ok' as const }
    last = mutated
    const ok = await casWrite(raw ?? '', JSON.stringify(mutated.state))
    if (ok) return mutated
  }
  // No se pudo escribir tras los reintentos: se devuelve el mejor
  // cálculo posible (la siguiente petición lo corregirá)
  return last ?? { result: 'ok', state: advance(INITIAL_STATE, Date.now()) }
}

export async function GET() {
  try {
    const { state } = await withState()
    return NextResponse.json({ state }, { headers: NO_STORE })
  } catch {
    return NextResponse.json(
      { state: INITIAL_STATE, error: 'store' },
      { status: 503, headers: NO_STORE },
    )
  }
}

export async function POST(req: NextRequest) {
  let body: { action?: string; numbers?: unknown }
  try {
    body = (await req.json()) as { action?: string; numbers?: unknown }
  } catch {
    return NextResponse.json({ error: 'bad-json' }, { status: 400, headers: NO_STORE })
  }

  const action = body?.action as ActionName
  if (!['press', 'alert', 'lock', 'reset', 'setQueue'].includes(action)) {
    return NextResponse.json({ error: 'bad-action' }, { status: 400, headers: NO_STORE })
  }

  try {
    const { result, state } = await withState((current) =>
      applyAction(current, action, { numbers: body?.numbers }, Date.now()),
    )
    return NextResponse.json({ result, state }, { headers: NO_STORE })
  } catch {
    return NextResponse.json({ error: 'store' }, { status: 503, headers: NO_STORE })
  }
}
