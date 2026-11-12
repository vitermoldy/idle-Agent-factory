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
            Agentic Factory
          </h1>
          <p className="mono-label mt-1.5 hidden sm:block">Game idle</p>
        </div>
      </div>
      <div className="ml-2 flex min-w-0 flex-col leading-tight sm:ml-8 sm:flex-row sm:items-baseline sm:gap-3">
        <span className="sr-only">Kas</span>
        <strong className="font-display text-[22px] font-semibold tabular-nums sm:text-[26px]" aria-live="off">
          {money(cash)}
        </strong>
        <span className="text-[13px] text-muted tabular-nums">
          +{money(income)}
          <span className="sr-only"> per detik</span>
          <span aria-hidden="true">/dtk</span>
        </span>
      </div>
      <div className="ml-auto flex items-center gap-2 sm:gap-4">
        <span className="mono-label hidden md:inline">Series {seriesNo(series)}</span>
        {stars > 0 && (
          <span className="text-[13px] text-soft tabular-nums" title={`${stars} bintang: +${stars * 5}% nilai order`}>
            <span aria-hidden="true">★ </span>
            {stars}
            <span className="sr-only"> bintang</span>
          </span>
        )}
        <button type="button" className="icon-btn" aria-label="Pengaturan dan simpanan" onClick={onSettings}>
          <Gear />
        </button>
