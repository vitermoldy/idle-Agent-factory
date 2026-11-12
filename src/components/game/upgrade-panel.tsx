import { useEffect, useRef } from 'react'
import { useGame } from '@/game/store'
import * as E from '@/game/engine'
import { FACTORY_BY_ID, type FactoryDef, type SlotId } from '@/game/factories'
import { duration, money, pad2, short } from '@/lib/format'
import { cn } from '@/lib/utils'
import { PriceButton } from './price-button'

const MODES: Array<{ mode: E.BuyMode; label: string }> = [
  { mode: 1, label: '×1' },
  { mode: 10, label: '×10' },
  { mode: 'max', label: 'Maks' },
]

export function UpgradePanel({ selected }: { selected: SlotId | null }) {
  const game = useGame((s) => s.game)
  const def = FACTORY_BY_ID[game.active]
  const fs = game.factories[game.active]
  if (!fs.unlocked) return <LockedLine def={def} />
