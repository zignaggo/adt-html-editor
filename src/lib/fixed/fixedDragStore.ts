import type { NodeId } from '../core/ids'
import type { NodeTemplate } from '../core/store'
import type { Box, Point, Size } from './geometry'
import type { Guide } from './guides/computeGuides'

export type FixedDragSession = {
  nodeId: NodeId | null
  template: NodeTemplate | null
  sourceElement: HTMLElement | null
  origin: Box
  grab: Point
  size: Size
  siblings: Box[]
  position: Point
  guides: Guide[]
}

type Listener = (session: FixedDragSession | null) => void

let current: FixedDragSession | null = null
const listeners = new Set<Listener>()

function notify() {
  for (const listener of listeners) listener(current)
}

export function fixedDragSession(): FixedDragSession | null {
  return current
}

export function subscribeFixedDrag(listener: Listener): () => void {
  listeners.add(listener)
  listener(current)
  return () => {
    listeners.delete(listener)
  }
}

export function beginFixedSession(session: FixedDragSession) {
  current = session
  notify()
}

export function updateFixedSession(position: Point, guides: Guide[]) {
  if (!current) return
  current = { ...current, position, guides }
  notify()
}

export function endFixedSession() {
  if (!current) return
  current = null
  notify()
}
