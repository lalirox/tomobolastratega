'use client'

import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import {
  Check,
  Copy,
  Download,
  Lock,
  LockKeyholeOpen,
  Link2,
  QrCode as QrIcon,
  ShieldCheck,
  Smartphone,
  Timer,
} from 'lucide-react'
import { buildQrPoster, QR_FILENAMES, saveDataUrl } from '@/lib/qr-download'

// Contraseña privada del anfitrión para mostrar el código QR
const QR_PASSWORD = 'Strategapool_2026'
// El QR se vuelve a bloquear solo después de estos segundos visibles
const AUTOLOCK_SECONDS = 10

export function QrPanel() {
  const [qrSrc, setQrSrc] = useState<string | null>(null)
  const [url, setUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [pw, setPw] = useState('')
  const [error, setError] = useState(false)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Generar el QR una sola vez (nunca se muestra sin contraseña)
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

  // Auto-bloqueo: cuando está desbloqueado, cuenta regresiva y se oculta solo
  useEffect(() => {
    if (!unlocked || secondsLeft <= 0) return
    const t = setTimeout(() => {
      if (secondsLeft - 1 <= 0) {
        setUnlocked(false)
        setSecondsLeft(0)
      } else {
        setSecondsLeft(secondsLeft - 1)
      }
    }, 1000)
    return () => clearTimeout(t)
  }, [unlocked, secondsLeft])

  const unlock = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (pw === QR_PASSWORD) {
      setUnlocked(true)
      setSecondsLeft(AUTOLOCK_SECONDS)
      setError(false)
      setPw('')
    } else {
      setError(true)
      setPw('')
      inputRef.current?.focus()
    }
  }

  const lockNow = () => {
    setUnlocked(false)
    setSecondsLeft(0)
    setError(false)
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

  // Guarda el QR como PNG fijo (con título y enlace) para tenerlo
  // impreso o en el celular sin necesidad de entrar al sistema
  const savePng = async () => {
    if (!url || saving) return
    setSaving(true)
    try {
      const poster = await buildQrPoster(url, 'CONTROL REMOTO · POSADA 2026')
      saveDataUrl(poster, QR_FILENAMES.control)
    } catch {
      // sin canvas disponible
    } finally {
      setSaving(false)
    }
  }

  const progress = unlocked ? (secondsLeft / AUTOLOCK_SECONDS) * 100 : 0

  return (
    <section
      className="parchment relative rounded-md border-2 border-[#4a3a24] p-4 shadow-[0_10px_24px_rgba(0,0,0,.45)]"
      aria-label="Código QR protegido para controlar la tómbola desde el celular"
    >
      <Studs />
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <QrIcon className="h-5 w-5 text-[#5a4626]" aria-hidden="true" />
        <h2 className="font-rye text-lg text-[#33240f] sm:text-xl">Control remoto por QR</h2>
        {unlocked && (
          <span
            className="ml-auto inline-flex items-center gap-1 rounded-full border border-[#8a6a3f] bg-[#efe4c8] px-2 py-0.5 font-elite text-[11px] font-bold text-[#7a5c14]"
            role="timer"
            aria-live="off"
          >
            <Timer className="h-3 w-3" aria-hidden="true" />
            Se bloquea en {secondsLeft}s
          </span>
        )}
      </div>

      {!unlocked ? (
        // ── Zona protegida con contraseña ──
        <form onSubmit={unlock} className={error ? 'animate-shake' : ''}>
          <p className="mb-3 flex items-start gap-2 font-elite text-sm leading-snug text-[#5a4626]">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[#8b1a1a]" aria-hidden="true" />
            <span>
              El código QR es <strong>privado del anfitrión</strong>. Introduce la contraseña para
              mostrarlo: se volverá a bloquear <strong>solo</strong> a los 10 segundos.
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
        // ── QR visible con auto-bloqueo ──
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 font-elite text-xs font-bold text-[#3e5a2a]">
              <LockKeyholeOpen className="h-3.5 w-3.5" aria-hidden="true" />
              Visible · escanea con la cámara de tu celular
            </p>
            <button
              type="button"
              onClick={lockNow}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#4a3a24] bg-[#e0d5b8] px-2.5 py-1 font-elite text-xs font-bold text-[#5a4626] shadow transition hover:bg-[#d4c8a8] active:scale-95"
            >
              <Lock className="h-3 w-3" aria-hidden="true" />
              Bloquear ahora
            </button>
          </div>

          {/* Barra del auto-bloqueo (10 s) */}
          <div
            className="mb-3 h-1.5 overflow-hidden rounded-full bg-[#d4c8a8]"
            role="progressbar"
            aria-label="Tiempo restante para bloquear el QR"
            aria-valuemin={0}
            aria-valuemax={AUTOLOCK_SECONDS}
            aria-valuenow={secondsLeft}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#8b1a1a] to-[#c9a227] transition-all duration-1000 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="shrink-0 rounded-md border-4 border-double border-[#4a3a24] bg-[#f0e8d2] p-1.5 shadow-inner">
              {qrSrc ? (
                <img
                  src={qrSrc}
                  alt="Código QR para abrir el control remoto de la tómbola"
                  className="h-28 w-28 sm:h-36 sm:w-36"
                />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center sm:h-36 sm:w-36">
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
              <button
                type="button"
                onClick={savePng}
                disabled={!url || saving}
                className="inline-flex items-center gap-1.5 rounded-md border-2 border-[#4a3a24] bg-[#e0d5b8] px-3 py-1.5 font-elite text-xs font-bold text-[#33240f] shadow transition hover:bg-[#d4c8a8] active:scale-95 disabled:opacity-60"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                {saving ? 'Guardando...' : 'Guardar QR (PNG)'}
              </button>
              <p className="font-elite text-[10px] leading-snug text-[#8a6a3f]">
                Al cumplirse el tiempo, el QR se oculta solo para que nadie más pueda escanearlo.
                El PNG guardado sirve siempre: el enlace del QR no cambia.
              </p>
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

// ─────────────────────────────────────────────────────────────
// CARTELES QR A PANTALLA COMPLETA (se ocultan solos a los 10 s):
//  · ControlQrOverlay → aparece al tocar el LOGO del encabezado;
//    es el QR del control remoto que hace girar la tómbola (/?control)
//  · SecretQrOverlay  → aparece al presionar la marca "Y"; es el QR
//    MAESTRO del jefe para programar los números que saldrán (/?lista)
// ─────────────────────────────────────────────────────────────

const OVERLAY_SECONDS = 10

interface QrOverlayCardProps {
  title: string
  icon: React.ReactNode
  path: string
  alt: string
  saveTitle: string
  saveFilename: string
  onClose: () => void
}

function QrOverlayCard({ title, icon, path, alt, saveTitle, saveFilename, onClose }: QrOverlayCardProps) {
  const [qrSrc, setQrSrc] = useState<string | null>(null)
  const [url, setUrl] = useState('')
  const [secondsLeft, setSecondsLeft] = useState(OVERLAY_SECONDS)
  const [saving, setSaving] = useState(false)

  // Ref siempre fresco para usarlo en timers sin re-crear efectos
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  })

  // QR del enlace fijo (el enlace nunca cambia)
  useEffect(() => {
    let cancelled = false
    const link = `${window.location.origin}${path}`
    QRCode.toDataURL(link, {
      width: 560,
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
  }, [path])

  // Autodestrucción: cuenta 10 s y se cierra solo
  useEffect(() => {
    if (secondsLeft <= 0) {
      queueMicrotask(() => closeRef.current())
      return
    }
    const t = setTimeout(() => setSecondsLeft(secondsLeft - 1), 1000)
    return () => clearTimeout(t)
  }, [secondsLeft])

  const progress = (secondsLeft / OVERLAY_SECONDS) * 100

  // Guarda el QR como PNG fijo (queda guardado aunque el cartel se oculte)
  const savePng = async () => {
    if (!url || saving) return
    setSaving(true)
    try {
      const poster = await buildQrPoster(url, saveTitle)
      saveDataUrl(poster, saveFilename)
    } catch {
      // sin canvas disponible
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="animate-fade-in fixed inset-0 z-[80] flex items-center justify-center overflow-hidden bg-[#070402]/95 p-4"
      role="dialog"
      aria-label={alt}
      onClick={() => closeRef.current()}
    >
      {/* Rayos dorados girando detrás del cartel */}
      <div className="rays-spin absolute left-1/2 top-1/2 h-[250vmax] w-[250vmax]" aria-hidden="true" />

      <div
        className="parchment relative z-10 w-full max-w-sm rounded-md border-4 border-double border-[#4a3a24] p-5 text-center shadow-[0_18px_44px_rgba(0,0,0,.65)]"
        onClick={(e) => e.stopPropagation()}
      >
        <Studs />
        <div className="flex items-center justify-center gap-2 text-[#8b1a1a]">
          {icon}
          <h2 className="font-rye text-xl text-[#33240f] sm:text-2xl">{title}</h2>
        </div>

        <div className="mx-auto mt-4 w-fit rounded-md border-4 border-double border-[#4a3a24] bg-[#f0e8d2] p-2 shadow-inner">
          {qrSrc ? (
            <img src={qrSrc} alt={alt} className="h-48 w-48 sm:h-56 sm:w-56" />
          ) : (
            <div className="flex h-48 w-48 items-center justify-center sm:h-56 sm:w-56">
              <span className="font-elite text-xs text-[#8a6a3f]">Generando QR...</span>
            </div>
          )}
        </div>

        {/* Cuenta regresiva antes de ocultarse */}
        <div className="mt-4" role="timer" aria-live="off">
          <div
            className="h-2 overflow-hidden rounded-full bg-[#d4c8a8]"
            role="progressbar"
            aria-label="Tiempo restante para ocultar el QR"
            aria-valuemin={0}
            aria-valuemax={OVERLAY_SECONDS}
            aria-valuenow={secondsLeft}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#8b1a1a] to-[#c9a227] transition-all duration-1000 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1.5 font-elite text-xs font-bold text-[#8b1a1a]">
            Se oculta en {secondsLeft}s
          </p>
        </div>

        {/* Guardar el QR fijo como PNG */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            savePng()
          }}
          disabled={!url || saving}
          className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-md border-2 border-[#4a3a24] bg-[#e0d5b8] px-2 py-2 font-elite text-[11px] font-bold text-[#33240f] shadow transition hover:bg-[#d4c8a8] active:scale-95 disabled:opacity-60"
        >
          <Download className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {saving ? 'Guardando...' : 'Guardar QR (PNG)'}
        </button>

        <p className="mt-2 font-elite text-[10px] tracking-[0.3em] text-[#8a6a3f]">
          TOCA PARA CERRAR
        </p>
      </div>
    </div>
  )
}

/** QR del CONTROL REMOTO: se abre al tocar el logo del encabezado de la pantalla */
export function ControlQrOverlay({ onClose }: { onClose: () => void }) {
  return (
    <QrOverlayCard
      title="CONTROL REMOTO"
      icon={<Smartphone className="h-5 w-5 shrink-0" aria-hidden="true" />}
      path="/?control"
      alt="Código QR del control remoto de la tómbola"
      saveTitle="CONTROL REMOTO · POSADA 2026"
      saveFilename={QR_FILENAMES.control}
      onClose={onClose}
    />
  )
}

/** QR MAESTRO del jefe: se abre con la marca Y y lleva a la lista de números programados */
export function SecretQrOverlay({ onClose }: { onClose: () => void }) {
  return (
    <QrOverlayCard
      title="SOLO PARA EL JEFE"
      icon={<Lock className="h-5 w-5 shrink-0" aria-hidden="true" />}
      path="/?lista"
      alt="Código QR privado del jefe"
      saveTitle="LA LISTA DEL JEFE · POSADA 2026"
      saveFilename={QR_FILENAMES.lista}
      onClose={onClose}
    />
  )
}
