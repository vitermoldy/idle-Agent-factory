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
  options: SceneOptions
): { api: SceneApi | null; dispose: () => void } {
  const cleanups: Array<() => void> = []
  const frameWidth = () => root.clientWidth
  const frameHeight = () => root.clientHeight
  // Every listener goes through here, so dispose() can take it off again.
  const listen = (target: EventTarget, type: string, handler: (event: never) => void) => {
    const fn = handler as unknown as EventListener
    target.addEventListener(type, fn)
    cleanups.push(() => target.removeEventListener(type, fn))
  }
  function $(name: string): HTMLElement {
    const el = root.querySelector<HTMLElement>(`[data-el="${name}"]`)
    if (!el) throw new Error(`Scene markup is missing [data-el=${name}]`)
    return el
  }
  const dispose = () => {
    for (const fn of cleanups.reverse()) fn()
    cleanups.length = 0
  }
  let api: SceneApi | null = null
  try {
    const { factory, live } = options
    const theme = factory.theme
    const fontFamily = options.fonts.text
    const displayFamily = options.fonts.display
    const ACC = theme.accent
    const DEEP = theme.accentDeep
    const plateLive = (k: number) => live.plates[k] ?? NO_PLATE
    const stationDef = (slot: SlotId) => factory.stations.find((s) => s.slot === slot)!
    const stepOf = (slot: SlotId) => PIPELINE.indexOf(slot) + 1
    const TAU = Math.PI * 2
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(
      33,
      Math.max(1, frameWidth()) / Math.max(1, frameHeight()),
      0.1,
      220
    )
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      })
    } catch {
      throw new Error(
        'WebGL tidak tersedia. Nyalakan akselerasi perangkat keras di pengaturan browser, lalu muat ulang halaman.'
      )
    }
    renderer.setClearColor(0x000000, 0)
    renderer.setPixelRatio(Math.min(devicePixelRatio, frameWidth() < 900 ? 1.5 : 1.75))
    renderer.setSize(Math.max(1, frameWidth()), Math.max(1, frameHeight()))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = live.locked ? 0.5 : 1.12
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    renderer.localClippingEnabled = true
    $('canvas').appendChild(renderer.domElement)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.065
    controls.enablePan = false
    controls.minDistance = 7
    controls.maxDistance = 90
    controls.minPolarAngle = 0.09
    controls.maxPolarAngle = Math.PI * 0.475
    controls.rotateSpeed = 0.48
    controls.zoomSpeed = 0.7
    const pmrem = new THREE.PMREMGenerator(renderer),
      room = new RoomEnvironment()
    const env = pmrem.fromScene(room, 0.04)
    scene.environment = env.texture
    scene.environmentIntensity = 0.62
    room.dispose()
    pmrem.dispose()
    scene.add(new THREE.HemisphereLight(0xdbe5f4, 0x29211a, 2))
    const key = new THREE.DirectionalLight(0xfff1d8, 4.2)
    key.position.set(-4, 12, 7)
    key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
    Object.assign(key.shadow.camera, { left: -10, right: 10, top: 9, bottom: -9, near: 0.5, far: 45 })
    key.shadow.normalBias = 0.035
    key.shadow.bias = -0.0002
    key.shadow.radius = 4
    scene.add(key)
    /** The shadow box follows the row, so one plate keeps sharp shadows. */
    function fitShadow(count: number) {
      const half = 10 + (SPACING * (count - 1)) / 2
      Object.assign(key.shadow.camera, { left: -half, right: half })
      key.shadow.camera.updateProjectionMatrix()
    }
    const rim = new THREE.DirectionalLight(0xc4d4ed, 3.1)
    rim.position.set(3, 7, -8)
    scene.add(rim)
    const warm = new THREE.PointLight(new THREE.Color(ACC).lerp(new THREE.Color(0xffbd42), 0.6), 28, 20, 2)
    warm.position.set(-4, 5, 3)
    scene.add(warm)
    const front = new THREE.DirectionalLight(0xffffff, 1)
    front.position.set(5, 3, 10)
    scene.add(front)

    const mat = (
      color: THREE.ColorRepresentation,
      metalness = 0.1,
      roughness = 0.4,
      extra: THREE.MeshStandardMaterialParameters = {}
    ) => new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra })
    const M = {
      body: mat(0x30363f, 0.75, 0.29),
      base: mat(0x292f37, 0.85, 0.32),
      edge: mat(0x707986, 0.85, 0.24),
      chrome: mat(0xc3cad0, 0.92, 0.18),
      dark: mat(0x12171d, 0.45, 0.38),
      rubber: mat(0x0b1015, 0.1, 0.6),
      amber: mat(ACC, 0.52, 0.28),
      ivory: mat(theme.shell, 0.48, 0.26),
      copper: mat(DEEP, 0.85, 0.3),
      light: mat(ACC, 0.2, 0.25, { emissive: ACC, emissiveIntensity: 1.5 }),
      green: mat(0xc6d9a1, 0.1, 0.3, { emissive: 0x91b364, emissiveIntensity: 0.7 }),
      paper: mat(0xf4f1ea, 0, 0.85),
    }
    type Vec3 = [number, number, number]
    type Material = THREE.Material
    const geometries = new Map<string, THREE.BufferGeometry>()
    function boxGeo(w: number, h: number, d: number, r = 0.04) {
      const k = `b${w},${h},${d},${r}`
      if (!geometries.has(k))
        geometries.set(
          k,
          r
            ? new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 3, h / 3, d / 3))
            : new THREE.BoxGeometry(w, h, d)
        )
      return geometries.get(k)!
    }
    function box(
      parent: THREE.Object3D,
      w: number,
      h: number,
      d: number,
      x: number,
      y: number,
      z: number,
      m: Material = M.body,
      r = 0.04
    ) {
      const o = new THREE.Mesh(boxGeo(w, h, d, r), m)
      o.position.set(x, y, z)
      o.castShadow = true
      o.receiveShadow = true
      parent.add(o)
      return o
    }
    function cyl(
      parent: THREE.Object3D,
      r: number,
      h: number,
      x: number,
      y: number,
      z: number,
      m: Material = M.chrome,
      r2: number = r,
      segments = 24
    ) {
      const k = `c${r},${r2},${h},${segments}`
      if (!geometries.has(k)) geometries.set(k, new THREE.CylinderGeometry(r, r2, h, segments))
      const o = new THREE.Mesh(geometries.get(k)!, m)
      o.position.set(x, y, z)
      o.castShadow = true
      o.receiveShadow = true
      parent.add(o)
      return o
    }
    function ball(parent: THREE.Object3D, r: number, x: number, y: number, z: number, m: Material = M.chrome) {
      const k = `s${r}`
      if (!geometries.has(k)) geometries.set(k, new THREE.SphereGeometry(r, 16, 10))
      const o = new THREE.Mesh(geometries.get(k)!, m)
      o.position.set(x, y, z)
      o.castShadow = true
      parent.add(o)
      return o
    }
    function tube(parent: THREE.Object3D, pts: Vec3[], r: number, m: Material = M.chrome) {
      const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)))
      const o = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(12, pts.length * 7), r, 8, false), m)
      o.castShadow = true
      parent.add(o)
      return o
    }
    function screw(parent: THREE.Object3D, x: number, y: number, z: number) {
      cyl(parent, 0.055, 0.026, x, y, z, M.chrome, undefined, 12)
      box(parent, 0.068, 0.005, 0.009, x, y + 0.014, z, M.dark, 0)
    }
    type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void
    function canvasTexture(w: number, h: number, draw: Draw) {
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      const ctx = c.getContext('2d')!
      draw(ctx, w, h)
      const t = new THREE.CanvasTexture(c)
      t.colorSpace = THREE.SRGBColorSpace
      t.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy())
      return { texture: t, canvas: c, ctx }
    }
    /** Paints a line of text, shrinking it until it fits `maxW`. */
    function fit(
      ctx: CanvasRenderingContext2D,
      txt: string,
      x: number,
      y: number,
      size: number,
      maxW: number,
      color = '#f4f1ea',
      weight = 500,
      family = fontFamily
    ) {
      let s = size
      ctx.font = `${weight} ${s}px ${family}`
      while (s > 8 && ctx.measureText(txt).width > maxW) {
        s -= 1
        ctx.font = `${weight} ${s}px ${family}`
      }
      ctx.fillStyle = color
      ctx.fillText(txt, x, y)
    }
    const print = (
      ctx: CanvasRenderingContext2D,
      txt: string,
      x: number,
      y: number,
      size = 20,
      color = '#f4f1ea',
      weight = 500,
      family = fontFamily
    ) => fit(ctx, txt, x, y, size, Infinity, color, weight, family)
    function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number | number[], color: string) {
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.roundRect(x, y, w, h, r)
      ctx.fill()
    }
    function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(x, y, r, 0, TAU)
      ctx.fill()
    }
    type Painted = THREE.Texture | { texture: THREE.Texture }
    function screen(parent: THREE.Object3D, w: number, h: number, x: number, y: number, z: number, tex: Painted) {
      const map = 'texture' in tex ? tex.texture : tex
      const o = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map, toneMapped: false }))
      o.position.set(x, y, z)
      parent.add(o)
      return o
    }

    // The product art of each line, drawn in a 384 x 340 box and scaled into any frame.
    type Art = (c: CanvasRenderingContext2D, t: number) => void
    const ARTS: Record<FactoryId, Art> = {
      video: (c, t) => {
        disc(c, 330, 95, 210, DEEP)
        c.strokeStyle = INK
        c.lineWidth = 13
        for (let i = 0; i < 3; i++) {
          c.beginPath()
          c.ellipse(194, 160, 90 - i * 21, 111, Math.sin(t * 0.25) * 0.3 + 0.4, 0, TAU)
          c.stroke()
        }
      },
      web: (c, t) => {
        disc(c, 330, 60, 180, DEEP)
        rounded(c, 34, 34, 316, 252, 12, '#f4f1ea')
        rounded(c, 34, 34, 316, 34, [12, 12, 0, 0], '#dedfd7')
        for (let i = 0; i < 3; i++) disc(c, 54 + i * 16, 51, 4.5, '#adaeaa')
        rounded(c, 54, 86, 128, 104, 8, INK)
        disc(c, 118, 138, 30, ACC)
        for (let i = 0; i < 4; i++) {
          c.fillStyle = i === 0 ? INK : '#b9bcb5'
          c.fillRect(198, 92 + i * 20, i === 0 ? 120 : 132 - i * 18, i === 0 ? 10 : 6)
        }
        rounded(c, 198, 166, 92, 24, 6, INK)
        // The section the agent is building moves along the row.
        const k = Math.floor(t * 0.9) % 3
        for (let i = 0; i < 3; i++) rounded(c, 54 + i * 100, 210, 88, 56, 6, i === k ? ACC : '#e1e2db')
      },
      podcast: (c, t) => {
        disc(c, 320, 70, 190, DEEP)
        disc(c, 192, 170, 138, INK)
        c.strokeStyle = ACC
        c.lineWidth = 6
        c.beginPath()
        c.arc(192, 170, 118, 0, TAU)
        c.stroke()
        for (let i = 0; i < 15; i++) {
          const a = Math.abs(Math.sin(t * 2.4 + i * 0.75)) * 0.75 + 0.25
          const bh = 22 + a * 92 * (1 - Math.abs(i - 7) / 9)
          rounded(c, 105 + i * 12, 170 - bh / 2, 7, bh, 3.5, i % 4 === 0 ? '#f4f1ea' : ACC)
        }
      },
      app: (c, t) => {
        disc(c, 60, 300, 170, DEEP)
        rounded(c, 118, 12, 148, 312, 24, INK)
        rounded(c, 128, 26, 128, 284, 14, '#f4f1ea')
        rounded(c, 168, 34, 48, 8, 4, INK)
        c.fillStyle = DEEP
        c.fillRect(128, 52, 128, 44)
        print(c, 'Hari ini', 140, 81, 15, '#f4f1ea', 600)
        const k = Math.floor(t * 1.1) % 4
        for (let i = 0; i < 4; i++) {
          const y = 108 + i * 44
          rounded(c, 138, y, 108, 34, 7, i === k ? ACC : '#e2e0d6')
          c.fillStyle = i === k ? INK : '#9a9d95'
          c.fillRect(148, y + 10, 52, 6)
          c.fillRect(148, y + 21, 34, 5)
        }
        disc(c, 236, 292, 11, INK)
      },
      ebook: (c, t) => {
        disc(c, 330, 80, 200, DEEP)
        c.fillStyle = '#f4f1ea'
        c.fillRect(270, 36, 14, 262)
        rounded(c, 104, 28, 170, 274, [4, 10, 10, 4], INK)
        c.fillStyle = ACC
        c.fillRect(104, 28, 14, 274)
        fit(c, theme.store.tag[0], 134, 84, 26, 128, ACC, 700, displayFamily)
        fit(c, theme.store.tag[1], 134, 116, 26, 128, '#f4f1ea', 700, displayFamily)
        for (let i = 0; i < 3; i++) {
          c.fillStyle = '#5d636b'
          c.fillRect(134, 150 + i * 16, 110 - i * 22, 5)
        }
        // A page corner lifts and settles.
        const lift = (Math.sin(t * 1.3) * 0.5 + 0.5) * 34 + 10
        c.fillStyle = '#e8e4d8'
        c.beginPath()
        c.moveTo(274, 302 - lift)
        c.lineTo(274 - lift, 302)
        c.lineTo(274, 302)
        c.closePath()
        c.fill()
      },
    }
    function art(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, t: number) {
      c.save()
      c.beginPath()
      c.rect(x, y, w, h)
      c.clip()
      c.translate(x, y)
      c.scale(w / 384, h / 340)
      ARTS[factory.id](c, t)
      c.restore()
    }

    // ---- Shared by every plate: the floor, the painted screens that do not depend on the product.
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 70), new THREE.ShadowMaterial({ opacity: 0.23 }))
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -0.43
    floor.receiveShadow = true
    scene.add(floor)
    const shadowTex = canvasTexture(128, 128, (c, w, h) => {
      const g = c.createRadialGradient(64, 64, 12, 64, 64, 64)
      g.addColorStop(0, 'rgba(0,0,0,.8)')
      g.addColorStop(0.55, 'rgba(0,0,0,.45)')
      g.addColorStop(1, 'rgba(0,0,0,0)')
      c.fillStyle = g
      c.fillRect(0, 0, w, h)
    })
    const contactGeo = new THREE.PlaneGeometry(18, 13)
    const contactMat = new THREE.MeshBasicMaterial({ map: shadowTex.texture, transparent: true, depthWrite: false, opacity: 0.65 })
    const lineMat = new THREE.LineBasicMaterial({ color: 0x69717a, transparent: true, opacity: 0.12 })
    const draftingPoints: THREE.Vector3[] = []
    for (const r of [7.5, 8.1])
      for (let i = 0; i < 120; i++)
        for (const j of [i, i + 1]) {
          const a = (j / 120) * TAU
          draftingPoints.push(new THREE.Vector3(Math.cos(a) * r, -0.4, Math.sin(a) * r * 0.72))
        }
    for (let i = 0; i < 52; i++) {
      const a = (i / 52) * TAU,
        r = 8.1,
        r2 = r + (i % 4 === 0 ? 0.16 : 0.07)
      draftingPoints.push(
        new THREE.Vector3(Math.cos(a) * r, -0.395, Math.sin(a) * r * 0.72),
        new THREE.Vector3(Math.cos(a) * r2, -0.395, Math.sin(a) * r2 * 0.72)
      )
    }
    const draftingGeo = new THREE.BufferGeometry().setFromPoints(draftingPoints)

    const plaques = Object.fromEntries(
      GEO.map((id) => [
        id,
        canvasTexture(512, 116, (c) => {
          c.fillStyle = '#151a20'
          c.fillRect(0, 0, 512, 116)
          print(c, pad(stepOf(id)), 24, 76, 42, ACC, 550)
          fit(c, stationDef(id).name.toUpperCase(), 111, 73, 35, 380, '#d7d9d7', 550)
        }),
      ])
    ) as Record<SlotId, ReturnType<typeof canvasTexture>>

    // Product screen: the line's product, animated, shown on the engine, the storefront and a cargo face.
    const productTex = canvasTexture(384, 640, () => {})
    function drawProduct(t: number) {
      const c = productTex.ctx
      c.fillStyle = ACC
      c.fillRect(0, 0, 384, 640)
      art(c, 0, 112, 384, 340, t)
      print(c, theme.screen.kicker, 28, 57, 24, '#242320', 650)
      fit(c, theme.screen.head, 24, 101, 40, 336, '#242320', 700, displayFamily)
      rounded(c, 25, 465, 334, 123, 12, INK)
      const lines = theme.screen.lines
      const n = Math.floor(t * 0.7) % 4
      fit(c, lines[n], 45, 505, 25, 300, '#f4f1ea', 550)
      fit(c, lines[(n + 1) % 4], 45, 547, 25, 300, '#f4f1ea', 550)
      c.fillStyle = '#fff7d4'
      c.fillRect(27, 615, Math.max(10, ((t * 0.13) % 1) * 330), 5)
      productTex.texture.needsUpdate = true
    }
    drawProduct(0)
    const queue = canvasTexture(640, 340, () => {})
    function drawQueue(t: number) {
      const c = queue.ctx,
        q = theme.queue
      c.fillStyle = '#111b20'
      c.fillRect(0, 0, 640, 340)
      fit(c, q.title, 25, 45, 21, 440, '#acb9b8', 550)
      print(c, '03 / 08', 530, 45, 20, ACC, 500)
      for (let i = 0; i < 3; i++) {
        const y = 74 + i * 76
        rounded(c, 21, y, 598, 61, 6, '#202c30')
        c.fillStyle = i === 0 ? DEEP : '#626f69'
        c.fillRect(34, y + 10, 27, 41)
        fit(c, q.items[i], 77, y + 29, 19, 280, '#d4d8cc')
        print(c, i === 0 ? q.active : q.waiting, 77, y + 49, 11, i === 0 ? ACC : '#81948f')
        c.fillStyle = '#334348'
        c.fillRect(377, y + 26, 214, 7)
        c.fillStyle = i === 0 ? ACC : '#607475'
        c.fillRect(377, y + 26, i === 0 ? ((t * 0.15) % 1) * 214 : 41 + i * 27, 7)
      }
      queue.texture.needsUpdate = true
    }
    drawQueue(0)
    const webTexture = canvasTexture(896, 592, (c, w, h) => {
      const st = theme.store
      c.fillStyle = '#edece3'
      c.fillRect(0, 0, w, h)
      c.fillStyle = '#dedfd7'
      c.fillRect(0, 0, w, 56)
      for (let i = 0; i < 3; i++) disc(c, 26 + i * 19, 27, 4, '#adaeaa')
      print(c, st.brand, 33, 100, 22, '#22282b', 650, displayFamily)
      c.textAlign = 'right'
      print(c, st.nav, 862, 98, 14, '#6a7271')
      c.textAlign = 'left'
      rounded(c, 32, 131, 287, 401, 10, ACC)
      art(c, 40, 252, 271, 250, 0)
      fit(c, st.tag[0], 52, 181, 29, 250, '#242827', 700, displayFamily)
      fit(c, st.tag[1], 52, 220, 29, 250, '#242827', 700, displayFamily)
      fit(c, st.head[0], 359, 197, 41, 500, '#22282b', 600, displayFamily)
      fit(c, st.head[1], 359, 252, 41, 500, '#22282b', 600, displayFamily)
      print(c, st.sub[0], 362, 300, 19, '#77807b')
      print(c, st.sub[1], 362, 329, 19, '#77807b')
      for (let i = 0; i < 3; i++) {
        c.fillStyle = '#d1d5cd'
        c.fillRect(362, 363 + i * 16, 400 - i * 43, 5)
      }
      rounded(c, 359, 447, 279, 62, 7, '#232a2b')
      fit(c, st.cta, 390, 486, 22, 230, '#f4f1ea', 500)
      print(c, st.foot, 33, 571, 12, '#879088')
    })
    const postTex = canvasTexture(220, 290, (c, w, h) => {
      c.fillStyle = '#f4f1ea'
      c.fillRect(0, 0, w, h)
      c.fillStyle = ACC
      c.fillRect(15, 16, 190, 168)
      art(c, 15, 16, 190, 168, 0)
      fit(c, theme.post, 17, 225, 23, 186, '#283030', 600)
      c.fillStyle = '#b0b5b0'
      c.fillRect(17, 244, 153, 6)
      c.fillRect(17, 258, 104, 5)
    })
    const orderTex = canvasTexture(480, 460, (c, w, h) => {
      const o = theme.orders
      c.fillStyle = '#172224'
      c.fillRect(0, 0, w, h)
      fit(c, o.title, 30, 51, 27, 420, '#e8e8d8', 550)
      print(c, o.sub, 30, 81, 16, '#869991')
      o.customers.forEach((n, i) => {
        const y = 110 + i * 100
        rounded(c, 22, y, 436, 83, 8, '#283839')
        disc(c, 58, y + 40, 19, [ACC, '#bdbf9c', '#7d938e'][i])
        c.textAlign = 'center'
        print(c, n[0], 58, y + 47, 20, '#1b2828', 600)
        c.textAlign = 'left'
        print(c, n, 93, y + 33, 23, '#e6e8dc', 550)
        print(c, o.statuses[i], 93, y + 58, 15, '#94a59b')
      })
    })
    const nameTex = canvasTexture(432, 204, (c, w, h) => {
      const name = theme.orders.customers[0]
      c.fillStyle = ACC
      c.fillRect(0, 0, w, h)
      disc(c, 58, 98, 32, '#2a2e26')
      c.textAlign = 'center'
      print(c, name[0], 58, 111, 34, ACC, 550)
      c.textAlign = 'left'
      fit(c, name, 108, 91, 38, 300, '#222822', 600)
      fit(c, theme.incoming, 108, 138, 23, 300, 'rgba(20,20,16,.66)', 500)
    })
    const dollarTex = canvasTexture(128, 128, (c, w, h) => {
      c.clearRect(0, 0, w, h)
      c.textAlign = 'center'
      print(c, '$', 64, 95, 91, '#3a2a10', 650)
    })
    const scriptTex = canvasTexture(256, 352, (c, w, h) => {
      c.fillStyle = '#eeeae0'
      c.fillRect(0, 0, w, h)
      fit(c, theme.wip.title, 24, 47, 22, 208, '#3b403a', 650)
      fit(c, theme.wip.sub, 24, 85, 15, 208, '#7a7c70')
      for (let i = 0; i < 9; i++) {
        c.fillStyle = i === 4 ? DEEP : '#aeb2a5'
        c.fillRect(24, 111 + i * 21, 190 - (i % 3) * 24, 6)
      }
      print(c, 'SELESAI  ✓', 24, 327, 17, '#4f5a45', 600)
    })
    const orderCardTex = canvasTexture(256, 352, (c, w, h) => {
      c.fillStyle = DEEP
      c.fillRect(0, 0, w, h)
      print(c, 'ORDER', 21, 48, 24, '#1f241d', 650)
      print(c, 'BARU', 21, 79, 24, '#1f241d', 650)
      c.strokeStyle = 'rgba(20,24,20,.45)'
      c.lineWidth = 2
      c.strokeRect(23, 112, 210, 139)
      fit(c, theme.orders.customers[0], 42, 190, 37, 176, '#1f241d', 550)
      fit(c, `${factory.unit.toUpperCase()} / 01`, 23, 320, 17, 210, 'rgba(20,24,20,.75)')
    })

    // Conveyor path, the same on every plate.
    const path = new THREE.CatmullRomCurve3(
      [
        [-3.95, 0.84, 0.65],
        [-3.1, 0.84, -0.12],
        [-1.45, 0.84, -0.79],
        [1.32, 0.84, -0.8],
        [3.3, 0.84, 0.19],
        [3.43, 0.84, 1.21],
        [1.35, 0.84, 2.7],
        [-1.4, 0.84, 2.52],
        [-3.54, 0.84, 1.65],
      ].map((p) => new THREE.Vector3(...(p as Vec3))),
      true,
      'catmullrom',
      0.25
    )
    const pVec = new THREE.Vector3(),
      tVec = new THREE.Vector3()
    const beltFrameGeo = new THREE.TubeGeometry(path, 150, 0.35, 8, true)
    const railGeos = [-1, 1].map((side) => {
      const pts: THREE.Vector3[] = []
      for (let i = 0; i <= 160; i++) {
        path.getPointAt(i / 160, pVec)
        path.getTangentAt(i / 160, tVec)
        pts.push(pVec.clone().add(new THREE.Vector3(-tVec.z * 0.36 * side, 0.09, tVec.x * 0.36 * side)))
      }
      return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.028, 6, false)
    })
    // Find ports by arc length, so the travelling order arrives at the actual station.
    function nearestPort(x: number, z: number) {
      let best = 0,
        dist = Infinity
      for (let i = 0; i < 300; i++) {
        const p = path.getPointAt(i / 300),
          d = (p.x - x) ** 2 + (p.z - z) ** 2
        if (d < dist) {
          dist = d
          best = i / 300
        }
      }
      return best
    }
    const adminU = nearestPort(-1.65, -0.7)
    const storeU = nearestPort(1.5, -0.7)
    const cashU = nearestPort(0.93, 2.65)

    const cutPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 10)
    function shell<T extends THREE.Material>(m: T): T {
      const s = m.clone() as T
      s.clippingPlanes = [cutPlane]
      s.clipShadows = true
      s.side = THREE.DoubleSide
      return s
    }
    const S = { body: shell(M.body), ivory: shell(M.ivory), amber: shell(M.amber), edge: shell(M.edge) }

    // Merge static geometry per parent/material. Moving assemblies remain separate.
    function compact(group: THREE.Object3D) {
      for (const child of [...group.children]) if ((child as THREE.Group).isGroup) compact(child)
      const buckets = new Map<string, THREE.Mesh<THREE.BufferGeometry, THREE.Material>[]>()
      for (const object of group.children) {
        const child = object as THREE.Mesh<THREE.BufferGeometry, THREE.Material> & { isInstancedMesh?: boolean }
        if (!child.isMesh || child.isInstancedMesh || child.userData.moving || Array.isArray(child.material)) continue
        const key = child.material.uuid
        if (!buckets.has(key)) buckets.set(key, [])
        buckets.get(key)!.push(child)
      }
      for (const list of buckets.values()) {
        if (list.length < 2) continue
        const geos = list.map((m) => {
          m.updateMatrix()
          const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()
          return g.applyMatrix4(m.matrix)
        })
        const merged = mergeGeometries(geos, false)
        for (const geo of geos) geo.dispose()
        if (!merged) continue
        const mesh = new THREE.Mesh(merged, list[0].material)
        mesh.castShadow = list.some((x) => x.castShadow)
        mesh.receiveShadow = list.some((x) => x.receiveShadow)
        for (const m of list) group.remove(m)
        group.add(mesh)
      }
    }

    type PlateStation = { id: SlotId; group: THREE.Group; base: THREE.Vector3; glowMat: THREE.MeshStandardMaterial; index: number }
    type Packet = { group: THREE.Group; faces: THREE.Mesh[]; halo: THREE.Mesh; stage: number; phase: number }
    type Plate = ReturnType<typeof buildPlate>

    /** One complete machine for product `k`: platform, five stations, belt and cargo. */
    function buildPlate(k: number) {
      const product = factory.products[k]
      const holder = new THREE.Group()
      holder.visible = false
      holder.scale.setScalar(0.001)
      scene.add(holder)
      const machine = new THREE.Group()
      holder.add(machine)
      const contact = new THREE.Mesh(contactGeo, contactMat)
      contact.rotation.x = -Math.PI / 2
      contact.position.y = -0.415
      holder.add(contact)
      holder.add(new THREE.LineSegments(draftingGeo, lineMat))
      // A chamfered, layered platform with engraved nomenclature and captive screws.
      box(machine, 12.8, 0.38, 8.25, 0, -0.09, 0, M.base, 0.17)
      box(machine, 12.6, 0.055, 8.08, 0, 0.13, 0, M.edge, 0.11)
      box(machine, 12.49, 0.09, 7.96, 0, 0.19, 0, M.body, 0.1)
      box(machine, 12.55, 0.027, 8.02, 0, -0.19, 0, M.dark, 0.06)
      box(machine, 11.9, 0.026, 0.032, 0, -0.17, 4.115, M.light, 0.01)
      for (const x of [-5.6, 5.6])
        for (const z of [-3.35, 3.35]) {
          cyl(machine, 0.39, 0.25, x, -0.31, z, M.rubber)
          cyl(machine, 0.29, 0.09, x, -0.4, z, M.dark)
          screw(machine, x, 0.253, z)
        }
      for (const x of [-6.02, 6.02]) for (const z of [-3.73, 3.73]) screw(machine, x, 0.255, z)
      // The engraving names the line and the product this plate makes.
      const engraving = canvasTexture(1536, 176, (c, w, h) => {
        c.fillStyle = '#252b32'
        c.fillRect(0, 0, w, h)
        c.strokeStyle = '#4d545c'
        c.lineWidth = 2
        c.strokeRect(2, 2, w - 4, h - 4)
        c.font = `650 40px ${displayFamily}`
        const tw = c.measureText(theme.plate.title).width
        print(c, theme.plate.title, 45, 79, 40, '#d9d8cd', 650, displayFamily)
        fit(c, product.name, 45 + tw + 34, 79, 34, w - tw - 330, '#c9cdd0', 500)
        fit(c, theme.plate.line.toUpperCase(), 47, 133, 19, 1100, '#8a939c', 500)
        c.textAlign = 'right'
        print(c, `PETAK ${k + 1}`, w - 48, 130, 23, DEEP, 600)
        c.textAlign = 'left'
      })
      const plaqueMesh = screen(machine, 7.35, 0.84, -0.4, 0.25, 3.51, engraving)
      plaqueMesh.rotation.x = -Math.PI / 2
      for (let i = 0; i < 16; i++)
        box(machine, 0.015, 0.009, 0.11 + (i % 4) * 0.035, -5.6 + i * 0.09, 0.249, 3.5, M.edge, 0)

      const stations: PlateStation[] = []
      const gears: Array<{ g: THREE.Group; dir: number }> = []
      function gear(parent: THREE.Object3D, dir: number, x: number, y: number, z: number, r = 0.3) {
        const g = new THREE.Group()
        g.position.set(x, y, z)
        parent.add(g)
        cyl(g, r, 0.09, 0, 0, 0, M.copper)
        cyl(g, r * 0.66, 0.105, 0, 0, 0, M.dark)
        cyl(g, r * 0.22, 0.14, 0, 0, 0, M.chrome)
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * TAU,
            b = box(g, r * 0.26, 0.085, r * 0.2, Math.cos(a) * r, 0, Math.sin(a) * r, M.copper, 0.008)
          b.rotation.y = -a
        }
        g.userData.moving = true
        gears.push({ g, dir })
      }
      GEO.forEach((id, i) => {
        const group = new THREE.Group()
        group.position.fromArray(POS[id])
        machine.add(group)
        const glowMat = M.light.clone()
        glowMat.emissiveIntensity = 0.5
        box(group, 2.05, 0.12, 1.78, 0, 0.03, 0, M.dark, 0.1)
        box(group, 1.97, 0.03, 1.7, 0, 0.12, 0, glowMat, 0.09)
        box(group, 2.03, 0.17, 1.75, 0, 0.215, 0, M.body, 0.1)
        for (const x of [-0.85, 0.85]) for (const z of [-0.7, 0.7]) screw(group, x, 0.311, z)
        // Internal mechanics become visible when the shell is cut at deck height.
        gear(group, 1, -0.35, 0.45, 0, 0.27)
        gear(group, -1, 0.22, 0.45, 0.12, 0.21)
        box(group, 0.6, 0.15, 0.36, 0.52, 0.47, -0.33, M.dark)
        for (let j = 0; j < 6; j++) box(group, 0.025, 0.16, 0.37, 0.3 + j * 0.08, 0.47, -0.33, M.edge, 0.004)
        tube(group, [[-0.7, 0.4, -0.4], [-0.55, 0.48, 0.4], [0.35, 0.45, 0.6], [0.7, 0.58, 0.23]], 0.023, M.light)
        screen(group, 1.54, 0.345, 0, 0.27, 0.891, plaques[id])
        stations.push({ id, group, base: new THREE.Vector3(...POS[id]), glowMat, index: i })
      })
      const bySlot = (slot: SlotId) => stations.find((s) => s.id === slot)!

      const propUpdates: Array<(t: number) => void> = []
      const engine = bySlot('engine').group
      box(engine, 1.74, 0.62, 1.33, 0, 0.65, -0.05, S.ivory, 0.13)
      box(engine, 1.5, 0.1, 1.16, 0, 0.99, -0.04, S.body, 0.025)
      for (const x of [-0.68, 0.68]) {
        cyl(engine, 0.065, 1.73, x, 1.35, -0.18, M.chrome)
        box(engine, 0.22, 1.8, 0.22, x, 1.37, -0.44, S.ivory, 0.035)
      }
      box(engine, 1.82, 0.27, 0.4, 0, 2.28, -0.35, S.amber, 0.045)
      box(engine, 1.55, 0.06, 0.06, 0, 2.13, -0.115, M.chrome, 0.01)
      const printhead = new THREE.Group()
      engine.add(printhead)
      printhead.position.set(0, 1.9, -0.08)
      printhead.userData.moving = true
      box(printhead, 0.45, 0.36, 0.44, 0, 0, 0, M.body, 0.05)
      cyl(printhead, 0.11, 0.13, 0, -0.24, 0.03, M.chrome, 0.04)
      box(printhead, 0.24, 0.045, 0.022, 0, 0.09, 0.23, M.light, 0.01)
      tube(engine, [[-0.68, 2.1, -0.35], [-0.42, 2.52, -0.4], [0.25, 2.5, -0.4], [0.35, 2.01, -0.12]], 0.032, M.dark)

      // The signature prop on the left of the engine: what makes each line look like its trade.
      if (theme.prop === 'reels') {
        const reels: THREE.Group[] = []
        for (const [x, y] of [[-1.03, 1.82], [-0.94, 2.78]]) {
          const reel = new THREE.Group()
          reel.position.set(x, y, -0.48)
          engine.add(reel)
          reel.userData.moving = true
          const core = cyl(reel, 0.4, 0.22, 0, 0, 0, M.dark)
          core.rotation.x = Math.PI / 2
          for (const z of [-0.14, 0.14]) {
            const d = cyl(reel, 0.46, 0.045, 0, 0, z, M.chrome)
            d.rotation.x = Math.PI / 2
            for (let j = 0; j < 6; j++) {
              const a = (j / 6) * TAU
              const hole = cyl(reel, 0.1, 0.006, Math.cos(a) * 0.29, Math.sin(a) * 0.29, z + (z > 0 ? 0.026 : -0.026), M.dark, undefined, 14)
              hole.rotation.x = Math.PI / 2
            }
          }
          const axle = cyl(reel, 0.095, 0.37, 0, 0, 0, M.amber)
          axle.rotation.x = Math.PI / 2
          reels.push(reel)
        }
        tube(engine, [[-1.36, 2.66, -0.48], [-1.5, 2.34, -0.48], [-1.34, 1.92, -0.48]], 0.045, M.dark)
        propUpdates.push((t) => reels.forEach((r, i) => (r.rotation.z = -t * (i ? 0.65 : 0.85))))
      } else if (theme.prop === 'rack') {
        // A server rack with blinking status lights.
        const rack = new THREE.Group()
        rack.position.set(-1.17, 0, -0.42)
        engine.add(rack)
        box(rack, 0.5, 2.35, 0.6, 0, 1.12, 0, S.body, 0.05)
        box(rack, 0.54, 0.08, 0.64, 0, 2.32, 0, S.amber, 0.02)
        const leds: THREE.Mesh[] = []
        for (let row = 0; row < 7; row++) {
          const y = 0.5 + row * 0.25
          box(rack, 0.42, 0.18, 0.02, 0, y, 0.305, M.dark, 0.012)
          box(rack, 0.18, 0.014, 0.012, -0.08, y - 0.035, 0.318, M.edge, 0)
          for (let j = 0; j < 3; j++) {
            const led = box(rack, 0.036, 0.036, 0.02, 0.07 + j * 0.06, y + 0.035, 0.32, M.dark, 0)
            led.userData.moving = true
            leds.push(led)
          }
        }
        tube(engine, [[-1.17, 2.36, -0.3], [-1.0, 2.5, -0.32], [-0.78, 2.32, -0.35]], 0.03, M.dark)
        propUpdates.push((t) =>
          leds.forEach((led, i) => {
            led.material = Math.sin(t * (2.2 + (i % 5) * 0.9) + i * 1.7) > 0.15 ? M.light : M.dark
          })
        )
      } else if (theme.prop === 'mic') {
        // A studio microphone on a boom, with a level meter at its foot.
        const mic = new THREE.Group()
        mic.position.set(-1.2, 0, -0.32)
        engine.add(mic)
        cyl(mic, 0.27, 0.06, 0, -0.02, 0, M.dark)
        cyl(mic, 0.035, 2.0, 0, 0.98, 0, M.chrome)
        tube(mic, [[0, 1.95, 0], [0.08, 2.24, 0.1], [0.3, 2.42, 0.26]], 0.028, M.chrome)
        const head = new THREE.Group()
        head.position.set(0.34, 2.56, 0.3)
        head.userData.moving = true
        mic.add(head)
        cyl(head, 0.14, 0.3, 0, -0.06, 0, M.dark)
        cyl(head, 0.155, 0.04, 0, 0.1, 0, M.amber)
        cyl(head, 0.15, 0.2, 0, 0.22, 0, M.chrome)
        ball(head, 0.15, 0, 0.32, 0, M.chrome)
        const meter = new THREE.Group()
        meter.position.set(0.02, 0, 0.66)
        mic.add(meter)
        box(meter, 0.46, 0.16, 0.36, 0, 0.03, 0, M.dark, 0.03)
        const bars: THREE.Mesh[] = []
        for (let i = 0; i < 6; i++) {
          const bar = box(meter, 0.045, 0.3, 0.06, -0.15 + i * 0.06, 0.26, 0.05, i > 3 ? M.amber : M.light, 0.01)
          bar.userData.moving = true
          bars.push(bar)
        }
        propUpdates.push((t) => {
          head.rotation.z = -0.22 + Math.sin(t * 0.8) * 0.05
          bars.forEach((bar, i) => {
            const s = 0.25 + Math.abs(Math.sin(t * 3.1 + i * 0.9)) * 0.75
            bar.scale.y = s
            bar.position.y = 0.11 + 0.15 * s
          })
        })
      } else if (theme.prop === 'phone') {
        // A test phone on a stand, playing the line's product screen.
        const stand = new THREE.Group()
        stand.position.set(-1.2, 0, -0.25)
        engine.add(stand)
        cyl(stand, 0.25, 0.06, 0, -0.02, 0, M.dark)
        cyl(stand, 0.04, 1.62, 0, 0.79, 0, M.chrome)
        const phone = new THREE.Group()
        phone.position.set(0, 1.98, 0)
        phone.userData.moving = true
        stand.add(phone)
        box(phone, 0.52, 0.94, 0.07, 0, 0, 0, M.dark, 0.06)
        screen(phone, 0.45, 0.78, 0, -0.01, 0.037, productTex)
        box(phone, 0.12, 0.02, 0.012, 0, 0.42, 0.037, M.edge, 0.005)
        propUpdates.push((t) => {
          phone.rotation.y = 0.5 + Math.sin(t * 0.6) * 0.18
          phone.position.y = 1.98 + Math.sin(t * 1.1) * 0.04
        })
      } else {
        // A stack of books with an open one on top, its page turning.
        const shelf = new THREE.Group()
        shelf.position.set(-1.22, 0, -0.22)
        engine.add(shelf)
        const covers = [M.amber, S.ivory, M.dark, M.copper]
        covers.forEach((m, i) => {
          const b = box(shelf, 0.54 - i * 0.03, 0.12, 0.72 - i * 0.04, 0, 0.02 + i * 0.125, 0, m, 0.02)
          b.rotation.y = i % 2 ? 0.12 : -0.08
        })
        const open = new THREE.Group()
        open.position.set(0, 0.56, 0)
        shelf.add(open)
        for (const side of [-1, 1]) {
          const page = box(open, 0.3, 0.025, 0.46, side * 0.155, 0.02, 0, M.paper, 0.01)
          page.rotation.z = side * -0.1
        }
        const turn = new THREE.Group()
        turn.userData.moving = true
        open.add(turn)
        box(turn, 0.29, 0.012, 0.44, 0.15, 0.05, 0, M.paper, 0.004)
        propUpdates.push((t) => {
          const p = (t * 0.32) % 1
          turn.rotation.z = THREE.MathUtils.smoothstep(p, 0.2, 0.8) * (Math.PI - 0.2)
        })
      }

      const outputVideo = new THREE.Group()
      outputVideo.userData.moving = true
      engine.add(outputVideo)
      box(outputVideo, 0.62, 1.08, 0.055, 0, 1.36, 0.61, M.dark, 0.035)
      screen(outputVideo, 0.56, 0.98, 0, 1.36, 0.641, productTex)
      box(engine, 1.14, 0.12, 0.2, 0, 0.83, 0.66, M.dark, 0.025)
      for (const x of [-0.42, 0.42]) {
        const r = cyl(engine, 0.115, 0.18, x, 0.92, 0.6, M.chrome)
        r.rotation.z = Math.PI / 2
      }
      for (let i = 0; i < 5; i++) box(engine, 0.08, 0.03, 0.22, -0.38 + i * 0.19, 1.011, -0.02, M.edge, 0.005)

      const admin = bySlot('admin').group
      box(admin, 1.9, 0.66, 1.36, 0, 0.67, -0.04, S.body, 0.11)
      const consoleTop = new THREE.Group()
      consoleTop.position.set(0, 1.01, -0.08)
      consoleTop.rotation.x = -0.32
      admin.add(consoleTop)
      box(consoleTop, 1.76, 0.12, 1.27, 0, 0, 0, S.ivory, 0.04)
      const qs = screen(consoleTop, 1.53, 0.79, 0, 0.067, -0.17, queue)
      qs.rotation.x = -Math.PI / 2
      const toggles: THREE.Mesh[] = []
      for (let i = 0; i < 4; i++) {
        const x = -0.57 + i * 0.38
        cyl(consoleTop, 0.074, 0.035, x, 0.1, 0.45, M.dark)
        const t = cyl(consoleTop, 0.025, 0.15, x, 0.19, 0.45, M.chrome)
        t.rotation.x = -0.4
        t.userData.moving = true
        toggles.push(t)
        ball(consoleTop, 0.04, x, 0.275, 0.421, M.ivory)
      }
      cyl(admin, 0.075, 0.06, 0.77, 1.05, -0.62, M.green)
      for (let i = 0; i < 7; i++) box(admin, 0.55, 0.027, 0.02, 0, 0.46 + i * 0.05, 0.655, M.dark, 0.003)

      const storefront = bySlot('storefront').group
      box(storefront, 1.35, 0.18, 0.88, 0, 0.44, 0, S.ivory, 0.045)
      cyl(storefront, 0.095, 1.04, 0, 0.93, -0.31, M.chrome)
      box(storefront, 0.56, 0.91, 0.14, 0, 0.99, -0.34, S.body, 0.04)
      box(storefront, 2.42, 1.72, 0.2, 0, 1.94, -0.17, S.ivory, 0.08)
      box(storefront, 2.28, 1.59, 0.1, 0, 1.94, -0.044, M.dark, 0.045)
      screen(storefront, 2.16, 1.43, 0, 1.95, 0.011, webTexture)
      ball(storefront, 0.024, 0, 2.747, -0.05, M.dark)
      box(storefront, 0.21, 0.019, 0.008, 0, 1.149, 0.013, M.light, 0.003)
      screen(storefront, 0.685, 0.96, -0.655, 1.86, 0.018, productTex)
      const flyPost = new THREE.Group()
      flyPost.userData.moving = true
      storefront.add(flyPost)
      box(flyPost, 0.59, 0.77, 0.045, 0.94, 0.81, 0.55, M.ivory, 0.025)
      screen(flyPost, 0.55, 0.72, 0.94, 0.81, 0.575, postTex)

      const cabinet = bySlot('cabinet').group
      box(cabinet, 1.75, 1.77, 1.02, 0, 1.24, -0.13, S.body, 0.12)
      box(cabinet, 1.58, 0.13, 1.09, 0, 2.16, -0.13, S.amber, 0.04)
      box(cabinet, 1.47, 1.38, 0.055, 0, 1.31, 0.405, M.dark, 0.025)
      screen(cabinet, 1.31, 1.255, 0, 1.37, 0.44, orderTex)
      box(cabinet, 1.27, 0.075, 0.29, 0, 0.57, 0.55, M.chrome, 0.02)
      for (let i = 0; i < 3; i++) box(cabinet, 1.15, 0.021, 0.12, 0, 0.58 + i * 0.15, -0.35, M.copper, 0.006)
      tube(cabinet, [[0.69, 0.43, -0.2], [0.89, 0.65, -0.2], [0.89, 1.8, -0.2], [0.65, 1.99, -0.2]], 0.033, M.chrome)
      const incoming = new THREE.Group()
      incoming.userData.moving = true
      cabinet.add(incoming)
      box(incoming, 0.86, 0.42, 0.043, 0, 0, 0, M.light, 0.035)
      screen(incoming, 0.82, 0.39, 0, 0, 0.026, nameTex)

      const cashdesk = bySlot('cashdesk').group
      box(cashdesk, 1.91, 0.63, 1.32, 0, 0.65, -0.06, S.ivory, 0.12)
      box(cashdesk, 1.96, 0.19, 1.38, 0, 0.42, -0.04, S.body, 0.04)
      box(cashdesk, 1.37, 0.09, 0.038, 0, 0.44, 0.66, M.dark, 0.01)
      box(cashdesk, 0.37, 0.042, 0.03, 0, 0.45, 0.687, M.chrome, 0.009)
      box(cashdesk, 1.02, 0.25, 0.91, -0.33, 1.04, -0.03, S.body, 0.045)
      for (let row = 0; row < 3; row++)
        for (let col = 0; col < 3; col++)
          box(cashdesk, 0.19, 0.085, 0.17, -0.62 + col * 0.27, 1.21, 0.27 - row * 0.24, col === 2 && row === 2 ? M.amber : M.ivory, 0.022)
      box(cashdesk, 0.64, 0.6, 0.52, 0.58, 1.04, -0.15, S.body, 0.045)
      box(cashdesk, 0.48, 0.07, 0.09, 0.59, 1.37, -0.1, M.dark, 0.01)
      cyl(cashdesk, 0.06, 0.65, -0.35, 1.6, -0.56, M.chrome)
      box(cashdesk, 1.13, 0.46, 0.19, -0.35, 1.98, -0.56, S.body, 0.045)
      // This plate's own price: its cash screen and receipt.
      const cashTex = canvasTexture(512, 176, () => {})
      const receiptTex = canvasTexture(280, 540, () => {})
      let paintedValue = ''
      function paintPrice(value: string) {
        paintedValue = value
        let c = cashTex.ctx
        c.fillStyle = '#12231e'
        c.fillRect(0, 0, 512, 176)
        fit(c, theme.cashTitle, 22, 44, 23, 470, '#9cae91', 500)
        fit(c, '+ ' + value, 26, 131, 66, 470, '#ecedc7', 500)
        cashTex.texture.needsUpdate = true
        c = receiptTex.ctx
        c.fillStyle = '#f4f1ea'
        c.fillRect(0, 0, 280, 540)
        fit(c, theme.receipt.shop, 25, 52, 24, 230, '#333d36', 650)
        print(c, 'STRUK PENJUALAN', 25, 87, 17, '#566059')
        c.strokeStyle = '#8a9189'
        c.setLineDash([5, 6])
        c.beginPath()
        c.moveTo(22, 115)
        c.lineTo(258, 115)
        c.stroke()
        c.setLineDash([])
        fit(c, product.name, 25, 154, 22, 230, '#333d36')
        fit(c, '1 × ' + value, 25, 190, 21, 230, '#333d36')
        print(c, 'LUNAS', 25, 263, 31, '#333d36', 650)
        print(c, 'Terima kasih!', 25, 317, 24, '#687067')
        for (let i = 0; i < 44; i++) {
          c.fillStyle = '#333d36'
          c.fillRect(25 + i * 5, 370, 1 + (i % 3), 83)
        }
        print(c, 'No. 0001', 81, 496, 17, '#59635b')
        receiptTex.texture.needsUpdate = true
      }
      paintPrice(plateLive(k).value)
      screen(cashdesk, 1.015, 0.349, -0.35, 1.98, -0.459, cashTex)
      const receipt = new THREE.Group()
      receipt.position.set(0.59, 1.37, -0.1)
      receipt.userData.moving = true
      cashdesk.add(receipt)
      const rp = screen(receipt, 0.41, 0.83, 0, 0.415, 0.01, receiptTex)
      ;(rp.material as THREE.MeshBasicMaterial).side = THREE.DoubleSide
      receipt.rotation.x = -0.16
      const coin = new THREE.Group()
      coin.userData.moving = true
      cashdesk.add(coin)
      const coinDisc = cyl(coin, 0.22, 0.065, 0, 0, 0, M.amber, undefined, 32)
      coinDisc.rotation.x = Math.PI / 2
      const coinRing = new THREE.Mesh(new THREE.TorusGeometry(0.174, 0.014, 6, 32), M.light)
      coinRing.position.z = 0.037
      coin.add(coinRing)
      const dollar = screen(coin, 0.28, 0.28, 0, 0, 0.04, dollarTex)
      ;(dollar.material as THREE.MeshBasicMaterial).transparent = true
      cyl(cashdesk, 0.33, 0.09, 1.04, 0.39, 0.55, M.dark)
      cyl(cashdesk, 0.26, 0.025, 1.04, 0.445, 0.55, M.copper)

      // Conveyor: instanced treads, continuous rails and phase-locked cargo.
      const belt = new THREE.Group()
      machine.add(belt)
      const frameMesh = new THREE.Mesh(beltFrameGeo, M.dark)
      frameMesh.scale.y = 0.3
      frameMesh.position.y = 0.51
      belt.add(frameMesh)
      const beltCount = 148
      const beltSlats = new THREE.InstancedMesh(boxGeo(0.135, 0.065, 0.63, 0.012), M.body, beltCount)
      beltSlats.receiveShadow = true
      beltSlats.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
      belt.add(beltSlats)
      const dummy = new THREE.Object3D()
      function updateBelt(t: number) {
        for (let i = 0; i < beltCount; i++) {
          const u = (i / beltCount + t * 0.012) % 1
          path.getPointAt(u, pVec)
          path.getTangentAt(u, tVec)
          dummy.position.copy(pVec)
          dummy.rotation.set(0, -Math.atan2(tVec.z, tVec.x), 0)
          dummy.updateMatrix()
          beltSlats.setMatrixAt(i, dummy.matrix)
        }
        beltSlats.instanceMatrix.needsUpdate = true
      }
      updateBelt(0)
      for (const g of railGeos) belt.add(new THREE.Mesh(g, M.chrome))
      for (let i = 0; i < 16; i++) {
        const p = path.getPointAt(i / 16)
        cyl(belt, 0.045, 0.43, p.x, 0.53, p.z, M.chrome)
      }
      // Pneumatic lines (in the line's deep accent) link the station footings.
      const pipes = new THREE.Group()
      machine.add(pipes)
      for (let i = 0; i < 4; i++) {
        const a = stations[i].base,
          b = stations[i + 1].base
        const curve = new THREE.CatmullRomCurve3([
          a.clone().add(new THREE.Vector3(0.4, 0.12, 0)),
          a.clone().lerp(b, 0.35).add(new THREE.Vector3(0, 0.1, -0.6)),
          a.clone().lerp(b, 0.65).add(new THREE.Vector3(0, 0.1, -0.6)),
          b.clone().add(new THREE.Vector3(-0.4, 0.12, 0)),
        ])
        pipes.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 30, 0.054, 8, false), M.copper))
      }
      const packetTextures = [orderCardTex, scriptTex, productTex, postTex, receiptTex]
      const packets: Packet[] = []
      for (let i = 0; i < 6; i++) {
        const g = new THREE.Group()
        g.userData.moving = true
        machine.add(g)
        box(g, 0.47, 0.71, 0.04, 0, 0, 0, M.ivory, 0.022)
        const faces = packetTextures.map((tex) => {
          const s = screen(g, 0.43, 0.665, 0, 0, 0.024, tex)
          ;(s.material as THREE.MeshBasicMaterial).side = THREE.DoubleSide
          s.visible = false
          return s
        })
        const halo = new THREE.Mesh(
          new THREE.RingGeometry(0.4, 0.414, 40),
          new THREE.MeshBasicMaterial({ color: ACC, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false })
        )
        halo.rotation.x = -Math.PI / 2
        halo.position.y = -0.37
        g.add(halo)
        halo.visible = false
        packets.push({ group: g, faces, halo, stage: -1, phase: 0 })
      }
      ;[incoming, receipt, coin, outputVideo, flyPost, printhead].forEach((g) => (g.userData.moving = true))
      compact(machine)
      stations.forEach((s) => s.group.traverse((o) => Object.assign(o.userData, { station: s.id, plate: k })))
      return {
        k,
        holder,
        stations,
        bySlot,
        gears,
        propUpdates,
        printhead,
        outputVideo,
        flyPost,
        incoming,
        receipt,
        coin,
        toggles,
        belt,
        pipes,
        packets,
        updateBelt,
        paintPrice,
        painted: () => paintedValue,
        engine,
        t: 0,
        speed: 0,
        lastBelt: -1,
        shown: false,
      }
    }
    const plates = factory.products.map((_, k) => buildPlate(k))
    const pickables = plates.flatMap((p) => p.stations.map((s) => s.group))

    // Station labels follow the plate in view.
    const labels = GEO.map((id) => {
      const el = document.createElement('div')
      el.className = 'station-label'
      el.innerHTML = `<div class="stem"></div><div class="label-card"><div class="label-title"><span>${pad(stepOf(id))}</span><b></b><em></em></div><div class="label-meta"></div></div>`
      el.querySelector('.label-title b')!.textContent = stationDef(id).name
      $('labels').appendChild(el)
      cleanups.push(() => el.remove())
      return {
        id,
        el,
        level: el.querySelector<HTMLElement>('.label-title em')!,
        meta: el.querySelector<HTMLDivElement>('.label-meta')!,
        levelText: '',
        metaText: '',
      }
    })

    let mode: MachineMode = 'assembled',
      cameraMode: MachineCamera = 'overview',
      spread = 0,
      selected: SlotId = 'engine',
      hovered: { slot: SlotId; plate: number } | null = null,
      ownedCount = 0,
      lastFocus = live.focus
    let width = frameWidth(),
      height = frameHeight(),
      mobile = width <= 640,
      lastInteraction = performance.now(),
      dragging = false,
      wasDragged = false,
      downX = 0,
      downY = 0
    let cameraAnimating = true,
      flightTime = 0,
      visible = true,
      contextLost = false
    const desiredPosition = new THREE.Vector3(),
      desiredTarget = new THREE.Vector3(0, 1, 0)
    const viewDirection = new THREE.Vector3(10.5, 10.8, 17).normalize()
    let baseDistance = 25,
      plateDistance = 25,
      sized = false,
      readySent = false
    const focusPlate = () => plates[live.focus] ?? plates[0]
    /** Where a plate stands in the row: owned plates centred on the origin, in purchase order. */
    const targetX = (k: number) => (plateLive(k).slot - (ownedCount - 1) / 2) * SPACING
    const countOwned = () => plates.filter((p) => plateLive(p.k).owned || p.k === 0).length
    const world = (p: Plate, local: THREE.Vector3, out: THREE.Vector3) =>
      out.copy(local).multiplyScalar(p.holder.scale.x).add(p.holder.position)
    // Camera distance that fits a row `span` wide. The row runs along x, which the camera sees
    // at about 0.85 of its length across and 0.25 of it up the screen.
    function fitDistance(span: number) {
      const aspect = width / height
      const tan = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
      // A single plate may crop its drafting rings on a phone; a row must show every plate whole.
      const share = mobile ? (span > 0 ? 0.94 : 1.1) : 0.9
      const horizontalFit = (17.3 + span * 0.85) / (tan * aspect * share)
      const verticalFit = (11.5 + span * 0.25) / (tan * (mobile ? 0.84 : 0.8))
      return Math.max(horizontalFit, verticalFit)
    }
    function fitRow() {
      baseDistance = fitDistance(SPACING * (ownedCount - 1))
      plateDistance = fitDistance(0)
      controls.maxDistance = Math.max(90, baseDistance * 1.6)
      fitShadow(ownedCount)
    }
    // A zero-size box (a collapsed panel) would put NaN into the camera; wait for a real size.
    function layoutCamera() {
      if (!frameWidth() || !frameHeight()) return
      const first = !sized
      sized = true
      width = frameWidth()
      height = frameHeight()
      mobile = width <= 640
      renderer.setSize(width, height)
      camera.aspect = width / height
      // The overlays sit on the bottom of the box, so the machine is lifted a little.
      camera.setViewOffset(width, height, 0, height * 0.06, width, height)
      fitRow()
      camera.updateProjectionMatrix()
      setCameraGoal()
      cameraAnimating = true
      if (first) {
        camera.position.copy(desiredPosition)
        controls.target.copy(desiredTarget)
        controls.update()
        cameraAnimating = false
      }
    }
    const scratch = new THREE.Vector3(),
      anchor = new THREE.Vector3()
    function setCameraGoal() {
      const expand = mode === 'stations' ? 1.2 : 1
      const fp = focusPlate()
      if (cameraMode === 'station') {
        world(fp, fp.bySlot(selected).group.position, desiredTarget).add(new THREE.Vector3(0, 1.25, 0))
        desiredPosition.copy(desiredTarget).addScaledVector(viewDirection, mobile ? 9 : 12)
      } else if (cameraMode === 'plate') {
        desiredTarget.set(targetX(fp.k), 1, 0)
        desiredPosition.copy(viewDirection).multiplyScalar(plateDistance * expand).add(desiredTarget)
      } else {
        desiredTarget.set(0, 1, 0)
        const distance = baseDistance * expand
        if (cameraMode === 'side') desiredPosition.set(13, 5, 20).normalize().multiplyScalar(distance).add(desiredTarget)
        else if (cameraMode === 'top') desiredPosition.set(0.01, distance, 0.8).add(desiredTarget)
        else desiredPosition.copy(viewDirection).multiplyScalar(distance).add(desiredTarget)
      }
    }
    const emitView = () => {
      $('journey').classList.toggle('visible', mode === 'order')
      options.onView?.(mode, cameraMode)
    }
    function setMode(next: MachineMode) {
      mode = next
      lastInteraction = performance.now()
