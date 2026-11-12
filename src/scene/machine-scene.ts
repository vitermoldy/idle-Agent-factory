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
