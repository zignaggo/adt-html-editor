import type { Input } from '@atlaskit/pragmatic-drag-and-drop/types'
import type { Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge'
import type { NodeId } from '../core/ids'

export type LayoutAxis = 'row' | 'column' | 'mixed'

export type CanvasZone = { type: 'edge'; edge: Edge } | { type: 'inside' }

export type SpotLine = {
  axis: 'horizontal' | 'vertical'
  start: number
  cross: number
  length: number
}

export type InsideSpot = {
  beforeId: NodeId | null
  line: SpotLine | null
}

export type EdgeBand = 'thin' | 'wide'

const THIN_EDGE_PIXELS = 16
const THIN_EDGE_RATIO = 0.3
const WIDE_EDGE_PIXELS = 24
const WIDE_EDGE_RATIO = 0.4
const LINE_OVERLAP_RATIO = 0.5
const ADJACENT_TOLERANCE = 1

function edgeThreshold(size: number, band: EdgeBand): number {
  return band === 'wide'
    ? Math.max(WIDE_EDGE_PIXELS, size * WIDE_EDGE_RATIO)
    : Math.min(THIN_EDGE_PIXELS, size * THIN_EDGE_RATIO)
}

const zoneKey = Symbol('adt:canvas-zone')

type Data = Record<string | symbol, unknown>

type ChildRect = { id: NodeId; rect: DOMRect }

export function layoutAxisOf(element: Element): LayoutAxis {
  return measuredAxisOf(element) ?? styleAxisOf(element)
}

function measuredAxisOf(element: Element): LayoutAxis | null {
  const children = childRects(element)
  if (children.length < 2) return null
  const lines = groupLines(children)
  if (lines.length === 1) return 'row'
  if (lines.every((line) => line.length === 1)) return 'column'
  return 'mixed'
}

function styleAxisOf(element: Element): LayoutAxis {
  const style = getComputedStyle(element)
  const { display } = style

  if (display === 'flex' || display === 'inline-flex') {
    return style.flexDirection.startsWith('column') ? 'column' : 'row'
  }

  if (display === 'grid' || display === 'inline-grid') {
    const columns = trackCount(style.gridTemplateColumns)
    const rows = trackCount(style.gridTemplateRows)
    if (columns > 1 && rows > 1) return 'mixed'
    if (columns > 1) return 'row'
    if (rows > 1) return 'column'
    return style.gridAutoFlow.startsWith('column') ? 'row' : 'column'
  }

  return display.startsWith('inline') ? 'row' : 'column'
}

function trackCount(value: string): number {
  if (!value || value === 'none') return 0
  let tracks = value.replace(/\[[^\]]*\]/g, ' ')
  while (/\([^()]*\)/.test(tracks)) tracks = tracks.replace(/\([^()]*\)/g, '')
  return tracks.trim().split(/\s+/).filter(Boolean).length
}

export function computeZone(options: {
  rect: DOMRect
  input: Input
  axis: LayoutAxis
  canNest: boolean
  band?: EdgeBand
}): CanvasZone {
  const { rect, input, axis, canNest, band = 'thin' } = options
  const across = axis !== 'column'

  const size = across ? rect.width : rect.height
  const fromStart = across ? input.clientX - rect.left : input.clientY - rect.top
  const fromEnd = across ? rect.right - input.clientX : rect.bottom - input.clientY
  const startEdge: Edge = across ? 'left' : 'top'
  const endEdge: Edge = across ? 'right' : 'bottom'
  const nearestEdge: CanvasZone = {
    type: 'edge',
    edge: fromStart <= fromEnd ? startEdge : endEdge,
  }

  if (!canNest || size <= 0) return nearestEdge

  const threshold = edgeThreshold(size, band)
  if (fromStart < threshold) return { type: 'edge', edge: startEdge }
  if (fromEnd < threshold) return { type: 'edge', edge: endEdge }

  if (axis === 'mixed' && rect.height > 0) {
    const crossThreshold = edgeThreshold(rect.height, band)
    const fromTop = input.clientY - rect.top
    const fromBottom = rect.bottom - input.clientY
    if (fromTop < crossThreshold || fromBottom < crossThreshold) return nearestEdge
  }

  return { type: 'inside' }
}

export function attachCanvasZone(userData: Data, zone: CanvasZone): Data {
  return { ...userData, [zoneKey]: zone }
}

export function extractCanvasZone(data: Data): CanvasZone | null {
  const zone = data[zoneKey]
  if (!zone || typeof zone !== 'object') return null
  const candidate = zone as CanvasZone
  return candidate.type === 'edge' || candidate.type === 'inside' ? candidate : null
}

export function computeInsideSpot(
  container: Element,
  input: Input,
  axis: LayoutAxis,
): InsideSpot {
  const children = childRects(container)
  if (children.length === 0) return { beforeId: null, line: null }

  if (axis !== 'mixed') {
    const across = axis === 'row'
    return spotAt(children, children, insertIndex(children, input, across), across)
  }

  const members = nearestLine(groupLines(children), input.clientY)
  return spotAt(children, members, insertIndex(members, input, true), true)
}

