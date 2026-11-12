// Pure game rules: no React, no DOM. Every function returns a new state, so the store and the
// balance script share exactly the same arithmetic.
import {
  FACTORIES,
  FACTORY_BY_ID,
  type FactoryDef,
  type FactoryId,
  type ProductDef,
} from './factories.ts'

export const SAVE_VERSION = 3
/** A station doubles its speed when it reaches each of these levels. */
export const MILESTONES = [10, 25, 50, 100, 150, 200, 300, 400, 500, 750, 1000]
export const MAX_LEVEL = 2000
/** Orders a player can line up by hand on a line without an agent. */
export const QUEUE_MAX = 10
/** Offline earnings stop after this many seconds. */
export const OFFLINE_CAP = 8 * 60 * 60
/** Each star adds this much to every order's value. */
export const STAR_BONUS = 0.05
/** Lifetime earnings that give the first star; stars grow with the square root. */
export const STAR_UNIT = 1e10

export interface FactoryState {
  unlocked: boolean
  agent: boolean
  levels: number[]
  /** The plate in view; hand-taken orders are made there. */
  product: string
  /** Products bought for this line, in purchase order. Each one has its own plate. */
  owned: string[]
  /** Orders waiting on a line without an agent. */
  queue: number
  /** Fraction of the next order already done, per plate. */
  progress: Record<string, number>
  orders: number
  earned: number
}

export interface GameState {
  v: number
  cash: number
  /** Earned in this series. */
  earned: number
  /** Earned across every series; stars come from this. */
  allTime: number
  stars: number
  series: number
  active: FactoryId
  factories: Record<FactoryId, FactoryState>
  savedAt: number
  startedAt: number
}

export type Completed = Partial<Record<FactoryId, { orders: number; cash: number }>>

const freshFactory = (def: FactoryDef): FactoryState => {
  const unlocked = def.unlockCost === 0
  return {
    unlocked,
    agent: false,
    levels: unlocked ? [1, 1, 1, 1, 1] : [0, 0, 0, 0, 0],
    product: def.products[0].id,
    owned: [def.products[0].id],
    queue: 0,
    progress: {},
    orders: 0,
    earned: 0,
  }
}

export function newGame(now = Date.now()): GameState {
  return {
    v: SAVE_VERSION,
    cash: 0,
    earned: 0,
    allTime: 0,
    stars: 0,
    series: 1,
    active: 'video',
    factories: Object.fromEntries(FACTORIES.map((f) => [f.id, freshFactory(f)])) as Record<
      FactoryId,
      FactoryState
    >,
    savedAt: now,
    startedAt: now,
  }
}

export function milestoneCount(level: number) {
  let n = 0
  for (const m of MILESTONES) if (level >= m) n++
  return n
}

export function nextMilestone(level: number): number | null {
  return MILESTONES.find((m) => m > level) ?? null
}

export function activeProduct(def: FactoryDef, fs: FactoryState): ProductDef {
  return def.products.find((p) => p.id === fs.product) ?? def.products[0]
}

/** Raw capacity of a station: base-product orders per second. */
export function stationRate(def: FactoryDef, index: number, level: number) {
  if (level <= 0) return 0
  return def.rate * def.stations[index].speed * level * 2 ** milestoneCount(level)
}

/** Orders per second each station manages on a product. */
export function lineRates(def: FactoryDef, fs: FactoryState, product = activeProduct(def, fs)) {
  return def.stations.map((_, i) => stationRate(def, i, fs.levels[i]) / product.work[i])
}

/** Orders per second: a line is exactly as fast as its slowest station. */
export function throughput(def: FactoryDef, fs: FactoryState, product = activeProduct(def, fs)) {
  if (!fs.unlocked) return 0
  return Math.min(...lineRates(def, fs, product))
}

/** Every station within a hair of the slowest one (ties are common in a balanced line). */
export function bottlenecks(def: FactoryDef, fs: FactoryState, product = activeProduct(def, fs)) {
  if (!fs.unlocked) return []
  const rates = lineRates(def, fs, product)
  const min = Math.min(...rates)
  return rates.flatMap((r, i) => (r <= min * 1.0001 ? [i] : []))
}

