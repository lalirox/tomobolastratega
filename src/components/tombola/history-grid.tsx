'use client'

import { Star, Trophy } from 'lucide-react'
import type { GameState } from '@/lib/tombola'

interface HistoryGridProps {
  drawn: GameState['drawn']
  lastNumber: GameState['lastNumber']
}

export function HistoryGrid({ drawn, lastNumber }: HistoryGridProps) {
  const drawnSet = new Set(drawn)

  return (
    <section
      className="parchment relative rounded-md border-2 border-[#6b4423] p-4 shadow-[0_10px_24px_rgba(0,0,0,.45)]"
      aria-label="Historial de números cantados"
    >
      <span className="stud left-1.5 top-1.5" aria-hidden="true" />
      <span className="stud right-1.5 top-1.5" aria-hidden="true" />
      <span className="stud bottom-1.5 left-1.5" aria-hidden="true" />
      <span className="stud bottom-1.5 right-1.5" aria-hidden="true" />

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-rye text-lg text-[#3b2314] sm:text-xl">
          <Trophy className="h-5 w-5 text-[#8a6420]" aria-hidden="true" />
          Historial · Tabla de los 100 números
        </h2>
        <p className="flex items-center gap-3 font-elite text-xs text-[#5a3a1c]">
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm border border-[#7a5c14] bg-[#c9a227]" aria-hidden="true" />
            ya cantado
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm border border-[#c9b487] bg-[#e7d7ab]/70" aria-hidden="true" />
            en juego
          </span>
        </p>
      </div>

      <div className="custom-scroll max-h-[300px] overflow-y-auto rounded-sm border border-[#c9b487] bg-[#f3e6c3]/60 p-2 lg:max-h-[340px]">
        <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-10">
          {Array.from({ length: 100 }, (_, i) => i + 1).map((n) => {
            const out = drawnSet.has(n)
            const isLast = n === lastNumber
            return (
              <div
                key={n}
                className={`relative flex aspect-square items-center justify-center rounded-sm border font-elite text-sm font-bold transition-all duration-300 sm:text-base ${
                  out
                    ? 'border-[#7a5c14] bg-gradient-to-b from-[#e0bd6a] to-[#c9a227] text-[#2b1a0c] shadow-[inset_0_-2px_4px_rgba(0,0,0,.2)]'
                    : 'border-[#c9b487] bg-[#e7d7ab]/70 text-[#8a6a3f]'
                } ${isLast ? 'pulse-ring' : ''}`}
              >
                {n}
                {out && (
                  <Star
                    className="absolute -right-1 -top-1 h-3 w-3 fill-[#8b1a1a] text-[#8b1a1a]"
                    aria-hidden="true"
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
