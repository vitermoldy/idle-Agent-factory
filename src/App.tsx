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
