import QRCode from 'qrcode'

// ─────────────────────────────────────────────────────────────
// QRs FIJOS como archivos permanentes:
//   /api/qr/control.png  → QR del control remoto (/?control)
//   /api/qr/lista.png    → QR de la lista del jefe (/?lista)
// El enlace que codifican nunca cambia, así que estos archivos se
// pueden guardar una vez y servirán siempre.
// ─────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

const QR_COLOR = { dark: '#2b1a0c', light: '#f7f1df' } as const

const TYPES: Record<string, { path: string; filename: string }> = {
  'control.png': { path: '/?control', filename: 'QR-control-remoto-stratega.png' },
  'lista.png': { path: '/?lista', filename: 'QR-lista-del-jefe-stratega.png' },
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string }> },
) {
  const { type } = await params
  const conf = TYPES[type]
  if (!conf) {
    return new Response('QR no encontrado. Usa /api/qr/control.png o /api/qr/lista.png', {
      status: 404,
    })
  }

  // Origen público real (detrás del gateway), p. ej. https://preview-xxxx.space-z.ai
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? 'localhost:3000'
  const proto = request.headers.get('x-forwarded-proto') ?? 'https'
  const link = `${proto}://${host}${conf.path}`

  const png = await QRCode.toBuffer(link, {
    width: 1024,
    margin: 3,
    color: QR_COLOR,
    errorCorrectionLevel: 'M',
  })

  const download = new URL(request.url).searchParams.has('download')
  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store',
      ...(download
        ? { 'Content-Disposition': `attachment; filename="${conf.filename}"` }
        : {}),
    },
  })
}
