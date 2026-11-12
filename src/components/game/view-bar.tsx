import type { MachineCamera, MachineMode } from '@/scene/machine-scene'
import { cn } from '@/lib/utils'
import { ModeIcon, Pause, Play } from './icons'

const MODES: Array<{ id: MachineMode; label: string }> = [
  { id: 'assembled', label: 'Utuh' },
