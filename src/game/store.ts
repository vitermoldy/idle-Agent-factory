import { create } from 'zustand'
import * as E from './engine'
import { FACTORIES, FACTORY_BY_ID, type FactoryId } from './factories'

const SAVE_KEY = 'agentic-factory-idle'
/** A gap longer than this between ticks (sleep, a closed tab) is counted as time away. */
const AWAY_AFTER = 30

export interface Notice {
  id: number
  text: string
  /** Opens this line when the notice's button is used. */
  factory?: FactoryId
  action?: string
}

export interface AwayReport {
  seconds: number
  capped: boolean
  cash: number
  orders: number
}

interface Store {
  game: E.GameState
  buyMode: E.BuyMode
  away: AwayReport | null
  notices: Notice[]
  storageOk: boolean
  lastSaved: number | null
  tick: (now: number) => E.Completed
  save: () => void
  setActive: (id: FactoryId) => void
  takeOrder: () => void
  buyStation: (index: number) => void
  hireAgent: () => void
  unlockFactory: (id: FactoryId) => void
  buyProduct: (productId: string) => void
  selectProduct: (productId: string) => void
  setBuyMode: (mode: E.BuyMode) => void
  startNewSeries: () => void
  resetGame: () => void
  dismissAway: () => void
  dismissNotice: (id: number) => void
}

let noticeId = 0
let lastTick = Date.now()
/** Lines the player was already told they can afford, this session and series. */
const announced = new Set<FactoryId>()

function readSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    const game = E.parseSave(raw)
    return { game: game ?? E.newGame(), corrupt: !!raw && !game, storageOk: true }
  } catch {
    return { game: E.newGame(), corrupt: false, storageOk: false }
  }
}

function catchUp(game: E.GameState, seconds: number) {
  const capped = seconds > E.OFFLINE_CAP
  const { state, completed } = E.advance(game, Math.min(seconds, E.OFFLINE_CAP))
  const totals = Object.values(completed).reduce(
    (sum, c) => ({ cash: sum.cash + c.cash, orders: sum.orders + c.orders }),
    { cash: 0, orders: 0 }
  )
  return { state, completed, report: { seconds, capped, ...totals } satisfies AwayReport }
}

function initialState() {
  const { game, corrupt, storageOk } = readSave()
  const now = Date.now()
  lastTick = now
  const notices: Notice[] = []
  if (corrupt) notices.push({ id: ++noticeId, text: 'Simpanan lama tidak bisa dibaca, jadi permainan dimulai dari awal.' })
  if (!storageOk)
    notices.push({ id: ++noticeId, text: 'Browser ini menolak penyimpanan lokal. Progres hilang saat halaman ditutup.' })
  const gone = (now - game.savedAt) / 1000
  if (gone > AWAY_AFTER) {
    const { state, report } = catchUp(game, gone)
    return { game: state, away: report.cash > 0 ? report : null, notices, storageOk }
  }
  return { game, away: null, notices, storageOk }
}

export const useGame = create<Store>((set, get) => {
  const update = (fn: (g: E.GameState) => E.GameState) => set((s) => ({ game: fn(s.game) }))
  const start = initialState()
  return {
    ...start,
    buyMode: 1,
    lastSaved: null,
    tick: (now) => {
      const seconds = (now - lastTick) / 1000
      lastTick = now
      const { game, notices } = get()
      let result: { state: E.GameState; completed: E.Completed }
      let away: AwayReport | null = null
      if (seconds > AWAY_AFTER) {
        const r = catchUp(game, seconds)
        result = r
        if (r.report.cash > 0) away = r.report
      } else result = E.advance(game, seconds)
      const fresh: Notice[] = []
      for (const def of FACTORIES) {
        const fs = result.state.factories[def.id]
        if (fs.unlocked || announced.has(def.id) || result.state.cash < def.unlockCost) continue
        announced.add(def.id)
        fresh.push({
          id: ++noticeId,
          text: `Uangmu cukup untuk membuka ${def.name}.`,
          factory: def.id,
          action: 'Lihat pabrik',
        })
      }
      set({
        game: result.state,
        ...(away ? { away } : {}),
        ...(fresh.length ? { notices: [...notices, ...fresh].slice(-4) } : {}),
      })
      return result.completed
    },
    save: () => {
      const game = { ...get().game, savedAt: Date.now() }
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(game))
        set({ lastSaved: game.savedAt, storageOk: true })
      } catch {
        set({ storageOk: false })
      }
    },
    setActive: (id) => update((g) => ({ ...g, active: id })),
    takeOrder: () => update((g) => E.takeOrder(g, g.active)),
    buyStation: (index) =>
      update((g) => {
        const def = FACTORY_BY_ID[g.active]
        const level = g.factories[g.active].levels[index]
        const n = E.levelsToBuy(def, index, level, g.cash, get().buyMode)
        return E.buyLevels(g, g.active, index, n)
      }),
    hireAgent: () => update((g) => E.hireAgent(g, g.active)),
    unlockFactory: (id) => {
      update((g) => {
        const next = E.unlockFactory(g, id)
        return next === g ? g : { ...next, active: id }
      })
      set((s) => ({ notices: s.notices.filter((n) => n.factory !== id) }))
    },
