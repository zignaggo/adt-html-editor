import type { Input } from '@atlaskit/pragmatic-drag-and-drop/types'
import type { Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge'
import type { NodeId } from '../core/ids'

export type LayoutAxis = 'row' | 'column'

export type CanvasZone = { type: 'edge'; edge: Edge } | { type: 'inside' }

export type InsideSpot = {
  beforeId: NodeId | null
  line: { axis: 'horizontal' | 'vertical'; start: number; cross: number; length: number } | null
}

const EDGE_PIXELS = 16
const EDGE_RATIO = 0.3

const zoneKey = Symbol('adt:canvas-zone')

type Data = Record<string | symbol, unknown>

export function layoutAxisOf(element: Element): LayoutAxis {
  const style = getComputedStyle(element)
  if (style.display === 'flex' || style.display === 'inline-flex') {
    return style.flexDirection.startsWith('column') ? 'column' : 'row'
  }
  if (style.display === 'grid' || style.display === 'inline-grid') {
    return style.gridAutoFlow.startsWith('column') ? 'row' : 'column'
  }
  return style.display.startsWith('inline') ? 'row' : 'column'
}

export function edgesForAxis(axis: LayoutAxis): Edge[] {
  return axis === 'row' ? ['left', 'right'] : ['top', 'bottom']
}

export function computeZone(options: {
  rect: DOMRect
  input: Input
  axis: LayoutAxis
  canNest: boolean
}): CanvasZone {
  const { rect, input, axis, canNest } = options
  const horizontal = axis === 'row'

  const size = horizontal ? rect.width : rect.height
  const fromStart = horizontal ? input.clientX - rect.left : input.clientY - rect.top
  const fromEnd = horizontal ? rect.right - input.clientX : rect.bottom - input.clientY
  const startEdge: Edge = horizontal ? 'left' : 'top'
  const endEdge: Edge = horizontal ? 'right' : 'bottom'

  if (!canNest || size <= 0) {
    return { type: 'edge', edge: fromStart <= fromEnd ? startEdge : endEdge }
  }

  const threshold = Math.min(EDGE_PIXELS, size * EDGE_RATIO)
  if (fromStart < threshold) return { type: 'edge', edge: startEdge }
  if (fromEnd < threshold) return { type: 'edge', edge: endEdge }
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
  const children: { id: NodeId; rect: DOMRect }[] = []
  for (const child of Array.from(container.children)) {
    const id = child.getAttribute('data-adt-id')
    if (id) children.push({ id, rect: child.getBoundingClientRect() })
  }

  if (children.length === 0) return { beforeId: null, line: null }

  const horizontal = axis === 'row'
  const pointer = horizontal ? input.clientX : input.clientY

  for (const child of children) {
    const middle = horizontal
      ? child.rect.left + child.rect.width / 2
      : child.rect.top + child.rect.height / 2
    if (pointer < middle) {
      return { beforeId: child.id, line: lineBefore(child.rect, horizontal) }
    }
  }

  const last = children[children.length - 1]
  return { beforeId: null, line: lineAfter(last.rect, horizontal) }
}

function lineBefore(rect: DOMRect, horizontal: boolean): InsideSpot['line'] {
  return horizontal
    ? { axis: 'vertical', start: rect.top, cross: rect.left, length: rect.height }
    : { axis: 'horizontal', start: rect.left, cross: rect.top, length: rect.width }
}

function lineAfter(rect: DOMRect, horizontal: boolean): InsideSpot['line'] {
  return horizontal
    ? { axis: 'vertical', start: rect.top, cross: rect.right, length: rect.height }
    : { axis: 'horizontal', start: rect.left, cross: rect.bottom, length: rect.width }
}
