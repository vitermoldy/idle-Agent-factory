import { useEffect, useRef } from 'react'
import { useGame } from '@/game/store'
import * as E from '@/game/engine'
import { FACTORY_BY_ID, type FactoryDef, type SlotId } from '@/game/factories'
import { duration, money, pad2, short } from '@/lib/format'
import { cn } from '@/lib/utils'
import { PriceButton } from './price-button'

const MODES: Array<{ mode: E.BuyMode; label: string }> = [
  { mode: 1, label: '×1' },