export function computeEdgeLine(element: Element, edge: Edge): SpotLine | null {
  const across = edge === 'left' || edge === 'right'
  const before = edge === 'left' || edge === 'top'
  const rect = element.getBoundingClientRect()
  const neighbour = adjacentRect(element, rect, across, before)
  return before ? lineBetween(neighbour, rect, across) : lineBetween(rect, neighbour, across)
}

function childRects(container: Element): ChildRect[] {
  const children: ChildRect[] = []
  for (const child of Array.from(container.children)) {
    const id = child.getAttribute('data-adt-id')
    if (!id) continue
    const rect = child.getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0) continue
    children.push({ id, rect })
  }
  return children
}

function insertIndex(members: ChildRect[], input: Input, across: boolean): number {
  const pointer = across ? input.clientX : input.clientY
  for (let index = 0; index < members.length; index += 1) {
    const { rect } = members[index]
    const middle = across ? rect.left + rect.width / 2 : rect.top + rect.height / 2
    if (pointer < middle) return index
  }
  return members.length
}

function spotAt(
  children: ChildRect[],
  members: ChildRect[],
  index: number,
  across: boolean,
): InsideSpot {
  const previous = members[index - 1] ?? null
  const next = members[index] ?? null

  const position = next
    ? children.indexOf(next)
    : previous
      ? children.indexOf(previous) + 1
      : children.length

  return {
    beforeId: children[position]?.id ?? null,
    line: lineBetween(previous?.rect ?? null, next?.rect ?? null, across),
  }
}

function lineBetween(
  previous: DOMRect | null,
  next: DOMRect | null,
  across: boolean,
): SpotLine | null {
  const rects = [previous, next].filter((rect): rect is DOMRect => rect !== null)
  if (rects.length === 0) return null

  const mainStart = (rect: DOMRect) => (across ? rect.left : rect.top)
  const mainEnd = (rect: DOMRect) => (across ? rect.right : rect.bottom)
  const crossStart = (rect: DOMRect) => (across ? rect.top : rect.left)
  const crossEnd = (rect: DOMRect) => (across ? rect.bottom : rect.right)

  const cross =
    previous && next
      ? (mainEnd(previous) + mainStart(next)) / 2
      : next
        ? mainStart(next)
        : mainEnd(rects[0])

  const start = Math.min(...rects.map(crossStart))
  const length = Math.max(...rects.map(crossEnd)) - start

  return { axis: across ? 'vertical' : 'horizontal', start, cross, length }
}

function groupLines(children: ChildRect[]): ChildRect[][] {
  const lines: ChildRect[][] = []
  let current: ChildRect[] = []
  let top = 0
  let bottom = 0

  for (const child of children) {
    const { rect } = child
    if (current.length === 0) {
      current = [child]
      top = rect.top
      bottom = rect.bottom
      continue
    }

    const overlap = Math.min(bottom, rect.bottom) - Math.max(top, rect.top)
    const smallest = Math.min(bottom - top, rect.height)
    if (overlap > 0 && overlap >= smallest * LINE_OVERLAP_RATIO) {
      current.push(child)
      top = Math.min(top, rect.top)
      bottom = Math.max(bottom, rect.bottom)
      continue
    }

    lines.push(current)
    current = [child]
    top = rect.top
    bottom = rect.bottom
  }

  if (current.length > 0) lines.push(current)
  return lines
}

function nearestLine(lines: ChildRect[][], pointer: number): ChildRect[] {
  let best = lines[0]
  let bestDistance = Number.POSITIVE_INFINITY

  for (const line of lines) {
    const top = Math.min(...line.map((child) => child.rect.top))
    const bottom = Math.max(...line.map((child) => child.rect.bottom))
    const distance = pointer < top ? top - pointer : pointer > bottom ? pointer - bottom : 0
    if (distance < bestDistance) {
      bestDistance = distance
      best = line
    }
  }

  return best
}

function adjacentRect(
  element: Element,
  rect: DOMRect,
  across: boolean,
  before: boolean,
): DOMRect | null {
  let sibling = before ? element.previousElementSibling : element.nextElementSibling

  while (sibling) {
    if (sibling.getAttribute('data-adt-id')) {
      const candidate = sibling.getBoundingClientRect()
      if (candidate.width !== 0 || candidate.height !== 0) {
        return isAdjacent(candidate, rect, across, before) ? candidate : null
      }
    }
    sibling = before ? sibling.previousElementSibling : sibling.nextElementSibling
  }

  return null
}

function isAdjacent(
  neighbour: DOMRect,
  rect: DOMRect,
  across: boolean,
  before: boolean,
): boolean {
  const overlap = across
    ? Math.min(neighbour.bottom, rect.bottom) - Math.max(neighbour.top, rect.top)
    : Math.min(neighbour.right, rect.right) - Math.max(neighbour.left, rect.left)
  if (overlap <= 0) return false

  const gap = across
    ? before
      ? rect.left - neighbour.right
      : neighbour.left - rect.right
    : before
      ? rect.top - neighbour.bottom
      : neighbour.top - rect.bottom

  return gap >= -ADJACENT_TOLERANCE
}
