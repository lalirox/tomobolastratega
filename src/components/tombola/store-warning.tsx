'use client'

import { AlertTriangle } from 'lucide-react'
import type { StoreStatus } from '@/lib/tombola'

/**
 * Aviso grande cuando el estado NO se está compartiendo.
 *
 * En Vercel cada instancia tiene su propia memoria: si falta la
 * configuración de Upstash, la pantalla grande y el celular van por
 * caminos distintos y cada uno calcula su propio número. Sin este aviso
 * el problema pasa desapercibido hasta la posada, así que se muestra
 * bien grande en el proyector y también en el celular del anfitrión.
 */
export function StoreWarning({
  store,
  variant = 'banner',
}: {
  store: StoreStatus | null
  /** 'banner' = tira fija arriba (pantalla grande) · 'inline' = bloque (celular) */
  variant?: 'banner' | 'inline'
}) {
  if (!store || store.modo === 'redis') return null

  const contenido = (
    <>
      <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="font-bold uppercase tracking-wide">
        ⚠ Sin sincronización — el celular NO controla esta pantalla
      </span>
      {store.problema && (
        <span className="hidden opacity-80 sm:inline">{store.problema}</span>
      )}
    </>
  )

  if (variant === 'inline') {
    return (
      <div
        role="alert"
        className="mb-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-md border-2 border-[#e05a4a] bg-[#7f1010]/90 px-3 py-2 text-center font-elite text-[11px] text-[#ffe9e2]"
      >
        {contenido}
      </div>
    )
  }

  return (
    <div
      role="alert"
      className="sticky top-0 z-[100] flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-b-4 border-[#e05a4a] bg-[#7f1010]/95 px-4 py-2 text-center font-elite text-xs text-[#ffe9e2] shadow-lg sm:text-sm"
    >
      {contenido}
    </div>
  )
}
