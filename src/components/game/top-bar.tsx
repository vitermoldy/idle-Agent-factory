import { useGame } from '@/game/store'
import { totalIncome } from '@/game/engine'
import { money, series as seriesNo } from '@/lib/format'
import { Gear, Mark } from './icons'

export function TopBar({ onSettings }: { onSettings: () => void }) {
  const cash = useGame((s) => s.game.cash)
