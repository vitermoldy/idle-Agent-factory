import type { MachineCamera, MachineMode } from '@/scene/machine-scene'
import { cn } from '@/lib/utils'
import { ModeIcon, Pause, Play } from './icons'

const MODES: Array<{ id: MachineMode; label: string }> = [
  { id: 'assembled', label: 'Utuh' },
  { id: 'cutaway', label: 'Belah' },
  { id: 'stations', label: 'Urai' },
  { id: 'order', label: 'Ikuti order' },
]
const CAMERAS: Array<{ id: MachineCamera; label: string }> = [
  { id: 'overview', label: 'Kamera depan' },
  { id: 'side', label: 'Kamera samping' },
  { id: 'top', label: 'Kamera atas' },
  { id: 'plate', label: 'Kamera petak' },
  { id: 'station', label: 'Kamera stasiun' },
  { id: 'flight', label: 'Kamera berputar' },
]

export function ViewBar({
  mode,
  camera,
  labels,
  playing,
  onMode,
  onCamera,
  onLabels,
  onPlaying,
}: {
  mode: MachineMode
  camera: MachineCamera
  labels: boolean
  playing: boolean
  onMode: (m: MachineMode) => void
  onCamera: (c: MachineCamera) => void
  onLabels: (v: boolean) => void
  onPlaying: (v: boolean) => void
}) {
  return (
    <div
      role="toolbar"
      aria-label="Tampilan mesin"
      className="flex flex-wrap items-center justify-center gap-1 rounded-xl border border-line bg-panel/95 p-1"
    >
      {MODES.map((m) => (
