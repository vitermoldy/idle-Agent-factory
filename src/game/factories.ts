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
