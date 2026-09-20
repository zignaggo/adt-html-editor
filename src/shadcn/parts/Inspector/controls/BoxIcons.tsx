import type { SVGProps } from 'react'
import type { BoxValue } from '../../../../lib/tailwind/classMaps/types'

const SVG_BASE: SVGProps<SVGSVGElement> = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

function FaintOutline() {
  return <rect x="4" y="4" width="16" height="16" rx="2" strokeWidth="1.5" opacity="0.35" />
}

const SIDE_LINES: Record<keyof BoxValue, [number, number, number, number]> = {
  t: [4, 4, 20, 4],
  r: [20, 4, 20, 20],
  b: [4, 20, 20, 20],
  l: [4, 4, 4, 20],
}

export function SideEmphasisIcon({ side, className }: { side: keyof BoxValue; className?: string }) {
  const [x1, y1, x2, y2] = SIDE_LINES[side]
  return (
    <svg {...SVG_BASE} className={className} aria-hidden="true">
      <FaintOutline />
      <line x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth="3" />
    </svg>
  )
}

const CORNER_PATHS: Record<keyof BoxValue, string> = {
  t: 'M4 10c0-3.3 2.7-6 6-6',
  r: 'M14 4c3.3 0 6 2.7 6 6',
  b: 'M20 14c0 3.3-2.7 6-6 6',
  l: 'M10 20c-3.3 0-6-2.7-6-6',
}

export function CornerEmphasisIcon({ corner, className }: { corner: keyof BoxValue; className?: string }) {
  return (
    <svg {...SVG_BASE} className={className} aria-hidden="true">
      <FaintOutline />
      <path d={CORNER_PATHS[corner]} strokeWidth="3" />
    </svg>
  )
}
