import { useGame } from '@/game/store'
import * as E from '@/game/engine'
import { money, series } from '@/lib/format'
import { PriceButton } from './price-button'

export function SeriesPanel({ onStart }: { onStart: () => void }) {
