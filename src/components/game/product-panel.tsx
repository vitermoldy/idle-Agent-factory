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
        ))}
      </ul>
    </section>
  )
}

function ProductRow({
  def,
  product,
  inView,
  onShow,
  onBought,
}: {
  def: FactoryDef
  product: ProductDef
  inView: boolean
  onShow: (id: string) => void
  onBought: () => void
}) {
  const game = useGame((s) => s.game)
  const buyProduct = useGame((s) => s.buyProduct)
  const fs = game.factories[def.id]
  const plate = fs.owned.indexOf(product.id)
  const owned = plate >= 0
  const speed = E.throughput(def, fs, product)
  const income = E.productIncome(def, fs, game.stars, product)
  const heaviest = product.work.indexOf(Math.max(...product.work))
  const can = game.cash >= product.unlockCost
  return (
    <li className={cn('rounded-xl border bg-panel p-3.5', owned && inView ? 'border-accent' : 'border-line')}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="text-[15px] font-semibold text-ink">{product.name}</h3>
        <span className="text-[13px] text-soft tabular-nums">
          {money(product.price * E.starMultiplier(game.stars))} per order
        </span>
