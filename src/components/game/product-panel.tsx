import { useGame } from '@/game/store'
import * as E from '@/game/engine'
import { FACTORY_BY_ID, type FactoryDef, type ProductDef } from '@/game/factories'
import { money, short } from '@/lib/format'
import { cn } from '@/lib/utils'
import { PriceButton } from './price-button'

