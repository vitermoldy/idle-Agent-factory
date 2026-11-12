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
