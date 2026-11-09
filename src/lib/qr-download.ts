import QRCode from 'qrcode'

// ─────────────────────────────────────────────────────────────
// QRs FIJOS de la tómbola: se generan una sola vez con el enlace
// permanente (el mismo siempre) y se pueden guardar como PNG para
// tenerlos impresos o en el celular sin abrir el sistema.
// ─────────────────────────────────────────────────────────────

/** Enlaces permanentes que codifican los QR (no cambian nunca) */
export const QR_LINKS = {
  control: { path: '/?control', label: 'Control remoto' },
  lista: { path: '/?lista', label: 'La lista del jefe' },
} as const

export type QrKind = keyof typeof QR_LINKS

const QR_COLOR = { dark: '#2b1a0c', light: '#f7f1df' } as const

/** Genera solo la imagen cuadrada del QR (data URL) */
export async function buildQrImage(link: string, width = 560): Promise<string> {
  return QRCode.toDataURL(link, {
    width,
    margin: 2,
    color: { dark: QR_COLOR.dark, light: QR_COLOR.light },
    errorCorrectionLevel: 'M',
  })
}

/**
 * Genera un PNG grande tipo póster: marco, título, QR y el enlace
 * escrito abajo. Listo para guardar, compartir o imprimir.
 */
export async function buildQrPoster(link: string, title: string): Promise<string> {
  const qrSrc = await buildQrImage(link, 1200)
  const img = new Image()
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('No se pudo generar el QR'))
    img.src = qrSrc
  })

  const W = 1380
  const H = 1560
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas no disponible')

  // Fondo pergamino claro + marco doble
  ctx.fillStyle = QR_COLOR.light
  ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = QR_COLOR.dark
  ctx.lineWidth = 6
  ctx.strokeRect(28, 28, W - 56, H - 56)
  ctx.lineWidth = 2
  ctx.strokeRect(46, 46, W - 92, H - 92)

  // Título arriba
  ctx.fillStyle = QR_COLOR.dark
  ctx.textAlign = 'center'
  ctx.font = 'bold 76px Georgia, "Times New Roman", serif'
  ctx.fillText(title, W / 2, 138)

  // QR centrado
  ctx.drawImage(img, 90, 200, 1200, 1200)

  // Enlace permanente abajo (se encoge si es muy largo)
  ctx.fillStyle = '#5a4626'
  ctx.font = `${link.length > 46 ? 26 : 34}px "Courier New", monospace`
  ctx.fillText(link, W / 2, H - 62)

  return canvas.toDataURL('image/png')
}

/** Descarga un data URL como archivo con nombre fijo */
export function saveDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

/** Nombres de archivo fijos para los QR guardados */
export const QR_FILENAMES = {
  control: 'QR-control-remoto-stratega.png',
  lista: 'QR-lista-del-jefe-stratega.png',
} as const
