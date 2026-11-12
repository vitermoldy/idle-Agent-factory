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
