// Small stroke glyphs drawn for this game: each one pictures the thing it labels (a film frame
// for the video line, a browser for the website line), so no icon library is needed.
import type { SVGProps } from 'react'
import type { FactoryId } from '@/game/factories'
import type { MachineMode } from '@/scene/machine-scene'

type P = SVGProps<SVGSVGElement>
const base = {
  width: 16,
  height: 16,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const

/** The machine's mark, from the original component. */
export const Mark = (p: P) => (
  <svg {...base} width={18} height={18} viewBox="0 0 20 20" strokeWidth={1.7} {...p}>
    <path d="M3 5l7 11 7-11M7 5l3 5 3-5" />
  </svg>
)

export const Gear = (p: P) => (
  <svg {...base} width={18} height={18} viewBox="0 0 20 20" {...p}>
    <circle cx="10" cy="10" r="2.6" />
    <path d="M10 2.5v2M10 15.5v2M17.5 10h-2M4.5 10h-2M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4M15.3 15.3l-1.4-1.4M6.1 6.1L4.7 4.7" />
    <circle cx="10" cy="10" r="5.4" />
  </svg>
)

export const Lock = (p: P) => (
