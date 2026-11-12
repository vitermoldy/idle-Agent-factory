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
        <button
          key={m.id}
          type="button"
          aria-pressed={mode === m.id}
          aria-label={m.label}
          onClick={() => onMode(m.id)}
          className={cn('view-btn', mode === m.id && 'is-on')}
        >
          <ModeIcon mode={m.id} />
          <span className="hidden lg:inline" aria-hidden="true">
            {m.label}
          </span>
        </button>
      ))}
      <span className="mx-1 hidden h-5 w-px bg-line sm:block" aria-hidden="true" />
      <label className="sr-only" htmlFor="camera-select">
        Kamera
      </label>
      <select
        id="camera-select"
        value={camera}
        onChange={(e) => onCamera(e.target.value as MachineCamera)}
        className="min-h-11 rounded-lg border border-line bg-ground px-2.5 text-[13px] text-soft hover:border-line-strong"
      >
        {CAMERAS.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        aria-pressed={labels}
        onClick={() => onLabels(!labels)}
        className={cn('view-btn', labels && 'is-on')}
      >
        Label
      </button>
      <button
        type="button"
        aria-pressed={!playing}
        aria-label={playing ? 'Jeda animasi mesin' : 'Jalankan animasi mesin'}
        onClick={() => onPlaying(!playing)}
