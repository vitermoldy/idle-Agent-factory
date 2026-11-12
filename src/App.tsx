import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import AgenticFactory3D from '@/components/ui/agentic-factory-3d'
import { TopBar } from '@/components/game/top-bar'
import { FactoryList } from '@/components/game/factory-list'
import { UpgradePanel } from '@/components/game/upgrade-panel'
import { ProductPanel } from '@/components/game/product-panel'
import { SeriesPanel } from '@/components/game/series-panel'
import { StageAction, StagePlate, UnlockCard } from '@/components/game/stage-overlay'
import { ViewBar } from '@/components/game/view-bar'
import { AwayDialog, ConfirmDialog, SettingsDialog } from '@/components/game/dialogs'
import { Notices } from '@/components/game/notices'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useGame } from '@/game/store'
import * as E from '@/game/engine'
import { FACTORY_BY_ID, PIPELINE, type FactoryId, type SlotId } from '@/game/factories'
import type { MachineCamera, MachineMode, SceneApi, SceneLive } from '@/scene/machine-scene'
import { money, series, short } from '@/lib/format'
import { cn } from '@/lib/utils'

type Tab = 'upgrade' | 'produk' | 'pabrik' | 'series'
const TAB_LABEL: Record<Tab, string> = { upgrade: 'Upgrade', produk: 'Produk', pabrik: 'Pabrik', series: 'Series' }

interface Popup {
  id: number
  x: number
  y: number
  text: string
}

/** How fast the machine animates for a line making `T` orders a second. */
function lineSpeed(T: number, running: boolean) {
  if (!running) return 0
  const v = T * 4
  return v <= 2.4 ? Math.max(0.35, v) : Math.min(3.2, 2.4 + Math.log10(v / 2.4) * 0.8)
}

function syncLive(live: SceneLive, g: E.GameState) {
  const def = FACTORY_BY_ID[g.active]
  const fs = g.factories[g.active]
  const rates = E.lineRates(def, fs)
  live.locked = !fs.unlocked
  live.focus = Math.max(0, def.products.findIndex((p) => p.id === fs.product))
  // One plate per product; with an agent every owned plate runs, by hand only the one in view.
  live.plates = def.products.map((p) => {
    const slot = fs.owned.indexOf(p.id)
    const running = fs.unlocked && slot >= 0 && (fs.agent || (fs.queue > 0 && fs.product === p.id))
    return {
      owned: slot >= 0,
      slot: Math.max(0, slot),
      speed: lineSpeed(E.throughput(def, fs, p), running),
      value: money(E.orderValue(def, fs, g.stars, p)),
      product: p.name,
      neck: fs.unlocked ? E.bottlenecks(def, fs, p).map((i) => def.stations[i].slot) : [],
    }
  })
  def.stations.forEach((st, i) => {
    live.meta[st.slot] = fs.unlocked
      ? { level: `Lv ${fs.levels[i]}`, rate: `${short(rates[i])} order/dtk` }
      : { level: '', rate: '' }
  })
}

