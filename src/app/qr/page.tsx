'use client'

import { useEffect, useState } from 'react'
import { Check, Copy, Download, Link2, ListOrdered, Lock, Smartphone } from 'lucide-react'
import { Studs } from '@/components/tombola/qr-panel'
import { StrategaLogo } from '@/components/tombola/brand'
import { buildQrImage, buildQrPoster, QR_FILENAMES, saveDataUrl } from '@/lib/qr-download'

// ─────────────────────────────────────────────────────────────
// PÁGINA DE LOS QR FIJOS (/qr)
// Aquí están siempre los dos códigos, sin contraseñas ni tiempos:
// se pueden guardar como PNG una sola vez y sirven para siempre,
// porque los enlaces que codifican nunca cambian.
// ─────────────────────────────────────────────────────────────

interface QrCardProps {
  href: string
  title: string
  subtitle: string
  posterTitle: string
  filename: string
  icon: React.ReactNode
  note: string
}

function QrCard({ href, title, subtitle, posterTitle, filename, icon, note }: QrCardProps) {
  const [qrSrc, setQrSrc] = useState<string | null>(null)
  const [link, setLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)

  // El enlace es fijo: origen de la app + ruta permanente
  useEffect(() => {
    const full = `${window.location.origin}${href}`
    setLink(full)
    let cancelled = false
    buildQrImage(full, 640)
      .then((src) => {
        if (!cancelled) setQrSrc(src)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [href])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // sin permisos de portapapeles
    }
  }

  const save = async () => {
    if (!link || saving) return
    setSaving(true)
    try {
      const poster = await buildQrPoster(link, posterTitle)
      saveDataUrl(poster, filename)
    } catch {
      // sin canvas disponible
    } finally {
      setSaving(false)
    }
  }

  return (
    <section
      className="parchment relative flex w-full max-w-sm flex-col items-center rounded-md border-4 border-double border-[#4a3a24] p-5 text-center shadow-[0_18px_44px_rgba(0,0,0,.6)]"
      aria-label={`Código QR fijo: ${title}`}
    >
      <Studs />
      <div className="flex items-center justify-center gap-2 text-[#8b1a1a]">
        {icon}
        <h2 className="font-rye text-xl text-[#33240f]">{title}</h2>
      </div>
      <p className="mt-0.5 font-elite text-[10px] font-bold uppercase tracking-[0.25em] text-[#8a6a3f]">
        {subtitle}
      </p>

      <div className="mt-4 rounded-md border-4 border-double border-[#4a3a24] bg-[#f0e8d2] p-2 shadow-inner">
        {qrSrc ? (
          <img src={qrSrc} alt={`Código QR fijo para ${title}`} className="h-52 w-52" />
        ) : (
          <div className="flex h-52 w-52 items-center justify-center">
            <span className="font-elite text-xs text-[#8a6a3f]">Generando QR...</span>
          </div>
        )}
      </div>

      <p className="mt-3 flex max-w-full items-start gap-1.5 font-elite text-[11px] break-all text-[#5a4626]">
        <Link2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="break-all">{link || '...'}</span>
      </p>

      <div className="mt-3 grid w-full grid-cols-2 gap-2">
        <button
          type="button"
          onClick={save}
          disabled={!link || saving}
          className="inline-flex items-center justify-center gap-1.5 rounded-md border-2 border-[#5a1610] bg-gradient-to-b from-[#a3271c] to-[#7f1010] px-2 py-2.5 font-elite text-xs font-bold text-[#f5efdd] shadow transition hover:from-[#b53427] active:scale-95 disabled:opacity-60"
        >
          <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
          {saving ? 'Guardando...' : 'Guardar PNG'}
        </button>
        <button
          type="button"
          onClick={copy}
          disabled={!link}
          className="inline-flex items-center justify-center gap-1.5 rounded-md border-2 border-[#4a3a24] bg-[#e0d5b8] px-2 py-2.5 font-elite text-xs font-bold text-[#33240f] shadow transition hover:bg-[#d4c8a8] active:scale-95 disabled:opacity-60"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> ¡Copiado!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 shrink-0" aria-hidden="true" /> Copiar enlace
            </>
          )}
        </button>
      </div>

      <p className="mt-3 font-elite text-[10px] leading-snug text-[#8a6a3f]">{note}</p>
    </section>
  )
}

export default function QrFijosPage() {
  return (
    <div className="wood-bg flex min-h-dvh flex-col items-center px-4 py-8 text-[#f3e6c3]">
      <header className="mb-6 text-center">
        <StrategaLogo className="mx-auto h-16 w-16 object-contain sm:h-20 sm:w-20" />
        <h1 className="mt-2 font-rye text-3xl text-[#e6d9b8] drop-shadow-[0_3px_0_rgba(0,0,0,.8)] sm:text-4xl">
          CÓDIGOS QR FIJOS
        </h1>
        <p className="font-elite text-[10px] font-bold tracking-[0.3em] text-[#d43a2a] sm:text-xs">
          POSADA STRATEGA CONSULTORES 2026
        </p>
        <p className="mx-auto mt-2 max-w-md font-elite text-xs leading-snug text-[#c9a97a]">
          Estos dos códigos <strong className="text-[#e8c877]">nunca cambian</strong>. Guarda las
          imágenes (o imprímelas) y úsalas siempre, sin necesidad de entrar al sistema.
        </p>
      </header>

      <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-stretch lg:justify-center">
        <QrCard
          href="/?control"
          title="CONTROL REMOTO"
          subtitle="El celular mueve la tómbola"
          posterTitle="CONTROL REMOTO · POSADA 2026"
          filename={QR_FILENAMES.control}
          icon={<Smartphone className="h-5 w-5" aria-hidden="true" />}
          note="Abre el control remoto con el botón rojo, la cuenta 5 → 0 y la sirena de alerta."
        />
        <QrCard
          href="/?lista"
          title="LA LISTA DEL JEFE"
          subtitle="Programa qué números salen"
          posterTitle="LA LISTA DEL JEFE · POSADA 2026"
          filename={QR_FILENAMES.lista}
          icon={<ListOrdered className="h-5 w-5" aria-hidden="true" />}
          note="Página privada del anfitrión: al abrirla pide la contraseña. Comparte el QR solo con el jefe."
        />
      </div>

      <div className="mt-8 flex max-w-md items-start gap-2 rounded-md border border-[#5a3a1c] bg-[#1c1208]/85 p-3 text-left">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[#e8c877]" aria-hidden="true" />
        <p className="font-elite text-[11px] leading-snug text-[#c9a97a]">
          En la pantalla grande los QR se muestran protegidos con contraseña y se ocultan solos;
          esta página es tu resguardo permanente para descargarlos cuando quieras.
        </p>
      </div>

      <footer className="mt-auto pt-8 text-center">
        <p className="font-elite text-[11px] tracking-widest text-[#8a7a58]">
          POSADA STRATEGA CONSULTORES 2026 · TÓMBOLA
        </p>
      </footer>
    </div>
  )
}
