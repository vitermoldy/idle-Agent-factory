import { useGame } from '@/game/store'
import * as E from '@/game/engine'
import { FACTORY_BY_ID, type FactoryDef, type ProductDef } from '@/game/factories'
import { money, short } from '@/lib/format'
import { cn } from '@/lib/utils'
import { PriceButton } from './price-button'

const MAX_WORK = 3.4

/** Every product the line can make. Each one bought stands as its own plate beside the others. */
export function ProductPanel({ onShow, onBought }: { onShow: (id: string) => void; onBought: () => void }) {
  const game = useGame((s) => s.game)
  const def = FACTORY_BY_ID[game.active]
  const fs = game.factories[game.active]
  return (
    <section aria-labelledby="products-title" className="flex flex-col gap-4">
      <div>
        <h2 id="products-title" className="panel-title">
          Produk {def.name}
        </h2>
