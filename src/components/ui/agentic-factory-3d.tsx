import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { FactoryDef, SlotId } from '@/game/factories'
import {
  initMachineScene,
  type MachineCamera,
  type MachineMode,
  type SceneApi,
  type SceneLive,
} from '@/scene/machine-scene'
import { cn } from '@/lib/utils'
import './agentic-factory-3d.css'

/**
 * Agentic Factory 3D, game edition: the interactive machine of one production line.
 * Fills its box. Remount it (React key) to switch lines; the game talks to it through
 * the `live` object, which must keep its identity for the life of the component.
 */
export type AgenticFactory3DProps = {
  factory: FactoryDef
  live: SceneLive
  tooltip: (slot: SlotId, plate: number) => { title: string; body: string }
  onStation?: (slot: SlotId, plate: number) => void
  onView?: (mode: MachineMode, camera: MachineCamera) => void
  onApi?: (api: SceneApi | null) => void
  className?: string
  /** Overlays drawn above the machine. */
  children?: ReactNode
}

type Phase = 'loading' | 'ready' | 'error'

export default function AgenticFactory3D({
  factory,
  live,
  tooltip,
  onStation,
  onView,
  onApi,
  className,
  children,
}: AgenticFactory3DProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const handlers = useRef({ tooltip, onStation, onView, onApi })
  useEffect(() => {
    handlers.current = { tooltip, onStation, onView, onApi }
  }, [tooltip, onStation, onView, onApi])
  const [phase, setPhase] = useState<Phase>('loading')
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    let cancelled = false
    let dispose: (() => void) | undefined
    setPhase('loading')
    const style = getComputedStyle(root)
    const text = style.fontFamily
    const display = style.getPropertyValue('--scene-display').trim() || text
    // The in-scene screens are painted on canvases: the faces must be loaded first.
    Promise.all([document.fonts.load(`600 20px ${text}`), document.fonts.load(`650 20px ${display}`)])
      .catch(() => undefined)
      .then(() => {
        if (cancelled) return
        const scene = initMachineScene(root, {
          factory,
          live,
          fonts: { text, display },
          tooltip: (slot, plate) => handlers.current.tooltip(slot, plate),
          onStation: (slot, plate) => handlers.current.onStation?.(slot, plate),
          onView: (mode, camera) => handlers.current.onView?.(mode, camera),
          onReady: () => !cancelled && setPhase('ready'),
          onError: (message) => {
            if (cancelled) return
            setError(message)
            setPhase('error')
          },
        })
        dispose = scene.dispose
        handlers.current.onApi?.(scene.api)
      })
    return () => {
      cancelled = true
      dispose?.()
      handlers.current.onApi?.(null)
    }
  }, [factory, live, attempt])

  return (
    <div ref={rootRef} className={cn('af3d', className)}>
      <div
        data-el="canvas"
        className="af3d-canvas"
        role="img"
        aria-label={`Mesin 3D ${factory.name} dengan lima stasiun. Seret untuk memutar, gulir atau cubit untuk zoom, klik stasiun untuk melihatnya dari dekat.`}
      />
      <div className="af3d-vignette" />
      <div data-el="labels" className="af3d-labels" />
