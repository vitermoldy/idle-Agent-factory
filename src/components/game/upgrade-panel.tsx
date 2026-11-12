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
  const rates = E.lineRates(def, fs)
  const T = Math.min(...rates)
  const necks = E.bottlenecks(def, fs)
  const owned = E.ownedProducts(def, fs)
  // Which plates each station holds back; with several products the answer differs per plate.
  const heldBack = def.stations.map((_, i) =>
    owned.filter((p) => E.bottlenecks(def, fs, p).includes(i)).map((p) => p.name)
  )
  return (
    <div className="flex flex-col gap-5">
      {!fs.agent && <AgentCard def={def} />}
      <section aria-labelledby="stations-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="stations-title" className="panel-title">
            Upgrade stasiun
          </h2>
          <BuyModeSwitch />
        </div>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
          Setiap petak berjalan secepat stasiun paling lambatnya. Naikkan bottleneck dulu; stasiun lain baru
          terasa setelah ia menyusul.
          {owned.length > 1 &&
            ` Level berlaku untuk ${owned.length} petak; kecepatan di bawah untuk petak ${E.activeProduct(def, fs).name.toLowerCase()}.`}
        </p>
        <ol className="mt-4 flex flex-col gap-2">
          {def.stations.map((st, i) => (
            <StationRow
              key={st.slot}
              def={def}
              index={i}
              rate={rates[i]}
              throughput={T}
              neck={necks.includes(i)}
              heldBack={owned.length > 1 ? heldBack[i] : []}
              selected={selected === st.slot}
            />
          ))}
        </ol>
      </section>
    </div>
  )
}

