'use client'

import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import {
  Check,
  Copy,
  Lock,
  LockKeyholeOpen,
  Link2,
  QrCode as QrIcon,
  ShieldCheck,
} from 'lucide-react'

// Contraseña privada del anfitrión para mostrar el código QR
const QR_PASSWORD = 'Strategapool_2026'
const STORAGE_KEY = 'stratega-qr-desbloqueado'

export function QrPanel() {
  const [qrSrc, setQrSrc] = useState<string | null>(null)
  const [url, setUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const [pw, setPw] = useState('')
  const [error, setError] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Generar el QR solo cuando está desbloqueado (nadie lo ve antes)
  useEffect(() => {
    let cancelled = false
    const link = `${window.location.origin}/?control`
    QRCode.toDataURL(link, {
      width: 512,
      margin: 2,
      color: { dark: '#2b1a0c', light: '#f0e8d2' },
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

  // Restaurar desbloqueo de la sesión (queueMicrotask evita setState síncrono en efecto)
  useEffect(() => {
    queueMicrotask(() => {
      try {
        setUnlocked(window.sessionStorage.getItem(STORAGE_KEY) === '1')
      } catch {
        setUnlocked(false)
      }
    })
  }, [])

  const unlock = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (pw === QR_PASSWORD) {
      setUnlocked(true)
      setError(false)
      setPw('')
      try {
        window.sessionStorage.setItem(STORAGE_KEY, '1')
      } catch {
        // sin almacenamiento
      }
    } else {
      setError(true)
      setPw('')
      inputRef.current?.focus()
    }
  }

  const lockAgain = () => {
    setUnlocked(false)
    setError(false)
    try {
      window.sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      // sin almacenamiento
    }
  }

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
      className="parchment relative rounded-md border-2 border-[#4a3a24] p-4 shadow-[0_10px_24px_rgba(0,0,0,.45)]"
      aria-label="Código QR protegido para controlar la tómbola desde el celular"
    >
      <Studs />
      <div className="mb-2 flex items-center gap-2">
        <QrIcon className="h-5 w-5 text-[#5a4626]" aria-hidden="true" />
        <h2 className="font-rye text-lg text-[#33240f] sm:text-xl">
          Convierte tu celular en control remoto
        </h2>
      </div>

      {!unlocked ? (
        // ── Zona protegida con contraseña ──
        <form onSubmit={unlock} className={error ? 'animate-shake' : ''}>
          <p className="mb-3 flex items-start gap-2 font-elite text-sm leading-snug text-[#5a4626]">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[#8b1a1a]" aria-hidden="true" />
            <span>
              El código QR es <strong>privado del anfitrión</strong>. Introduce la contraseña para
              mostrarlo en pantalla.
            </span>
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              ref={inputRef}
              type="password"
              value={pw}
              onChange={(e) => {
                setPw(e.target.value)
                setError(false)
              }}
              placeholder="Contraseña del anfitrión"
              aria-label="Contraseña del anfitrión"
              autoComplete="off"
              className="flex-1 rounded-md border-2 border-[#4a3a24] bg-[#f5efdd] px-3 py-2 font-elite text-sm text-[#33240f] shadow-inner outline-none placeholder:text-[#a08c60] focus:border-[#8b1a1a]"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 rounded-md border-2 border-[#5a1610] bg-gradient-to-b from-[#a3271c] to-[#7f1010] px-4 py-2 font-elite text-sm font-bold text-[#f5efdd] shadow transition hover:from-[#b53427] active:scale-95"
            >
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Desbloquear QR
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-2 font-elite text-sm font-bold text-[#8b1a1a]">
              ✗ Contraseña incorrecta. Solo el anfitrión puede ver el QR.
            </p>
          )}
        </form>
      ) : (
        // ── QR visible ──
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 font-elite text-xs font-bold text-[#3e5a2a]">
              <LockKeyholeOpen className="h-3.5 w-3.5" aria-hidden="true" />
              Desbloqueado · escanea con la cámara de tu celular
            </p>
            <button
              type="button"
              onClick={lockAgain}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#4a3a24] bg-[#e0d5b8] px-2.5 py-1 font-elite text-xs font-bold text-[#5a4626] shadow transition hover:bg-[#d4c8a8] active:scale-95"
            >
              <Lock className="h-3 w-3" aria-hidden="true" />
              Ocultar de nuevo
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="shrink-0 rounded-md border-4 border-double border-[#4a3a24] bg-[#f0e8d2] p-1.5 shadow-inner">
              {qrSrc ? (
                <img
                  src={qrSrc}
                  alt="Código QR para abrir el control remoto de la tómbola"
                  className="h-32 w-32 sm:h-40 sm:w-40"
                />
              ) : (
                <div className="flex h-32 w-32 items-center justify-center sm:h-40 sm:w-40">
                  <span className="font-elite text-xs text-[#8a6a3f]">Generando QR...</span>
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <p className="flex items-start gap-1.5 font-elite text-xs break-words text-[#5a4626]">
                <Link2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="break-all">{url || '...'}</span>
              </p>
              <button
                type="button"
                onClick={copy}
                className="inline-flex items-center gap-1.5 rounded-md border-2 border-[#4a3a24] bg-[#e0d5b8] px-3 py-1.5 font-elite text-xs font-bold text-[#33240f] shadow transition hover:bg-[#d4c8a8] active:scale-95"
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
        </div>
      )}
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
