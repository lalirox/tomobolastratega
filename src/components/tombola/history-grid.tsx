'use client'

import { Star, Trophy } from 'lucide-react'
import type { GameState } from '@/lib/tombola'

interface HistoryGridProps {
  drawn: GameState['drawn']
  lastNumber: GameState['lastNumber']
  className?: string
}

export function HistoryGrid({ drawn, lastNumber, className = '' }: HistoryGridProps) {
  const drawnSet = new Set(drawn)

  return (
    <section
      className={`parchment relative flex flex-col rounded-md border-2 border-[#6b4423] p-3 shadow-[0_10px_24px_rgba(0,0,0,.45)] ${className}`}
      aria-label="Historial de números cantados"
    >
      <span className="stud left-1.5 top-1.5" aria-hidden="true" />
      <span className="stud right-1.5 top-1.5" aria-hidden="true" />
      <span className="stud bottom-1.5 left-1.5" aria-hidden="true" />
      <span className="stud bottom-1.5 right-1.5" aria-hidden="true" />

      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h2 className="flex items-center gap-2 font-rye text-base text-[#3b2314] sm:text-lg">
          <Trophy className="h-5 w-5 text-[#8a6420]" aria-hidden="true" />
          Historial · 100 números
        </h2>
        <p className="flex items-center gap-3 font-elite text-[10px] text-[#5a3a1c]">
          <span className="flex items-center gap-1">
            <span
              className="inline-block h-3 w-3 rounded-sm border border-[#7a5c14] bg-[#c9a227]"
              aria-hidden="true"
            />
            ya cantado
          </span>
          <span className="flex items-center gap-1">
            <span
              className="inline-block h-3 w-3 rounded-sm border border-[#c9b487] bg-[#e7d7ab]/70"
              aria-hidden="true"
            />
            en juego
          </span>
        </p>
      </div>

      {/* Panel con scroll propio: en escritorio llena la altura del panel lateral */}
      <div className="custom-scroll @container min-h-0 max-h-[320px] flex-1 overflow-y-auto rounded-sm border border-[#bfae86] bg-[#f0e8d2]/60 p-2 lg:max-h-none">
        <div className="grid grid-cols-6 gap-1.5 @[480px]:grid-cols-10">
          {Array.from({ length: 100 }, (_, i) => i + 1).map((n) => {
            const out = drawnSet.has(n)
            const isLast = n === lastNumber
            return (
              <div
                key={n}
                className={`relative flex aspect-square items-center justify-center rounded-sm border font-elite text-xs font-bold transition-all duration-300 sm:text-sm ${
                  out
                    ? 'border-[#7a5c14] bg-gradient-to-b from-[#e0bd6a] to-[#c9a227] text-[#2b1a0c] shadow-[inset_0_-2px_4px_rgba(0,0,0,.2)]'
                    : 'border-[#bfae86] bg-[#ddd2b4]/70 text-[#8a6a3f]'
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
