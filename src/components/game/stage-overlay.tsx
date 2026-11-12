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
