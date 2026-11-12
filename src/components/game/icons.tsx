// Small stroke glyphs drawn for this game: each one pictures the thing it labels (a film frame
// for the video line, a browser for the website line), so no icon library is needed.
import type { SVGProps } from 'react'
import type { FactoryId } from '@/game/factories'
import type { MachineMode } from '@/scene/machine-scene'

type P = SVGProps<SVGSVGElement>
const base = {
