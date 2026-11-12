// The five production lines. Each one reuses the same five-station machine (the slots are
// the geometry archetypes of the 3D scene) with its own product, economy and painted screens.

export type FactoryId = 'video' | 'web' | 'podcast' | 'app' | 'ebook'
export type SlotId = 'cabinet' | 'engine' | 'admin' | 'storefront' | 'cashdesk'
export type PropKind = 'reels' | 'rack' | 'mic' | 'phone' | 'books'

/** Order flow through the machine: an order enters at the cabinet and is paid at the cash desk. */
export const PIPELINE: SlotId[] = ['cabinet', 'engine', 'admin', 'storefront', 'cashdesk']

export interface StationDef {
  slot: SlotId
  name: string
  desc: string
  /** What this station hands to the next one. */
  output: string
  /** Base speed relative to the line's rate. */
  speed: number
  /** Price of the first upgrade. */
  cost: number
}

type Three = [string, string, string]
type Two = [string, string]

export interface SceneTheme {
  accent: string
  accentDeep: string
  shell: string
  prop: PropKind
  plate: { title: string; line: string }
  queue: { title: string; items: Three; active: string; waiting: string }
  wip: { title: string; sub: string }
  store: {
    brand: string
    nav: string
    tag: Two
    head: Two
    sub: Two
    cta: string
    foot: string
  }
  post: string
  orders: { title: string; sub: string; customers: Three; statuses: Three }
  incoming: string
  cashTitle: string
  receipt: { shop: string }
  screen: { kicker: string; head: string; lines: [string, string, string, string] }
  journey: [Two, Two, Two, Two, Two]
}

/**
 * Something a line can make. Pricier products pay more per order but load some stations
 * harder (`work`, in pipeline order), so the best pick depends on which stations are upgraded.
 */
export interface ProductDef {
  id: string
  name: string
  desc: string
  /** Revenue of one order before bonuses. */
  price: number
  /** Work per order at each station; 1 is the line's base product. */
  work: [number, number, number, number, number]
  unlockCost: number
}

export interface FactoryDef {
  id: FactoryId
  no: string
  name: string
  unit: string