function BuyModeSwitch() {
  const buyMode = useGame((s) => s.buyMode)
  const setBuyMode = useGame((s) => s.setBuyMode)
  return (
    <div role="group" aria-label="Level per pembelian" className="flex rounded-lg border border-line bg-ground p-0.5">
      {MODES.map(({ mode, label }) => (
        <button
          key={label}
          type="button"
          aria-pressed={buyMode === mode}
          onClick={() => setBuyMode(mode)}
          className={cn(
            'min-h-11 min-w-11 rounded-md px-2.5 text-[13px] font-medium transition-colors',
            buyMode === mode ? 'bg-raised text-ink shadow-[inset_0_0_0_1px_var(--color-line-strong)]' : 'text-muted hover:text-ink'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function AgentCard({ def }: { def: FactoryDef }) {
  const cash = useGame((s) => s.game.cash)
  const hireAgent = useGame((s) => s.hireAgent)
  const can = cash >= def.agentCost
  return (
    <section aria-labelledby="agent-title" className="rounded-xl border border-line-strong bg-raised p-4">
      <h2 id="agent-title" className="panel-title">
        Rekrut agen untuk {def.name}
      </h2>
      <p className="mt-1.5 text-[13px] leading-relaxed text-soft">
        Tanpa agen, lini hanya bekerja saat kamu mengambil order. Agen menjalankannya terus, juga saat game
        ditutup (dihitung sampai {duration(E.OFFLINE_CAP)}).
      </p>
      <PriceButton
        label="Rekrut agen"
        price={money(def.agentCost)}
        className="mt-3 w-full"
        disabled={!can}
        onClick={hireAgent}
      />
      {!can && (
        <p className="mt-2 text-[12px] text-muted tabular-nums">Kurang {money(def.agentCost - cash)}</p>
      )}
    </section>
  )
}

function StationRow({
  def,
  index,
  rate,
  throughput,
  neck,
  heldBack,
  selected,
}: {
  def: FactoryDef
  index: number
  rate: number
  throughput: number
  neck: boolean
  /** Plates this station holds back, listed only when the line has more than one. */
  heldBack: string[]
  selected: boolean
}) {
  const cash = useGame((s) => s.game.cash)
  const stars = useGame((s) => s.game.stars)
  const fs = useGame((s) => s.game.factories[def.id])
  const buyMode = useGame((s) => s.buyMode)
  const buyStation = useGame((s) => s.buyStation)
  const ref = useRef<HTMLLIElement>(null)
  useEffect(() => {
    if (selected) ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selected])
  const st = def.stations[index]
  const level = fs.levels[index]
  const n = E.levelsToBuy(def, index, level, cash, buyMode)
  const cost = n > 0 ? E.upgradeCost(def, index, level, n) : Infinity
  const can = n > 0 && cost <= cash
  const levels = fs.levels.slice()
  levels[index] = level + n
  // With an agent every plate earns, so the gain counts them all; by hand only the plate in view works.
  const before = fs.agent ? E.lineIncome(def, fs, stars) : E.productIncome(def, fs, stars)
  const after = fs.agent ? E.lineIncome(def, fs, stars, levels) : E.productIncome(def, { ...fs, levels }, stars)
  const gain = before > 0 ? after / before - 1 : 0
  const holds = neck || heldBack.length > 0
  const next = E.nextMilestone(level)
  const prev = [...E.MILESTONES].reverse().find((m) => m <= level) ?? 0
  const progress = next ? (level - prev) / (next - prev) : 1
  return (
    <li
      ref={ref}
      className={cn(
        'rounded-xl border bg-panel p-3.5 transition-colors',
        selected ? 'border-accent' : holds ? 'border-line-strong' : 'border-line'
      )}
    >
      <div className="flex items-start gap-3">
        <span className={cn('mt-0.5 font-mono text-[10px]', holds ? 'text-accent' : 'text-muted')}>
          {pad2(index + 1)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h3 className="text-[15px] font-semibold text-ink">{st.name}</h3>
            <span className="text-[12px] text-muted tabular-nums">Lv {level}</span>
            {holds && (
              <span className="rounded-[5px] border border-accent px-1.5 py-px text-[11px] font-medium text-accent">
                Bottleneck
              </span>
            )}
          </div>
          <p className="mt-1 text-[12px] leading-snug text-muted">{st.desc}</p>
          {heldBack.length > 0 && (
            <p className="mt-1 text-[12px] text-accent">Menahan petak {heldBack.join(' dan ').toLowerCase()}</p>
          )}
          <p className="mt-2 flex flex-wrap justify-between gap-x-3 text-[13px] tabular-nums">
            <span className="text-soft">{short(rate)} order/dtk</span>
            <span className="text-muted">
              {neck ? 'Menahan lini' : `Cadangan +${Math.min(999, Math.round((rate / throughput - 1) * 100))}%`}
            </span>
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="h-1 flex-1 overflow-hidden rounded bg-line" aria-hidden="true">
              <span className="block h-full bg-accent-deep" style={{ width: `${progress * 100}%` }} />
            </span>
            <span className="text-[11px] whitespace-nowrap text-muted tabular-nums">
              {next ? `Lv ${next}: ×2 cepat` : 'Bonus level penuh'}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <span className="min-w-0 flex-1 text-[12px] text-muted tabular-nums">
          {gain > 0.0005 ? (
            <span className="font-medium text-accent">
              Pendapatan +{gain < 0.1 ? (gain * 100).toFixed(1) : Math.round(gain * 100)}%
            </span>
          ) : holds ? (
            'Bottleneck lain ikut menahan'
          ) : (
            'Belum menambah pendapatan'
          )}
        </span>
        <button
          type="button"
          className="btn btn-primary min-w-[132px] flex-col gap-0 py-1 leading-tight"
          disabled={!can}
          onClick={() => buyStation(index)}
          aria-label={`Naikkan ${st.name} ${n} level seharga ${money(cost)}`}
        >
          <span className="text-[13px]">+{n} level</span>
          <span className="text-[12px] font-medium tabular-nums opacity-80">{money(cost)}</span>
        </button>
      </div>
    </li>
  )
}

function LockedLine({ def }: { def: FactoryDef }) {
  return (
    <section aria-labelledby="locked-title" className="flex flex-col gap-4">
      <div>
        <h2 id="locked-title" className="panel-title">
          Stasiun di {def.name}
