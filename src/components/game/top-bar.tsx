import { useGame } from '@/game/store'
import { totalIncome } from '@/game/engine'
import { money, series as seriesNo } from '@/lib/format'
import { Gear, Mark } from './icons'

export function TopBar({ onSettings }: { onSettings: () => void }) {
  const cash = useGame((s) => s.game.cash)
  const income = useGame((s) => totalIncome(s.game))
  const series = useGame((s) => s.game.series)
  const stars = useGame((s) => s.game.stars)
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-ground px-4 lg:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-[9px] border border-[#55502f] bg-[#1c1b14] text-accent">
          <Mark />
        </span>
        <div>
          <h1 className="sr-only font-display text-[15px] leading-none font-semibold tracking-[-0.01em] sm:not-sr-only">
