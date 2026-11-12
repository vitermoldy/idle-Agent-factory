import { useGame } from '@/game/store'
import * as E from '@/game/engine'
import { FACTORY_BY_ID } from '@/game/factories'
import { money, pace } from '@/lib/format'
import { cn } from '@/lib/utils'
import { PriceButton } from './price-button'

/** Line name and what it is doing, over the top left of the machine. */
export function StagePlate({ className }: { className?: string }) {
  const game = useGame((s) => s.game)
  const def = FACTORY_BY_ID[game.active]
  const fs = game.factories[game.active]
  const product = E.activeProduct(def, fs)
  const T = E.throughput(def, fs)
  const plates = fs.owned.length
  const status = !fs.unlocked
    ? 'Terkunci'
    : fs.agent
      ? plates > 1
        ? `Agen menjalankan ${plates} petak`
        : 'Agen bekerja'
      : fs.queue > 0
        ? `${fs.queue} order dalam antrean`
        : 'Menunggu order'
  return (
    <div className={className}>
      <p className="mono-label text-accent">Lini {def.no}</p>
      <h2 className="mt-1.5 font-display text-[20px] leading-tight font-semibold lg:text-[24px]">{def.name}</h2>
      <p className="mt-0.5 text-[13px] font-medium text-soft">{status}</p>
      {fs.unlocked && (
        <dl className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px] tabular-nums">
          {plates > 1 && <PlateStat label="Petak" value={`${fs.owned.indexOf(product.id) + 1} dari ${plates}`} />}
          <PlateStat label="Produk" value={product.name} />
          <PlateStat label="Per order" value={money(E.orderValue(def, fs, game.stars))} />
          <PlateStat label="Kecepatan" value={pace(T)} />
        </dl>
      )}
    </div>
  )
}

function PlateStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] text-muted">{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  )
}

/** The player's hands on the line: take orders by hand until an agent is hired. */
export function StageAction() {
  const game = useGame((s) => s.game)
  const takeOrder = useGame((s) => s.takeOrder)
  const def = FACTORY_BY_ID[game.active]
  const fs = game.factories[game.active]
  if (!fs.unlocked) return null
  const T = E.throughput(def, fs)
  const fast = T >= 3
  const progress = fs.progress[fs.product] ?? 0
  if (fs.agent)
    return (
      <div className="pointer-events-auto w-[min(360px,100%)] rounded-xl border border-line bg-panel/95 px-4 py-3">
        <div className="flex items-baseline justify-between gap-3 text-[13px] tabular-nums">
          <span className="font-medium text-ink">
            {fs.owned.length > 1 ? `${fs.owned.length} petak berproduksi` : 'Agen menjalankan lini'}
          </span>
          <span className="text-muted">{money(E.incomePerSec(def, fs, game.stars))}/dtk</span>
        </div>
        <Progress value={fast ? 1 : progress} steady={fast} />
      </div>
    )
  const first = fs.orders === 0 && fs.queue === 0 && game.allTime === 0
  const full = fs.queue >= E.QUEUE_MAX
  return (
    <div className="pointer-events-auto flex w-[min(360px,100%)] flex-col items-center gap-2.5">
      {first && (
        <p className="rounded-lg bg-panel/95 px-3 py-2 text-center text-[13px] leading-snug text-soft">
          Ambil order pertamamu. Setiap order melewati lima stasiun, lalu dibayar di kasir.
        </p>
      )}
      <button type="button" className="btn btn-primary btn-lg w-full" disabled={full} onClick={takeOrder}>
        {full ? 'Antrean penuh' : 'Ambil order'}
      </button>
      <div className="w-full rounded-lg bg-panel/90 px-3 py-2">
        <div className="flex items-center justify-between gap-3 text-[12px] text-muted tabular-nums">
          <span>
            Antrean {fs.queue}/{E.QUEUE_MAX}
          </span>
          <span>{pace(T)}</span>
        </div>
        <div className="mt-1.5 flex gap-1" aria-hidden="true">
          {Array.from({ length: E.QUEUE_MAX }, (_, i) => (
            <span key={i} className={cn('h-1.5 flex-1 rounded-sm', i < fs.queue ? 'bg-accent' : 'bg-line')} />
          ))}
