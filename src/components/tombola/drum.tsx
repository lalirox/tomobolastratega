'use client'

import type { Phase } from '@/lib/tombola'

interface DrumProps {
  phase: Phase
  countdown: number
  flicker: number | null
  lastNumber?: number | null
}

// Bolas decorativas dentro del tambor (posiciones fijas, en porcentaje)
const BALLS: Array<{ t: number; l: number; n: number }> = [
  { t: 10, l: 16, n: 23 },
  { t: 7, l: 46, n: 45 },
  { t: 13, l: 72, n: 12 },
  { t: 30, l: 9, n: 88 },
  { t: 27, l: 37, n: 61 },
  { t: 26, l: 64, n: 5 },
  { t: 49, l: 18, n: 97 },
  { t: 47, l: 50, n: 34 },
  { t: 45, l: 78, n: 71 },
  { t: 68, l: 13, n: 16 },
  { t: 65, l: 41, n: 52 },
  { t: 63, l: 69, n: 9 },
  { t: 82, l: 28, n: 78 },
  { t: 80, l: 57, n: 31 },
]

export function Drum({ phase, countdown, flicker, lastNumber = null }: DrumProps) {
  const spinning = phase === 'spinning'
  const counting = phase === 'countdown'
  const revealed = phase === 'revealed' && lastNumber !== null

  return (
    <div className="relative mx-auto w-[min(88vw,380px)] select-none sm:w-[min(62vw,460px)] lg:w-[min(38vw,54dvh,560px)]">
      {/* Manivela decorativa */}
      <div className="absolute -right-6 top-1/2 z-40 -translate-y-1/2 sm:-right-8">
        <div
          className={`h-2.5 w-10 rounded-full bg-gradient-to-b from-[#d9b45a] to-[#8a6420] shadow-md ${
            spinning ? 'origin-left animate-crank' : ''
          }`}
        >
          <div className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-gradient-to-br from-[#e8c877] to-[#9c7428] shadow" />
        </div>
      </div>

      {/* Tambor (al revelarse crece y brilla en dorado) */}
      <div
        className={`relative aspect-square overflow-hidden rounded-full border-[12px] transition-all duration-500 sm:border-[14px] ${
          revealed
            ? 'scale-[1.04] border-[#c9a227] shadow-[0_0_90px_rgba(201,162,39,.45),0_18px_40px_rgba(0,0,0,.6),inset_0_0_30px_rgba(0,0,0,.8)]'
            : 'border-[#453319] shadow-[0_18px_40px_rgba(0,0,0,.6),inset_0_0_30px_rgba(0,0,0,.8)]'
        }`}
        style={{
          background:
            'radial-gradient(circle at 32% 28%, #43301c 0%, #20150a 58%, #120b04 100%)',
        }}
        role="img"
        aria-label="Tambor de la tómbola girando con bolas de números"
      >
        {/* Bolas que giran */}
        <div
          className={`absolute inset-0 ${spinning ? 'animate-spin-fast' : counting ? 'animate-spin-slow' : ''}`}
        >
          {BALLS.map((b) => (
            <div
              key={b.n}
              className="absolute flex items-center justify-center rounded-full border-2 font-elite font-bold text-[#3b2314] shadow-[inset_-2px_-3px_6px_rgba(0,0,0,.25),0_3px_6px_rgba(0,0,0,.5)]"
              style={{
                top: `${b.t}%`,
                left: `${b.l}%`,
                width: '13%',
                height: '13%',
                background: 'radial-gradient(circle at 35% 30%, #fffef8, #ddd2b4 75%)',
                borderColor: '#9a8a62',
                fontSize: 'clamp(9px, 2.2vw, 15px)',
              }}
            >
              {b.n}
            </div>
          ))}
        </div>

        {/* Rejilla metálica */}
        <div className="drum-mesh absolute inset-0 rounded-full" />

        {/* Brillo del cristal */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 via-transparent to-black/45" />
        <div className="absolute left-[14%] top-[10%] h-[22%] w-[30%] rounded-full bg-white/15 blur-md" />

        {/* Eje central */}
        <div className="absolute left-1/2 top-1/2 z-30 h-[9%] w-[9%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#3d2c12] bg-gradient-to-br from-[#d8c48c] to-[#6e5a2e] shadow" />

        {/* Cuenta atrás sobre el tambor */}
        {counting && (
          <div className="absolute inset-0 z-40 flex items-center justify-center">
            <div className="flex h-[46%] w-[46%] items-center justify-center rounded-full border-4 border-[#c9a227] bg-black/65 shadow-[0_0_40px_rgba(201,162,39,.35)]">
              <span
                key={countdown}
                className="animate-pop font-rye text-[clamp(56px,13vw,120px)] leading-none text-[#f3d27a] drop-shadow-[0_4px_0_rgba(0,0,0,.7)]"
              >
                {countdown}
              </span>
            </div>
          </div>
        )}

        {/* Medallón gigante con el número ganador */}
        {revealed && (
          <div className="absolute inset-0 z-40 flex items-center justify-center">
            <div className="flex h-[68%] w-[68%] animate-pop flex-col items-center justify-center rounded-full border-4 border-[#c9a227] bg-black/75 shadow-[0_0_70px_rgba(201,162,39,.5),inset_0_0_28px_rgba(201,162,39,.25)]">
              <span className="font-elite text-[9px] uppercase tracking-[0.35em] text-[#d8b45a] sm:text-xs">
                Número cantado
              </span>
              <span
                key={lastNumber}
                className="animate-pop font-rye text-[clamp(56px,9.5vw,128px)] leading-[0.95] text-[#f3d27a] drop-shadow-[0_5px_0_rgba(0,0,0,.65)]"
              >
                {lastNumber}
              </span>
            </div>
          </div>
        )}

        {/* Etiqueta GIRANDO */}
        {spinning && (
          <div className="absolute inset-0 z-40 flex items-center justify-center">
            <div className="rounded-lg border-2 border-[#c9a227] bg-black/70 px-5 py-2">
              <span className="animate-pulse-fast font-rye text-xl tracking-widest text-[#f3d27a] sm:text-3xl">
                ¡GIRANDO!
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Patas de madera */}
      <div className="relative mx-auto -mt-2 flex w-[70%] items-start justify-between">
        <div className="h-10 w-6 skew-x-[14deg] rounded-b bg-gradient-to-b from-[#5c3a21] to-[#33200f] shadow-lg" />
        <div className="h-8 flex-1 rounded-b-lg border-x-4 border-[#3b2314] bg-gradient-to-b from-[#6b4423] to-[#3b2314] shadow-[0_10px_20px_rgba(0,0,0,.5)]" />
        <div className="h-10 w-6 -skew-x-[14deg] rounded-b bg-gradient-to-b from-[#5c3a21] to-[#33200f] shadow-lg" />
      </div>

      {/* Número parpadeante durante el giro */}
      {spinning && flicker !== null && (
        <div className="pointer-events-none absolute left-1/2 top-[8%] z-50 -translate-x-1/2">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#9c8a66] bg-[#f3e6c3] font-elite text-2xl font-bold text-[#3b2314] shadow-xl sm:h-24 sm:w-24 sm:text-3xl">
            {flicker}
          </div>
        </div>
      )}
    </div>
  )
}
