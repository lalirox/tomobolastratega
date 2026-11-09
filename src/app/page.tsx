'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { ScreenView } from '@/components/tombola/screen-view'
import { ControllerView } from '@/components/tombola/controller-view'
import { MaestroView } from '@/components/tombola/maestro-view'

function TombolaPage() {
  const params = useSearchParams()
  // La pantalla del celular se abre con /?control (el enlace del código QR)
  const isController = params.has('control')
  // Página secreta del jefe: /?lista (el QR oculto de la marca Y)
  const isMaestro = params.has('lista')
  if (isMaestro) return <MaestroView />
  return isController ? <ControllerView /> : <ScreenView />
}

export default function Page() {
  return (
    <Suspense fallback={<div className="wood-bg min-h-dvh" aria-hidden="true" />}>
      <TombolaPage />
    </Suspense>
  )
}
