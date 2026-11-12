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
