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
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
          Setiap produk punya petak mesin sendiri di samping petak lain, dan semua petak berproduksi
          bersamaan. Level stasiun berlaku untuk semua petak; produk mahal membebani stasiun tertentu.
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        {def.products.map((p) => (
          <ProductRow key={p.id} def={def} product={p} inView={p.id === fs.product} onShow={onShow} onBought={onBought} />
