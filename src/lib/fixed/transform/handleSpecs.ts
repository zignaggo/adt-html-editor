import type { Point } from '../geometry'

export type HandleId = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

export type HandleSpec = {
  id: HandleId
  x: 0 | 0.5 | 1
  y: 0 | 0.5 | 1
  label: string
}

export const HANDLE_SPECS: HandleSpec[] = [
  { id: 'nw', x: 0, y: 0, label: 'Resize from top-left' },
  { id: 'n', x: 0.5, y: 0, label: 'Resize from top' },
  { id: 'ne', x: 1, y: 0, label: 'Resize from top-right' },
  { id: 'e', x: 1, y: 0.5, label: 'Resize from right' },
  { id: 'se', x: 1, y: 1, label: 'Resize from bottom-right' },
  { id: 's', x: 0.5, y: 1, label: 'Resize from bottom' },
  { id: 'sw', x: 0, y: 1, label: 'Resize from bottom-left' },
  { id: 'w', x: 0, y: 0.5, label: 'Resize from left' },
]

const SPEC_BY_ID = new Map(HANDLE_SPECS.map((spec) => [spec.id, spec]))

export function handleSpec(id: HandleId): HandleSpec {
  const spec = SPEC_BY_ID.get(id)
  if (!spec) throw new Error(`unknown handle ${id}`)
  return spec
}

export function movesX(id: HandleId): boolean {
  return id.includes('e') || id.includes('w')
}

export function movesY(id: HandleId): boolean {
  return id.includes('n') || id.includes('s')
}

export function isCorner(id: HandleId): boolean {
  return id.length === 2
}

export function anchorFractionOf(id: HandleId, fromCenter: boolean): Point {
  if (fromCenter) return { x: 0.5, y: 0.5 }
  const spec = handleSpec(id)
  return { x: 1 - spec.x, y: 1 - spec.y }
}

const COMPASS_DEGREES: Record<HandleId, number> = {
  n: 0,
  ne: 45,
  e: 90,
  se: 135,
  s: 180,
  sw: 225,
  w: 270,
  nw: 315,
}

const CURSORS = ['ns-resize', 'nesw-resize', 'ew-resize', 'nwse-resize']

export function cursorFor(id: HandleId, angle: number): string {
  const direction = (((COMPASS_DEGREES[id] + angle) % 360) + 360) % 360
  return CURSORS[Math.round(direction / 45) % 4]
}
