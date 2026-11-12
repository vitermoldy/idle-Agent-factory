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
