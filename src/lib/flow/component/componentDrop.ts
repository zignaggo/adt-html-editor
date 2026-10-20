import type { IndicatorShape } from '../../dnd/dragStore'
import { INDICATOR_THICKNESS } from '../../dnd/dragStore'
import type { StyleReader } from '../capabilities'
import { isFlowContainer, isParagraph, isWrappableObject, layoutChildren } from './componentLayout'

export type DropKind =
  | 'before'
  | 'after'
  | 'inside'
  | 'left'
  | 'right'
  | 'float-left'
  | 'float-right'

export type ComponentDrop = {
  kind: DropKind
  target: HTMLElement
}

export type DropPoint = {
  clientX: number
  clientY: number
}

const EDGE_BAND = 0.2
const SIDE_BAND = 0.25

const defaultReader: StyleReader = (element) => getComputedStyle(element)

function isRowOrGrid(element: Element, read: StyleReader): boolean {
  const parent = element.parentElement
  if (!parent) return false
  const style = read(parent)
  if (style.display === 'grid' || style.display === 'inline-grid') return true
  if (style.display !== 'flex' && style.display !== 'inline-flex') return false
  return !(style.flexDirection ?? '').startsWith('column')
}

function isRightToLeft(element: Element, read: StyleReader): boolean {
  return read(element).direction === 'rtl'
}

function distanceTo(rect: DOMRect, point: DropPoint): number {
  const dx = Math.max(rect.left - point.clientX, 0, point.clientX - rect.right)
  const dy = Math.max(rect.top - point.clientY, 0, point.clientY - rect.bottom)
  return Math.hypot(dx, dy)
}

/** The deepest editable element under the pointer that is not the dragged piece or inside it. */
export function candidateAt(
  point: DropPoint,
  root: HTMLElement,
  dragged: HTMLElement,
): HTMLElement | null {
  const stack = root.ownerDocument.elementsFromPoint(point.clientX, point.clientY)
  for (const entry of stack) {
    if (!(entry instanceof HTMLElement)) continue
    if (!root.contains(entry) || entry === root) continue
    if (entry === dragged || dragged.contains(entry)) continue
    if (!entry.hasAttribute('data-adt-id')) continue
    return entry
  }
  return null
}

function dropInsideContainer(
  container: HTMLElement,
  point: DropPoint,
  dragged: HTMLElement,
  read: StyleReader,
): ComponentDrop | null {
  const children = layoutChildren(container, read).filter(
    (child) => child !== dragged && !dragged.contains(child),
  )
  if (children.length === 0) return { kind: 'inside', target: container }

  let nearest = children[0]
  let best = Number.POSITIVE_INFINITY
  for (const child of children) {
    const distance = distanceTo(child.getBoundingClientRect(), point)
    if (distance >= best) continue
    best = distance
    nearest = child
  }

  const last = children[children.length - 1].getBoundingClientRect()
  if (point.clientY > last.bottom) return { kind: 'inside', target: container }

  const rect = nearest.getBoundingClientRect()
  const after = isRowOrGrid(nearest, read)
    ? isRightToLeft(nearest, read)
      ? point.clientX < rect.left + rect.width / 2
      : point.clientX >= rect.left + rect.width / 2
    : point.clientY >= rect.top + rect.height / 2
  return { kind: after ? 'after' : 'before', target: nearest }
}

/**
 * Where the pointer would drop the dragged component. The bands are read on the candidate
 * under the pointer: its top and bottom fifths order it, its sides make columns — or let the
 * text wrap around it when the candidate is a paragraph and the piece is a wrappable object.
 */
export function resolveComponentDrop(
  point: DropPoint,
  root: HTMLElement,
  dragged: HTMLElement,
  read: StyleReader = defaultReader,
): ComponentDrop | null {
  const candidate = candidateAt(point, root, dragged)
  if (!candidate) return null

  const rect = candidate.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return null

  if (isRowOrGrid(candidate, read)) {
    const after = isRightToLeft(candidate, read)
      ? point.clientX < rect.left + rect.width / 2
      : point.clientX >= rect.left + rect.width / 2
    return { kind: after ? 'after' : 'before', target: candidate }
  }

  const ratioY = (point.clientY - rect.top) / rect.height
  if (ratioY <= EDGE_BAND) return { kind: 'before', target: candidate }
  if (ratioY >= 1 - EDGE_BAND) return { kind: 'after', target: candidate }

  const ratioX = (point.clientX - rect.left) / rect.width
  if (ratioX <= SIDE_BAND || ratioX >= 1 - SIDE_BAND) {
    const side = ratioX <= SIDE_BAND ? 'left' : 'right'
    if (isParagraph(candidate) && isWrappableObject(dragged, read)) {
      return { kind: side === 'left' ? 'float-left' : 'float-right', target: candidate }
    }
    return { kind: side, target: candidate }
  }

  if (isFlowContainer(candidate, read)) {
    const inside = dropInsideContainer(candidate, point, dragged, read)
    if (inside) return inside
  }

  return { kind: ratioY < 0.5 ? 'before' : 'after', target: candidate }
}

function horizontalLine(rect: DOMRect, atBottom: boolean): IndicatorShape {
  return {
    kind: 'line',
    axis: 'horizontal',
    top: (atBottom ? rect.bottom : rect.top) - INDICATOR_THICKNESS / 2,
    left: rect.left,
    length: rect.width,
    indent: 0,
  }
}

function verticalLine(rect: DOMRect, atRight: boolean): IndicatorShape {
  return {
    kind: 'line',
    axis: 'vertical',
    top: rect.top,
    left: (atRight ? rect.right : rect.left) - INDICATOR_THICKNESS / 2,
    length: rect.height,
    indent: 0,
  }
}

export function dropIndicator(drop: ComponentDrop, read: StyleReader = defaultReader): IndicatorShape {
  const rect = drop.target.getBoundingClientRect()

  switch (drop.kind) {
    case 'inside':
      return { kind: 'box', top: rect.top, left: rect.left, width: rect.width, height: rect.height }
    case 'left':
    case 'float-left':
      return verticalLine(rect, false)
    case 'right':
    case 'float-right':
      return verticalLine(rect, true)
    default: {
      const atEnd = drop.kind === 'after'
      return isRowOrGrid(drop.target, read)
        ? verticalLine(rect, atEnd)
        : horizontalLine(rect, atEnd)
    }
  }
}

const LABELS: Record<DropKind, string> = {
  before: 'Move above',
  after: 'Move below',
  inside: 'Move inside',
  left: 'Side by side, on the left',
  right: 'Side by side, on the right',
  'float-left': 'Wrap the text, object on the left',
  'float-right': 'Wrap the text, object on the right',
}

export function dropLabel(drop: ComponentDrop): string {
  return LABELS[drop.kind]
}