export const starMultiplier = (stars: number) => 1 + stars * STAR_BONUS

export function orderValue(def: FactoryDef, fs: FactoryState, stars: number, product = activeProduct(def, fs)) {
  return product.price * starMultiplier(stars)
}

/** Income of one plate running nonstop on a product, whether or not an agent runs it yet. */
export function productIncome(def: FactoryDef, fs: FactoryState, stars: number, product = activeProduct(def, fs)) {
  return throughput(def, fs, product) * orderValue(def, fs, stars, product)
}

export const ownedProducts = (def: FactoryDef, fs: FactoryState) =>
  fs.owned.map((id) => def.products.find((p) => p.id === id)!).filter(Boolean)

/** Income of every plate of a line together, as if an agent ran it. */
export function lineIncome(def: FactoryDef, fs: FactoryState, stars: number, levels = fs.levels) {
  if (!fs.unlocked) return 0
  const at = { ...fs, levels }
  return ownedProducts(def, fs).reduce((sum, p) => sum + productIncome(def, at, stars, p), 0)
}

/** Steady income of a line that runs by itself (an agent is hired). */
export function incomePerSec(def: FactoryDef, fs: FactoryState, stars: number) {
  if (!fs.unlocked || !fs.agent) return 0
  return lineIncome(def, fs, stars)
}

export function totalIncome(state: GameState) {
  return FACTORIES.reduce((sum, def) => sum + incomePerSec(def, state.factories[def.id], state.stars), 0)
}

/** Price of buying `count` levels of a station that sits at `level` now. */
export function upgradeCost(def: FactoryDef, index: number, level: number, count = 1) {
  const g = def.growth
  const first = def.stations[index].cost * g ** (level - 1)
  return (first * (g ** count - 1)) / (g - 1)
}

/** How many levels of a station the cash can pay for. */
export function affordableLevels(def: FactoryDef, index: number, level: number, cash: number) {
  const g = def.growth
  const first = def.stations[index].cost * g ** (level - 1)
  if (cash < first) return 0
  const n = Math.floor(Math.log((cash * (g - 1)) / first + 1) / Math.log(g))
  // Guard against rounding at the edge.
  const fit = upgradeCost(def, index, level, n) <= cash ? n : n - 1
  return Math.max(0, Math.min(fit, MAX_LEVEL - level))
}

export type BuyMode = 1 | 10 | 'max'

/** Levels a buy button would purchase: at least one, so a price is always shown. */
export function levelsToBuy(def: FactoryDef, index: number, level: number, cash: number, mode: BuyMode) {
  const room = MAX_LEVEL - level
  if (room <= 0) return 0
  if (mode === 'max') return Math.max(1, affordableLevels(def, index, level, cash))
  return Math.min(mode, room)
}

function withFactory(state: GameState, id: FactoryId, patch: Partial<FactoryState>): GameState {
  return { ...state, factories: { ...state.factories, [id]: { ...state.factories[id], ...patch } } }
}

export function buyLevels(state: GameState, id: FactoryId, index: number, count: number) {
  const def = FACTORY_BY_ID[id]
  const fs = state.factories[id]
  if (!fs.unlocked || count <= 0) return state
  const level = fs.levels[index]
  if (level + count > MAX_LEVEL) return state
  const cost = upgradeCost(def, index, level, count)
  if (cost > state.cash) return state
  const levels = fs.levels.slice()
  levels[index] = level + count
  return { ...withFactory(state, id, { levels }), cash: state.cash - cost }
}

export function hireAgent(state: GameState, id: FactoryId) {
  const def = FACTORY_BY_ID[id]
  const fs = state.factories[id]
  if (!fs.unlocked || fs.agent || state.cash < def.agentCost) return state
  return { ...withFactory(state, id, { agent: true, queue: 0 }), cash: state.cash - def.agentCost }
}

export function unlockFactory(state: GameState, id: FactoryId) {
  const def = FACTORY_BY_ID[id]
  const fs = state.factories[id]
  if (fs.unlocked || state.cash < def.unlockCost) return state
  return {
    ...withFactory(state, id, { unlocked: true, levels: [1, 1, 1, 1, 1] }),
    cash: state.cash - def.unlockCost,
  }
}

