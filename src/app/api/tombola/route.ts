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
import { INITIAL_STATE } from '@/lib/tombola'
import { type ActionName } from '@/lib/tombola-engine'
import { casWrite, readRaw } from '@/lib/tombola-store'
import { applyGameAction, withState } from '@/lib/tombola-cycle'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' } as const

// El almacén real: Upstash Redis (REST) en Vercel, memoria del proceso
// en local. El compare-and-set evita que dos peticiones se pisen.
const store = {
  readRaw: () => readRaw(),
  casWrite: (expected: string, next: string) => casWrite(expected, next),
}

export async function GET() {
  try {
    const { state } = await withState(store, null)
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
    const { result, state } = await applyGameAction(store, action, {
      numbers: body?.numbers,
    })
    return NextResponse.json({ result, state }, { headers: NO_STORE })
  } catch {
    return NextResponse.json({ error: 'store' }, { status: 503, headers: NO_STORE })
  }
}
