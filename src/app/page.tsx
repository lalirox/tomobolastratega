'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { ScreenView } from '@/components/tombola/screen-view'
import { ControllerView } from '@/components/tombola/controller-view'

function TombolaPage() {
  const params = useSearchParams()
  // La pantalla del celular se abre con /?control (el enlace del código QR)
  const isController = params.has('control')
  return isController ? <ControllerView /> : <ScreenView />
}

export default function Page() {
  return (
    <Suspense fallback={<div className="wood-bg min-h-dvh" aria-hidden="true" />}>
      <TombolaPage />
    </Suspense>
  )
}
