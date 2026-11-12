import { useGame } from '@/game/store'
import * as E from '@/game/engine'
import { FACTORY_BY_ID } from '@/game/factories'
import { money, pace } from '@/lib/format'
import { cn } from '@/lib/utils'
import { PriceButton } from './price-button'

/** Line name and what it is doing, over the top left of the machine. */
export function StagePlate({ className }: { className?: string }) {
