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

function makeLive(): SceneLive {
  const live: SceneLive = {
    locked: false,
    playing: !matchMedia('(prefers-reduced-motion: reduce)').matches,
    labels: matchMedia('(min-width: 1024px)').matches,
    focus: 0,
    meta: Object.fromEntries(PIPELINE.map((s) => [s, { level: '', rate: '' }])) as SceneLive['meta'],
    plates: [],
  }
  syncLive(live, useGame.getState().game)
  return live
}

let popupId = 0

export default function App() {
  const active = useGame((s) => s.game.active)
  const setActive = useGame((s) => s.setActive)
  const def = FACTORY_BY_ID[active]
  const wide = useMediaQuery('(min-width: 1280px)')
  const live = useRef<SceneLive>(null as unknown as SceneLive)
  if (!live.current) live.current = makeLive()
  // The machine of a new line is built from `live` before any effect of this component runs.
  const synced = useRef(active)
  if (synced.current !== active) {
    synced.current = active
    syncLive(live.current, useGame.getState().game)
  }
  const apiRef = useRef<SceneApi | null>(null)
  const [tab, setTab] = useState<Tab>('upgrade')
  const [mode, setMode] = useState<MachineMode>('assembled')
  const [camera, setCamera] = useState<MachineCamera>('overview')
  const [labels, setLabels] = useState(live.current.labels)
  const [playing, setPlaying] = useState(live.current.playing)
  const [selected, setSelected] = useState<SlotId | null>(null)
  const [settings, setSettings] = useState(false)
  const [confirm, setConfirm] = useState<'series' | 'reset' | null>(null)
  const [popups, setPopups] = useState<Popup[]>([])
  const pending = useRef(0)

  const tabs: Tab[] = wide ? ['upgrade', 'produk', 'series'] : ['upgrade', 'produk', 'pabrik', 'series']
  const shownTab: Tab = tabs.includes(tab) ? tab : 'upgrade'

  // The clock: the game advances ten times a second; the scene reads `live` every frame.
  useEffect(() => {
    let titleAt = 0
    const tick = setInterval(() => {
      const store = useGame.getState()
      const completed = store.tick(Date.now())
      const g = useGame.getState().game
      syncLive(live.current, g)
      const done = completed[g.active]
      if (done) pending.current += done.cash
      if (Date.now() - titleAt > 1000) {
        titleAt = Date.now()
        document.title = `Agentic Factory (${money(g.cash)})`
      }
    }, 100)
    const flush = setInterval(() => {
      if (pending.current <= 0) return
      const p = apiRef.current?.project('cashdesk')
      const cash = pending.current
      pending.current = 0
      if (!p) return
      const id = ++popupId
      setPopups((list) => [...list.slice(-5), { id, x: p.x + (Math.random() - 0.5) * 40, y: p.y, text: '+' + money(cash) }])
      setTimeout(() => setPopups((list) => list.filter((q) => q.id !== id)), 1450)
    }, 700)
    const save = setInterval(() => useGame.getState().save(), 5000)
    const onHide = () => document.visibilityState === 'hidden' && useGame.getState().save()
    const onLeave = () => useGame.getState().save()
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', onLeave)
    return () => {
      clearInterval(tick)
      clearInterval(flush)
      clearInterval(save)
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', onLeave)
    }
  }, [])

  useEffect(() => {
    live.current.labels = labels
    live.current.playing = playing
  }, [labels, playing])

  // A new line is a new machine: views start over.
  useEffect(() => {
    syncLive(live.current, useGame.getState().game)
    setMode('assembled')
    setCamera('overview')
    setSelected(null)
    setPopups([])
    pending.current = 0
  }, [active])

  const openFactory = useCallback(
    (id: FactoryId) => {
      setActive(id)
      setTab('upgrade')
      if (!wide) window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [setActive, wide]
  )
  const onStation = useCallback(
    (slot: SlotId, plate: number) => {
      const product = def.products[plate]
      if (product) useGame.getState().selectProduct(product.id)
      syncLive(live.current, useGame.getState().game)
      setSelected(slot)
      setTab('upgrade')
    },
    [def]
  )
  const onView = useCallback((m: MachineMode, c: MachineCamera) => {
    setMode(m)
    setCamera(c)
  }, [])
  const onApi = useCallback((api: SceneApi | null) => {
    apiRef.current = api
  }, [])
  const tooltip = useCallback(
    (slot: SlotId, plate: number) => {
      const g = useGame.getState().game
      const fs = g.factories[def.id]
      const i = def.stations.findIndex((s) => s.slot === slot)
      const st = def.stations[i]
      const product = def.products[plate] ?? def.products[0]
      const level = fs.unlocked
        ? ` Level ${fs.levels[i]}, ${short(E.lineRates(def, fs, product)[i])} ${product.name.toLowerCase()} per detik.`
        : ''
      return { title: st.name, body: st.desc + level }
    },
    [def]
  )

  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    const i = tabs.indexOf(shownTab)
    const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]
    setTab(next)
    document.getElementById(`tab-${next}`)?.focus()
  }

  const accent = {
    '--accent': def.theme.accent,
    '--accent-deep': def.theme.accentDeep,
  } as CSSProperties
  const game = useGame((s) => s.game)

  return (
    <div className="min-h-svh bg-ground text-ink lg:flex lg:h-svh lg:flex-col" style={accent}>
      <a href="#panel" className="skip-link">
        Lewati ke panel upgrade
      </a>
      <TopBar onSettings={() => setSettings(true)} />
      <div className="lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[248px_minmax(0,1fr)_388px]">
        {wide && (
          <nav aria-label="Lini produksi" className="min-h-0 overflow-y-auto border-r border-line p-4">
            <p className="mono-label mb-3 px-1">Lini produksi</p>
            <FactoryList onPick={openFactory} />
          </nav>
        )}
        <main className="relative flex flex-col lg:min-h-0">
          {/* On a phone the line's plate sits above the machine, so no text covers it. */}
          <StagePlate className="px-4 pt-4 pb-1 lg:hidden" />
          <AgenticFactory3D
            key={active}
            factory={def}
            live={live.current}
            tooltip={tooltip}
            onStation={onStation}
            onView={onView}
            onApi={onApi}
            className="h-[40svh] min-h-[280px] lg:h-auto lg:min-h-0 lg:flex-1"
          >
            <StagePlate className="pointer-events-none absolute top-5 left-6 hidden max-w-[calc(100%-48px)] lg:block" />
            <UnlockCard />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden justify-center px-4 pb-[84px] lg:flex">
              <StageAction />
            </div>
            {popups.map((p) => (
              <span key={p.id} className="popup" style={{ left: p.x, top: p.y }} aria-hidden="true">
                {p.text}
              </span>
            ))}
          </AgenticFactory3D>
          {/* On a phone the machine keeps its whole box; the order controls sit under it. */}
          <div className="flex justify-center px-4 pt-3 empty:hidden lg:hidden">
            <StageAction />
          </div>
          <div className="flex justify-center border-b border-line px-3 py-3 lg:pointer-events-none lg:absolute lg:inset-x-0 lg:bottom-4 lg:border-0 lg:px-4 lg:py-0 lg:[&>*]:pointer-events-auto">
            <ViewBar
              mode={mode}
              camera={camera}
              labels={labels}
              playing={playing}
              onMode={(m) => apiRef.current?.setMode(m)}
              onCamera={(c) => (c === 'station' ? apiRef.current?.focusStation(selected ?? 'engine') : apiRef.current?.setCamera(c))}
              onLabels={setLabels}
              onPlaying={setPlaying}
            />
          </div>
        </main>
        <aside
          id="panel"
          tabIndex={-1}
          aria-label="Panel lini"
          className="bg-ground lg:flex lg:min-h-0 lg:flex-col lg:border-l lg:border-line"
        >
          <div
            role="tablist"
            aria-label="Bagian panel"
            onKeyDown={onTabKey}
            className="sticky top-16 z-20 flex gap-5 border-b border-line bg-ground px-4 lg:static"
          >
            {tabs.map((t) => (
              <button
                key={t}
                id={`tab-${t}`}
                type="button"
                role="tab"
                aria-selected={shownTab === t}
                aria-controls="tab-panel"
                tabIndex={shownTab === t ? 0 : -1}
                onClick={() => setTab(t)}
                className={cn('tab', t === 'produk' && 'whitespace-nowrap')}
              >
                {TAB_LABEL[t]}
                {t === 'series' && E.starsClaimable(game) > 0 && (
                  <span className="ml-1.5 text-[12px] text-accent tabular-nums">+{E.starsClaimable(game)}</span>
                )}
              </button>
            ))}
          </div>
          <div
            id="tab-panel"
            role="tabpanel"
            aria-labelledby={`tab-${shownTab}`}
            className="p-4 pb-24 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pb-6"
          >
            {shownTab === 'upgrade' && <UpgradePanel selected={selected} />}
            {shownTab === 'produk' && (
              <ProductPanel
                onShow={(id) => {
                  useGame.getState().selectProduct(id)
                  syncLive(live.current, useGame.getState().game)
                  apiRef.current?.setCamera('plate')