/** Buys a product: a new plate is built beside the others and comes into view. */
export function buyProduct(state: GameState, id: FactoryId, productId: string) {
  const def = FACTORY_BY_ID[id]
  const fs = state.factories[id]
  const product = def.products.find((p) => p.id === productId)
  if (!product || !fs.unlocked || fs.owned.includes(productId) || state.cash < product.unlockCost) return state
  return {
    ...withFactory(state, id, { owned: [...fs.owned, productId], product: productId }),
    cash: state.cash - product.unlockCost,
  }
}

/** Brings one plate into view; hand-taken orders go to it. */
export function selectProduct(state: GameState, id: FactoryId, productId: string) {
  const fs = state.factories[id]
  if (!fs.owned.includes(productId) || fs.product === productId) return state
  return withFactory(state, id, { product: productId })
}

export function takeOrder(state: GameState, id: FactoryId) {
  const fs = state.factories[id]
  if (!fs.unlocked || fs.agent || fs.queue >= QUEUE_MAX) return state
  return withFactory(state, id, { queue: fs.queue + 1 })
}

/**
 * Runs every line for `seconds`. With an agent every plate runs nonstop; without one only the
 * plate in view works, and only on the orders taken by hand.
 */
export function advance(state: GameState, seconds: number): { state: GameState; completed: Completed } {
  if (!(seconds > 0)) return { state, completed: {} }
  const completed: Completed = {}
  const factories = { ...state.factories }
  let gained = 0
  for (const def of FACTORIES) {
    const fs = factories[def.id]
    if (!fs.unlocked) continue
    if (!fs.agent && fs.queue <= 0) continue
    const progress = { ...fs.progress }
    let done = 0
    let cash = 0
    let queue = fs.queue
    const plates = fs.agent ? ownedProducts(def, fs) : [activeProduct(def, fs)]
    for (const p of plates) {
      const work = (progress[p.id] ?? 0) + throughput(def, fs, p) * seconds
      let made = Math.floor(work)
      progress[p.id] = work - made
      if (!fs.agent) {
        if (made >= queue) {
          made = queue
          progress[p.id] = 0
        }
        queue -= made
      }
      done += made
      cash += made * orderValue(def, fs, state.stars, p)
    }
    factories[def.id] = { ...fs, progress, queue, orders: fs.orders + done, earned: fs.earned + cash }
    if (done > 0) {
      completed[def.id] = { orders: done, cash }
      gained += cash
    }
  }
  return {
    state: {
      ...state,
      factories,
      cash: state.cash + gained,
      earned: state.earned + gained,
      allTime: state.allTime + gained,
    },
    completed,
  }
}

/** Stars held in total once a player has earned `allTime`. */
export function starsEarnedTotal(allTime: number) {
  return Math.floor(Math.sqrt(allTime / STAR_UNIT))
}

/** Lifetime earnings needed for the next star. */
export function nextStarAt(allTime: number) {
  const next = starsEarnedTotal(allTime) + 1
  return next * next * STAR_UNIT
}

export function starsClaimable(state: GameState) {
  return Math.max(0, starsEarnedTotal(state.allTime) - state.stars)
}

/** Resets every line, product and the cash; keeps the stars and adds the new ones. */
export function startNewSeries(state: GameState, now = Date.now()): GameState {
  const claim = starsClaimable(state)
  if (claim <= 0) return state
  return {
    ...newGame(now),
    allTime: state.allTime,
    stars: state.stars + claim,
    series: state.series + 1,
  }
}

/** Reads a saved game; anything malformed returns null so the caller can start fresh. */
export function parseSave(raw: string | null): GameState | null {
  if (!raw) return null
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return null
  }
  if (!data || typeof data !== 'object') return null
  const s = data as Partial<GameState>
  // Version 2 kept one progress number per line; it reads into the plate in view.
  if ((s.v !== SAVE_VERSION && s.v !== 2) || typeof s.cash !== 'number' || !Number.isFinite(s.cash)) return null
