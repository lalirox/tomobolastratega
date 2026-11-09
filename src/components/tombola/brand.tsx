'use client'

// Identidad visual: logo Stratega + marca de hierro "Y" estilo Yellowstone

export function StrategaLogo({ className = '' }: { className?: string }) {
  return (
    <img
      src="/stratega-logo.png"
      alt="Logotipo de Stratega"
      className={`drop-shadow-[0_4px_10px_rgba(0,0,0,.7)] ${className}`}
    />
  )
}

/** Marca de ganado "Y", como la de la serie Yellowstone */
export function BrandY({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label="Marca de hierro con la letra Y del rancho"
    >
      <circle
        cx="50"
        cy="50"
        r="43"
        fill="none"
        stroke="#b32418"
        strokeWidth="8"
      />
      <path
        d="M31 29 L50 55 L50 74 M69 29 L50 55"
        fill="none"
        stroke="#b32418"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Tachuelas de las esquinas, estilo cartel */
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

/** Silueta de montañas, guiño al paisaje de Montana */
export function MountainRidge({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1200 90"
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M0 90 L0 62 L90 34 L150 56 L240 18 L330 58 L420 30 L520 66 L610 26 L700 54 L790 22 L880 60 L980 32 L1080 58 L1200 40 L1200 90 Z"
        fill="#000000"
        opacity="0.55"
      />
      <path
        d="M0 90 L0 78 L120 58 L260 76 L380 52 L540 80 L660 58 L820 82 L960 60 L1120 80 L1200 68 L1200 90 Z"
        fill="#000000"
        opacity="0.8"
      />
    </svg>
  )
}
