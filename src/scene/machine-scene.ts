// ---------------------------------------------------------------------------
// The machine: ported from Agentic Factory 3D (github.com/eugeneshilow/agentic-3d-templates,
// built by OpenAI Codex, React port by Claude). This version takes a factory definition, so one
// machine shape serves five product lines (accent, painted screens, station names and one
// signature prop change per line), and it builds one plate per product: every product the
// player owns stands as its own plate beside the others, and a new one rises when it is bought.
// It reads the game state every frame through `live`: each plate's speed drives its clock, the
// bottleneck stations pulse, and a locked line sits dark. All geometry and textures are
// procedural: no models, no images.
// ---------------------------------------------------------------------------
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { PIPELINE, type FactoryDef, type FactoryId, type SlotId } from '@/game/factories'

export type MachineMode = 'assembled' | 'cutaway' | 'stations' | 'order'
export type MachineCamera = 'overview' | 'side' | 'top' | 'plate' | 'station' | 'flight'

/** One product's plate, as the game sees it right now. */
export interface PlateLive {
  owned: boolean
  /** Place in the row, in purchase order. */
  slot: number
  /** Animation speed of this plate; 0 when it has nothing to do. */
  speed: number
  /** Formatted value of one order, painted on its cash desk. */
  value: string
  /** Product name, engraved on the plate and printed on its receipt. */
  product: string
  neck: SlotId[]
}

/** Written by the game every tick, read by the scene every frame. */
export interface SceneLive {
  locked: boolean
  /** Visual pause. The game keeps running. */
  playing: boolean
  labels: boolean
  /** Product index of the plate in view. */
  focus: number
  /** Station labels of the plate in view: level beside the name, speed below it. */
  meta: Record<SlotId, { level: string; rate: string }>
  /** One entry per product of the line, by product index. */
  plates: PlateLive[]
}

export interface SceneApi {
  setMode: (mode: MachineMode) => void
  setCamera: (camera: MachineCamera) => void
  focusStation: (slot: SlotId) => void
  /** Screen position of a station's top on the plate in view, relative to the scene box. */
  project: (slot: SlotId) => { x: number; y: number } | null
}

export interface SceneOptions {
  factory: FactoryDef
  fonts: { text: string; display: string }
  live: SceneLive
  tooltip: (slot: SlotId, plate: number) => { title: string; body: string }
  onStation?: (slot: SlotId, plate: number) => void
  onView?: (mode: MachineMode, camera: MachineCamera) => void
  onReady?: () => void
  onError?: (message: string) => void
}

declare global {
  interface Window {
    __machine?: SceneApi
    __machineDebug?: { getState: () => Record<string, unknown> }
  }
}

/** Geometry order of the stations, left to right along the belt; pipes and label offsets follow it. */
const GEO: SlotId[] = ['engine', 'admin', 'storefront', 'cabinet', 'cashdesk']
const POS: Record<SlotId, [number, number, number]> = {
  engine: [-4.15, 0.29, -0.65],
  admin: [-1.65, 0.29, -2.03],
  storefront: [1.5, 0.29, -2.08],
  cabinet: [4.03, 0.29, 0.12],
  cashdesk: [0.93, 0.29, 1.85],
}
/** Distance between plate centres; a plate is 12.8 wide, so 1.4 of floor shows between two. */
const SPACING = 14.2
const INK = '#171b20'
const pad = (n: number) => String(n).padStart(2, '0')
const NO_PLATE: PlateLive = { owned: false, slot: 0, speed: 0, value: '', product: '', neck: [] }

export function initMachineScene(
  root: HTMLElement,
