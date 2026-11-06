'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Check, Copy, Link2, QrCode as QrIcon } from 'lucide-react'

export function QrPanel() {
  const [qrSrc, setQrSrc] = useState<string | null>(null)
  const [url, setUrl] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    const link = `${window.location.origin}/?control`
    QRCode.toDataURL(link, {
      width: 512,
      margin: 2,
      color: { dark: '#2b1a0c', light: '#f3e6c3' },
      errorCorrectionLevel: 'M',
    })
      .then((src) => {
        if (cancelled) return
        setUrl(link)
        setQrSrc(src)
      })
      .catch(() => {
        if (cancelled) return
        setUrl(link)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // sin permisos de portapapeles
    }
  }

  return (
    <section
      className="parchment relative rounded-md border-2 border-[#6b4423] p-4 shadow-[0_10px_24px_rgba(0,0,0,.45)]"
      aria-label="Código QR para controlar la tómbola desde el celular"
    >
      <Studs />
      <div className="mb-2 flex items-center gap-2">
        <QrIcon className="h-5 w-5 text-[#5a3a1c]" aria-hidden="true" />
        <h2 className="font-rye text-lg text-[#3b2314] sm:text-xl">Convierte tu celular en control remoto</h2>
      </div>
      <p className="mb-3 font-elite text-sm leading-snug text-[#5a3a1c]">
        Escanea este código con la cámara de tu celular y aparecerá el botón rojo.
      </p>
      <div className="flex items-center gap-4">
        <div className="shrink-0 rounded-md border-4 border-double border-[#6b4423] bg-[#f3e6c3] p-1.5 shadow-inner">
          {qrSrc ? (
            <img src={qrSrc} alt="Código QR para abrir el control remoto de la tómbola" className="h-32 w-32 sm:h-40 sm:w-40" />
          ) : (
            <div className="flex h-32 w-32 items-center justify-center sm:h-40 sm:w-40">
              <span className="font-elite text-xs text-[#8a6a3f]">Generando QR...</span>
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="flex items-start gap-1.5 font-elite text-xs break-words text-[#5a3a1c]">
            <Link2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="break-all">{url || '...'}</span>
          </p>
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-1.5 rounded-md border-2 border-[#6b4423] bg-[#e0c68f] px-3 py-1.5 font-elite text-xs font-bold text-[#3b2314] shadow transition hover:bg-[#d4b378] active:scale-95"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" aria-hidden="true" /> ¡Copiado!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" aria-hidden="true" /> Copiar enlace
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  )
}

// Tachuelas de las esquinas, estilo cartel
export function Studs() {
  return (
    <>
      <span className="stud left-1.5 top-1.5" aria-hidden="true" />
      <span className="stud right-1.5 top-1.5" aria-hidden="true" />
      <span className="stud bottom-1.5 left-1.5" aria-hidden="true" />
      <span className="stud bottom-1.5 right-1.5" aria-hidden="true" />
    </>
  )
}
