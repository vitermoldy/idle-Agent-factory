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
