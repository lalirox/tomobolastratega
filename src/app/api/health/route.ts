// ─────────────────────────────────────────────────────────────
// Comprobación de salud del almacén compartido.
//
// GET /api/health → { ok, modo, host, problema, detalle, estadoGuardado }
//
// Sirve para responder una sola pregunta sin adivinar: ¿la pantalla
// grande y el celular se están sincronizando? Se abre en el navegador
// y se lee.
//
//   · ok: true   → Redis responde (escritura y lectura). Todo bien.
//   · ok: false  → el juego NO se sincroniza entre dispositivos; el
//                   campo `problema` dice qué variable corregir.
// ─────────────────────────────────────────────────────────────
import { NextResponse } from 'next/server'
import { ping, readRaw, storeInfo } from '@/lib/tombola-store'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' } as const

export async function GET() {
  const info = storeInfo()

  // Si ya sabemos que la configuración está mal, no gastamos una llamada
  // a Upstash: el diagnóstico local es más rápido y más claro.
  if (info.problema) {
    return NextResponse.json(
      {
        ok: false,
        modo: info.modo,
        host: info.host,
        problema: info.problema,
        detalle: 'La configuración del almacén no permite sincronizar la pantalla y el celular.',
        estadoGuardado: false,
      },
      { status: 503, headers: NO_STORE },
    )
  }

  const p = await ping()
  let estadoGuardado = false
  try {
    estadoGuardado = (await readRaw()) !== null
  } catch {
    estadoGuardado = false
  }

  return NextResponse.json(
    {
      ok: p.ok,
      modo: info.modo,
      host: info.host,
      problema: info.problema,
      detalle: p.detalle,
      estadoGuardado,
    },
    { status: p.ok ? 200 : 503, headers: NO_STORE },
  )
}
