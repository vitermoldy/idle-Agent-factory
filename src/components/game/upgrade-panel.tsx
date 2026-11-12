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
