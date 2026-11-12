import { useGame } from '@/game/store'
import * as E from '@/game/engine'
import { money, series } from '@/lib/format'
import { PriceButton } from './price-button'

export function SeriesPanel({ onStart }: { onStart: () => void }) {
  const game = useGame((s) => s.game)
  const claim = E.starsClaimable(game)
  const nextAt = E.nextStarAt(game.allTime)
  const prevAt = E.starsEarnedTotal(game.allTime) ** 2 * E.STAR_UNIT
  const progress = (game.allTime - prevAt) / (nextAt - prevAt)
  const bonus = Math.round(game.stars * E.STAR_BONUS * 100)
  const after = Math.round((game.stars + claim) * E.STAR_BONUS * 100)
  return (
    <section aria-labelledby="series-title" className="flex flex-col gap-4">
      <div>
        <h2 id="series-title" className="panel-title">
          Series {series(game.series)}
        </h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
          Series baru mengosongkan semua lini dan kas, lalu menukar pendapatanmu dengan bintang. Setiap
          bintang menambah {Math.round(E.STAR_BONUS * 100)}% nilai setiap order, untuk seterusnya.
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-2">
        <Stat label="Bintang dimiliki" value={`${game.stars}`} note={`+${bonus}% nilai order`} />
        <Stat label="Bintang baru" value={`+${claim}`} note={claim > 0 ? `jadi +${after}%` : 'belum ada'} />
        <Stat label="Pendapatan series ini" value={money(game.earned)} />
        <Stat label="Total sepanjang masa" value={money(game.allTime)} />
      </dl>
      <div>
        <div className="flex justify-between text-[12px] text-muted tabular-nums">
          <span>Bintang berikutnya</span>
          <span>
            {money(game.allTime)} / {money(nextAt)}
          </span>
        </div>
        <span className="mt-1.5 block h-1 overflow-hidden rounded bg-line" aria-hidden="true">
          <span className="block h-full bg-accent" style={{ width: `${Math.min(100, progress * 100)}%` }} />
        </span>
      </div>
      {claim > 0 ? (
