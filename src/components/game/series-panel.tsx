import { useGame } from '@/game/store'
import * as E from '@/game/engine'
import { money, series } from '@/lib/format'
import { PriceButton } from './price-button'

export function SeriesPanel({ onStart }: { onStart: () => void }) {
  const game = useGame((s) => s.game)
  const claim = E.starsClaimable(game)
  const nextAt = E.nextStarAt(game.allTime)
  const prevAt = E.starsEarnedTotal(game.allTime) ** 2 * E.STAR_UNIT
  const progress = (game.allTime - prevAt) / (nextAt - prevAt)
