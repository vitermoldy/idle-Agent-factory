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
