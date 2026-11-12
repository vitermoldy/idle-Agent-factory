import type { CSSProperties } from 'react'
import { useGame } from '@/game/store'
import { incomePerSec } from '@/game/engine'
import { FACTORIES, type FactoryId } from '@/game/factories'
import { money } from '@/lib/format'
import { cn } from '@/lib/utils'
import { FactoryGlyph, Lock } from './icons'

/** The five lines. Each keeps its own colour here, so a line is recognisable before it is opened. */
export function FactoryList({ onPick }: { onPick?: (id: FactoryId) => void }) {
  const game = useGame((s) => s.game)
